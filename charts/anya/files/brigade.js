const { events, Job, Group } = require('brigadier')

const checkRunImage = 'anjakammer/brigade-github-check-run:abe7e88'
const kubectlHelmImage = 'dtzar/helm-kubectl'
const buildStage = '1-Build'
const testStage = '2-Test'
const deployStage = '3-Deploy'
const failure = 'failure'
const cancelled = 'cancelled'
const success = 'success'
const neutral = 'neutral'
const performDeploymentAction = [ { label: 'Perform Deployment', identifier: 'perform_deployment', description: 'triggers the deployment' } ]

let prodDeploy = false
let prNr = 0
let payload = ''
let webhook = ''
let secrets = ''
let projectID = ''

events.on('check_suite:requested', checkRequested)
events.on('check_suite:rerequested', checkRequested)
events.on('check_run:requested_action', checkRunAction)
events.on('pull_request', prClosed)

async function checkRequested (e, p) {
  console.log('Check Suite requested')
  payload = e.payload
  webhook = JSON.parse(payload)
  secrets = p.secrets
  projectID = p.id

  const pr = webhook.body.check_suite.pull_requests
  prodDeploy = webhook.body.check_suite.head_branch === secrets.PROD_BRANCH
  if (pr.length !== 0 || prodDeploy) {
    prNr = pr.length !== 0 ? pr[0].number : 0
    const config = await parseConfig()
    return runCheckSuite(config)
      .then(() => { return console.log('Finished Check Suite') })
      .catch((err) => { console.log(err.toString()) })
  } else if (webhook.body.action !== 'rerequested') {
    rerequestCheckSuite()
  }
}

async function runCheckSuite (config) {
  registerCheckSuite()
  const appName = webhook.body.repository.name
  const imageTag = (webhook.body.check_suite.head_sha).slice(0, 7)
  const imageName = `${secrets.DOCKER_REPO}/${appName}:${imageTag}`

  runBuildStage(imageName)
    .then(() => runTestStage(imageName, config.testStageTasks))
    .then(() => {
      if (config.automaticDeployment) {
        return runDeployStage(config, appName, imageName, imageTag)
      }
      manualDeployment()
    }).catch((err) => { console.log(err.toString()) })
}

async function runBuildStage (imageName) {
  const startedAt = new Date().toISOString()
  return new Build(imageName).run()
    .then((result) =>
      new SendSignal({ stage: buildStage, logs: result.toString(), conclusion: success, startedAt }).run())
    .catch((err) => {
      Group.runEach([
        new SendSignal({ stage: buildStage, logs: err.toString(), conclusion: failure, startedAt }),
        new SendSignal({ stage: testStage, logs: '', conclusion: cancelled, startedAt }),
        new SendSignal({ stage: deployStage, logs: '', conclusion: cancelled, startedAt })
      ])
      throw err // to skip the next pipeline stages
    })
}

async function runTestStage (imageName, testStageTasks) {
  const startedAt = new Date().toISOString()
  new IntegrationTest().run() // runs a GitHub action, no signals needed
  return new Test(testStageTasks, imageName).run()
    .then((result) =>
      new SendSignal({ stage: testStage, logs: result.toString(), conclusion: success, startedAt }).run())
    .catch((err) => {
      Group.runEach([
        new SendSignal({ stage: testStage, logs: err.toString(), conclusion: failure, startedAt }),
        new SendSignal({ stage: deployStage, logs: '', conclusion: cancelled, startedAt })
      ])
      throw err // to skip the next pipeline stages
    })
}

async function runDeployStage (config, appName, imageName, imageTag) {
  const targetPort = await getApplicationPort()
  if (typeof targetPort === 'undefined' || targetPort === '') {
    return console.log('No port definition found in Dockerfile. Check if you Dockerfile is present in the root directory.')
  }
  const host = prodDeploy ? secrets.PROD_HOST : secrets.PREV_HOST
  const path = prodDeploy ? secrets.PROD_PATH : `/preview/${appName}/${imageTag}`
  const url = `${host}${path}`
  const startedAt = new Date().toISOString()

  return new Deploy(appName, imageName, imageTag, targetPort, host, path, url).run()
    .then((result) => {
      const actions = prodDeploy ? [] : [ { label: 'Delete Deployment', identifier: 'delete_deployment', description: 'delete the deployment for this commit' } ]
      new SendSignal({ stage: deployStage, logs: result.toString(), conclusion: success, actions, startedAt }).run()
      if (!prodDeploy && config.previewUrlAsComment) {
        new CommentPR(`Preview Environment is set up: <a href="https://${url}" target="_blank">${url}</a>`).run()
          .catch((err) => { console.log(err.toString()) })
      }
      if (config.slackNotifyOnSuccess) {
        return new SlackNotify(`Successful Deployment of ${appName}`, `<https://${url}>`).run()
          .catch((err) => { console.log(err.toString()) })
      }
    })
    .catch((err) => {
      if (config.slackNotifyOnFailure) {
        new SlackNotify(`Failed Deployment of ${appName}`, imageName).run()
          .catch((err) => { console.log(err.toString()) })
      }
      return new SendSignal({ stage: deployStage, logs: err.toString(), conclusion: failure, startedAt }).run()
        .catch((err) => { console.log(err.toString()) })
    })
}

async function parseConfig () {
  const parse = new Job('0-parse-yaml', 'anjakammer/yaml-parser:latest')
  parse.env.DIR = '/src/anya'
  parse.env.EXT = '.yaml'
  return parse.run()
    .then((result) => {
      let config = result.toString()
      config = JSON.parse(config.substring(config.indexOf('{') - 1, config.lastIndexOf('}') + 1))
      return {
        automaticDeployment: config.deploy.automaticDeployment || false,
        slackNotifyOnSuccess: config.deploy.onSuccess.slackNotify || false,
        slackNotifyOnFailure: config.deploy.onFailure.slackNotify || false,
        previewUrlAsComment: config.deploy.onSuccess.previewUrlAsComment || false,
        purgePreviewDeployments: config.deploy.pullRequest.onClose.purgePreviewDeployments || false,
        testStageTasks: config.test.tasks || false
      }
    })
    .catch(err => { throw err }) // to skip the next pipeline stages
}

async function getApplicationPort () {
  const dockerfileParser = new Job('parse-dockerfile', 'anjakammer/dockerfile-parser:latest')
  dockerfileParser.env.DOCKERFILE_PATH = '/src/Dockerfile'
  dockerfileParser.env.KEY = 'EXPOSE'
  dockerfileParser.imageForcePull = true
  return dockerfileParser.run()
    .then((result) => {
      let dockerfile = result.toString()
      dockerfile = JSON.parse(dockerfile.substring(dockerfile.indexOf('{') - 1, dockerfile.lastIndexOf('}') + 1))
      return dockerfile.port
    })
    .catch(err => { console.log(err); return '' })
}

function rerequestCheckSuite () {
  console.log('No PR-id found. Will re-request the check_suite.')
  const rerequest = new Job('rerequest-check-suite', 'anjakammer/post2_github-checks:latest')
  rerequest.storage.enabled = false
  rerequest.useSource = false
  rerequest.env = {
    URL: `${webhook.body.check_suite.url}/rerequest`,
    APP_NAME: secrets.GH_APP_NAME,
    TOKEN: webhook.token
  }
  setTimeout(() => {
    rerequest.run().catch(err => { console.log(err.toString()) })
  }, 30000) // wait 30 Sec. for PR to open
}

function registerCheckSuite () {
  return Group.runEach([
    new RegisterCheck(buildStage),
    new RegisterCheck(testStage),
    new RegisterCheck(deployStage)
  ]).catch(err => { console.log(err.toString()) })
}

async function checkRunAction (e, p) {
  payload = e.payload
  webhook = JSON.parse(payload)
  secrets = p.secrets
  const actionID = webhook.body.requested_action.identifier
  console.log(`Check Run action: ${actionID} requested`)
  switch (actionID) {
    case 'delete_deployment':
      new RegisterCheck(deployStage).run().catch(err => { console.log(err.toString()) })
      deleteDeployment()
      break
    case 'perform_deployment':
      new RegisterCheck(deployStage).run().catch(err => { console.log(err.toString()) })
      prodDeploy = webhook.body.check_run.check_suite.head_branch === secrets.PROD_BRANCH
      const pr = webhook.body.check_run.check_suite.pull_requests
      if (pr.length !== 0 || prodDeploy) { prNr = pr.length !== 0 ? pr[0].number : 0 }
      const config = await parseConfig()
      const appName = webhook.body.repository.name
      const imageTag = (webhook.body.check_run.head_sha).slice(0, 7)
      const imageName = `${secrets.DOCKER_REPO}/${appName}:${imageTag}`
      runDeployStage(config, appName, imageName, imageTag)
      break
    default:
      console.log(`No process defined for action: ${actionID}. Skipped`)
  }
}

async function prClosed (e, p) {
  webhook = JSON.parse(e.payload)
  if (webhook.action === 'closed') {
    console.log('PullRequest closed')
    const config = await parseConfig()
    if (config.purgePreviewDeployments) {
      console.log('purging all previews for this PR')
      secrets = p.secrets
      prNr = webhook.number
      const previewLabel = `${webhook.repository.name}-${webhook.number}`
      new PurgePreviews(previewLabel).run()
        .then((result) => { return console.log(result.toString()) })
        .catch((err) => { console.log(err.toString()) })
    }
  }
}

function deleteDeployment () {
  const appName = webhook.body.repository.name
  const commit = (webhook.body.check_run.head_sha).slice(0, 7)
  const deploymentName = prodDeploy ? `${appName}` : `${appName}-${commit}-preview`
  const startedAt = new Date().toISOString()

  new DeleteDeployment(deploymentName).run()
    .then((result) => {
      new SendSignal({ stage: deployStage, logs: result.toString(), conclusion: neutral, actions: performDeploymentAction, startedAt }).run()
        .catch((err) => { console.log(err.toString()) })
      prNr = webhook.body.check_run.pull_requests[0].number
      if (prNr !== 0) {
        new CommentPR(`:x: Preview Environment deleted for commit : ${commit}`).run()
          .catch((err) => { console.log(err.toString()) })
      }
    })
    .catch((err) => {
      new SendSignal({ stage: deployStage, logs: err.toString(), conclusion: failure, startedAt }).run()
        .catch((err) => { console.log(err.toString()) })
    })
}

function manualDeployment () {
  const deploymentMessage = 'Please press the button "Perform Deployment".'
  return new SendSignal({ stage: deployStage, logs: deploymentMessage, conclusion: neutral, actions: performDeploymentAction }).run()
    .catch((err) => { console.log(err.toString()) })
}

class RegisterCheck extends Job {
  constructor (check) {
    super(`register-${check}`.toLowerCase(), checkRunImage)
    this.storage.enabled = false
    this.useSource = false
    this.env = {
      CHECK_PAYLOAD: payload,
      CHECK_NAME: check,
      CHECK_TITLE: 'Description',
      CHECK_SUMMARY: `${check} scheduled`
    }
  }
}

class Build extends Job {
  constructor (imageName) {
    super(buildStage.toLowerCase(), 'docker:stable-dind')
    this.privileged = true
    this.env.DOCKER_DRIVER = 'overlay'
    this.tasks = [
      'dockerd-entrypoint.sh > /dev/null 2>&1 &',
      'sleep 20',
      'cd /src',
      `echo ${secrets.DOCKER_PASS} | docker login -u ${secrets.DOCKER_USER} --password-stdin ${secrets.DOCKER_REGISTRY} > /dev/null 2>&1`,
      `docker build -t ${imageName} .`,
      `docker push ${imageName}`
    ]
  }
}

class IntegrationTest extends Job {
  constructor () {
    const repo = webhook.body.repository.full_name
    super('integration-test', 'anjakammer/gh_repo_dispatch')
    this.imageForcePull = true
    this.storage.enabled = false
    this.useSource = false
    this.env = {
      APP_NAME: secrets.GH_APP_NAME,
      REPO: repo,
      EVENT_TYPE: 'integration_test',
      TOKEN: webhook.token
    }
  }
}

class Test extends Job {
  constructor (testStageTasks, imageName) {
    super(testStage.toLowerCase(), imageName)
    this.imageForcePull = true
    this.useSource = false
    this.imagePullSecrets = [projectID.replace('brigade-', 'regcred-')]
    this.tasks = testStageTasks
  }
}

class Deploy extends Job {
  constructor (appName, imageName, imageTag, targetPort, host, path, url) {
    const tlsName = prodDeploy ? secrets.PROD_TLS : secrets.PREV_TLS
    const deploymentName = prodDeploy ? `${appName}` : `${appName}-${imageTag}-preview`
    const namespace = prodDeploy ? 'production' : 'preview'
    const previewLabel = prodDeploy || prNr === 0 ? '' : `,previewLabel=${appName}-${prNr}`
    const imagePullSecret = projectID.replace('brigade-', 'regcred-')
    super(deployStage.toLowerCase(), kubectlHelmImage)
    this.useSource = false
    this.privileged = true
    this.serviceAccount = 'anya-deployer'
    this.tasks = [
      'helm init --client-only > /dev/null 2>&1',
      'helm repo add anya https://storage.googleapis.com/anya-deployment/charts > /dev/null 2>&1',
      `helm upgrade --install ${deploymentName} anya/deployment-template --namespace ${namespace} --set-string image.repository=${secrets.DOCKER_REGISTRY}/${secrets.DOCKER_REPO}/${appName},image.tag=${imageTag},ingress.path=${path},ingress.host=${host},ingress.tlsSecretName=${tlsName},service.targetPort=${targetPort},nameOverride=${appName},fullnameOverride=${deploymentName},image.pullSecret=${imagePullSecret}${previewLabel}`,
      `echo "URL: <a href="https://${url}" target="_blank">${url}</a>"`
    ]
  }
}

class CommentPR extends Job {
  constructor (message) {
    const repo = webhook.body.repository.full_name
    super('pr-comment', 'anjakammer/brigade-pr-comment')
    this.storage.enabled = false
    this.useSource = false
    this.env = {
      APP_NAME: secrets.GH_APP_NAME,
      WAIT_MS: '0',
      COMMENT: message,
      COMMENTS_URL: `https://api.github.com/repos/${repo}/issues/${prNr}/comments`,
      TOKEN: webhook.token
    }
  }
}

class SlackNotify extends Job {
  constructor (title, message) {
    super('slack-notify', 'technosophos/slack-notify:latest', ['/slack-notify'])
    this.storage.enabled = false
    this.useSource = false
    this.env = {
      SLACK_WEBHOOK: secrets.SLACK_WEBHOOK,
      SLACK_CHANNEL: secrets.SLACK_CHANNEL,
      SLACK_USERNAME: 'anya',
      SLACK_TITLE: title,
      SLACK_MESSAGE: message,
      SLACK_COLOR: '#23B5AF',
      SLACK_ICON: 'https://storage.googleapis.com/anya-deployment/anya-logo.png'
    }
  }
}

class SendSignal extends Job {
  constructor ({ stage, logs, conclusion, actions, startedAt }) {
    super(`result-of-${stage}`.toLowerCase(), checkRunImage)
    this.storage.enabled = false
    this.useSource = false
    this.env = {
      CHECK_PAYLOAD: payload,
      CHECK_NAME: stage,
      CHECK_TITLE: 'Description',
      CHECK_CONCLUSION: conclusion,
      CHECK_SUMMARY: `${stage} ${conclusion}`,
      CHECK_TEXT: logs
    }
    if (typeof startedAt !== 'undefined' && startedAt.length > 0) {
      this.env.CHECK_STARTED_AT = startedAt
    }
    if (typeof actions !== 'undefined' && actions.length > 0) {
      this.env.CHECK_ACTIONS = JSON.stringify(actions)
    }
  }
}

class PurgePreviews extends Job {
  constructor (previewLabel) {
    super('purge-previews', kubectlHelmImage)
    this.useSource = false
    this.privileged = true
    this.serviceAccount = 'anya-deployer'
    this.tasks = [
      'helm init --client-only > /dev/null 2>&1',
      `DEPLOYMENTS=$(kubectl get deployment -n preview -o=jsonpath='{range .items[*]}{.metadata.name}{" "}{end}' -l anya.run/pr-preview=${previewLabel})`,
      `if [ ! -z "$DEPLOYMENTS" ]; then helm del $DEPLOYMENTS --purge; fi`
    ]
  }
}

class DeleteDeployment extends Job {
  constructor (deploymentName) {
    super('delete-deployment', kubectlHelmImage)
    this.useSource = false
    this.privileged = true
    this.serviceAccount = 'anya-deployer'
    this.tasks = [
      'helm init --client-only > /dev/null 2>&1',
      `helm del ${deploymentName} --purge`
    ]
  }
}
