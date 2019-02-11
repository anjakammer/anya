const { events, Job, Group } = require('brigadier')

const checkRunImage = 'deis/brigade-github-check-run:latest'
const buildStage = '1-Build'
const testStage = '2-Test'
const deployStage = '3-Deploy'
const failure = 'failure'
const cancelled = 'cancelled'
const success = 'success'

let prodDeploy = false
let prNr = 0
let payload = ''
let webhook = ''
let secrets = ''

events.on('check_suite:requested', checkRequested)
events.on('check_suite:rerequested', checkRequested)
events.on('check_run:rerequested', checkRequested)
// events.on('pull_request', prClosed) // TODO action not definable

async function prClosed (e, p) { // TODO webhook does not have the token
  webhook = JSON.parse(e.payload)
  if (webhook.body.action === 'closed') {
    console.log('PullRequest closed')
    let config = await parseConfig()
    if (config.purgePreviewDeployments) {
      console.log('Dummy function - whooo purging') // TODO
      secrets = p.secrets
      prNr = webhook.body.number
      return new CommentPR(`Deleted all Previews for PullRequest: ${prNr}`).run()
    }
  }
}

async function checkRequested (e, p) {
  console.log('Check Suite requested')
  payload = e.payload
  webhook = JSON.parse(payload)
  secrets = p.secrets

  const pr = webhook.body.check_suite.pull_requests
  prodDeploy = webhook.body.check_suite.head_branch === secrets.PROD_BRANCH
  if (pr.length !== 0 || prodDeploy) {
    prNr = pr.length !== 0 ? webhook.body.check_suite.pull_requests[0].number : 0
    let config = await parseConfig()
    return runCheckSuite(config)
      .then(() => { return console.log('Finished Check Suite') })
      .catch((err) => { console.log(err) })
  } else if (webhook.body.action !== 'rerequested') {
    rerequestCheckSuite()
  }
}

async function runCheckSuite (config) {
  registerCheckSuite()
  const appName = webhook.body.repository.name
  const imageTag = (webhook.body.check_suite.head_sha).slice(0, 7)
  const imageName = `${secrets.DOCKER_REPO}/${appName}:${imageTag}`

  await runBuildStage(imageName)
  await runTestStage(imageName, config.testStageTasks)
  await runDeployStage(config, appName, imageName, imageTag)
}

async function runBuildStage (imageName) {
  return new Build(imageName).run()
    .then((result) =>
      new SendSignal({ stage: buildStage, logs: result.toString(), conclusion: success }).run())
    .catch((err) =>
      Group.runEach([
        new SendSignal({ stage: buildStage, logs: err.toString(), conclusion: failure }),
        new SendSignal({ stage: testStage, logs: '', conclusion: cancelled }),
        new SendSignal({ stage: deployStage, logs: '', conclusion: cancelled })
      ]))
}

async function runTestStage (imageName, testStageTasks) {
  return new Test(testStageTasks, imageName).run()
    .then((result) =>
      new SendSignal({ stage: testStage, logs: result.toString(), conclusion: success }).run())
    .catch((err) =>
      Group.runEach([
        new SendSignal({ stage: testStage, logs: err.toString(), conclusion: failure }),
        new SendSignal({ stage: deployStage, logs: '', conclusion: cancelled })
      ]))
}

async function runDeployStage (config, appName, imageName, imageTag) {
  const targetPort = 8080 // TODO fetch this from dockerfile
  const host = prodDeploy ? secrets.PROD_HOST : secrets.PREV_HOST
  const path = prodDeploy ? secrets.PROD_PATH : `/preview/${appName}/${imageTag}`
  const url = `${host}${path}`
  return new Deploy(appName, imageName, imageTag, targetPort, host, path, url).run()
    .then((result) => {
      new SendSignal({ stage: deployStage, logs: result.toString(), conclusion: success }).run()
      if (!prodDeploy && config.previewUrlAsComment) {
        new CommentPR(`Preview Environment is set up: <a href="https://${url}" target="_blank">${url}</a>`).run()
      }
      if (config.slackNotifyOnSuccess) {
        new SlackNotify(`Successful Deployment of ${appName}`, `<https://${url}>`).run()
      }
    })
    .catch((err) => {
      if (config.slackNotifyOnFailure) { new SlackNotify(`Failed Deployment of ${appName}`, imageName).run() }
      return new SendSignal({ stage: deployStage, logs: err.toString(), conclusion: failure }).run()
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
        slackNotifyOnSuccess: config.deploy.onSuccess.slackNotify || false,
        slackNotifyOnFailure: config.deploy.onFailure.slackNotify || false,
        previewUrlAsComment: config.deploy.onSuccess.previewUrlAsComment || false,
        purgePreviewDeployments: config.deploy.pullRequest.onClose.purgePreviewDeployments || false,
        testStageTasks: config.test.tasks || false
      }
    })
    .catch(err => { throw err })
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
    rerequest.run().catch(err => { console.log(err) })
  }, 30000) // wait 30 Sec.
}

function registerCheckSuite () {
  return Group.runEach([
    new RegisterCheck(buildStage),
    new RegisterCheck(testStage),
    new RegisterCheck(deployStage)
  ]).catch(err => { console.log(err) })
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

class Test extends Job {
  constructor (testStageTasks, imageName) {
    super(testStage.toLowerCase(), imageName)
    this.imageForcePull = true
    this.useSource = false
    this.tasks = testStageTasks
  }
}

class Deploy extends Job {
  constructor (appName, imageName, imageTag, targetPort, host, path, url) {
    const tlsName = prodDeploy ? secrets.PROD_TLS : secrets.PREV_TLS
    const deploymentName = prodDeploy ? `${appName}` : `${appName}-${imageTag}-preview`
    const namespace = prodDeploy ? 'production' : 'preview'
    super(deployStage.toLowerCase(), 'lachlanevenson/k8s-helm')
    this.useSource = false
    this.privileged = true
    this.serviceAccount = 'anya-deployer'
    this.tasks = [
      'helm init --client-only > /dev/null 2>&1',
      'helm repo add anya https://storage.googleapis.com/anya-deployment/charts > /dev/null 2>&1',
      `helm upgrade --install ${deploymentName} anya/deployment-template --namespace ${namespace} --set-string image.repository=${secrets.DOCKER_REGISTRY}/${secrets.DOCKER_REPO}/${appName},image.tag=${imageTag},ingress.path=${path},ingress.host=${host},ingress.tlsSecretName=${tlsName},service.targetPort=${targetPort},nameOverride=${appName},fullnameOverride=${deploymentName}`,
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
  constructor ({ stage, logs, conclusion }) {
    super(`result-of-${stage}`.toLowerCase(), checkRunImage)
    this.storage.enabled = false
    this.useSource = false
    this.env = {
      CHECK_PAYLOAD: payload,
      CHECK_NAME: stage,
      CHECK_TITLE: 'Description'
    }
    this.env.CHECK_CONCLUSION = conclusion
    this.env.CHECK_SUMMARY = `${stage} ${conclusion}`
    this.env.CHECK_TEXT = logs
  }
}

module.exports = { parseConfig, registerCheckSuite, runCheckSuite, rerequestCheckSuite, runBuildStage, runTestStage, runDeployStage }