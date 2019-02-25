## Default Pipeline

_anya_ utilizes the _GitHub_ Checks API, so that every commit could potentially trigger some kind of a pipeline, called Check Suite. Every stage of such a Check Suite is called Check Run. 
The following pipeline stages (Check Runs) does _anya_ provide:

1. Build
2. Test
3. Deploy

### Configure the pipeline

Although the pipeline is fixed, there are some options which can be defined in the pipeline configuration files. These files need to be present in you application's code repository and live in a folder named `anya`. See the [Installation Guide](../installation-guide.md): point 8, for a description on how to use this pipeline configuration.

__Deployment Options__

- `automaticDeployments`

  - If set to false, [every deployment needs to get approved by the push of a button](manual-deployment.md).
  - If set to true, the Continuous Deployment workflow is enabled. 

- `onSuccess.slackNotify`

  - If set to true, [Slack notifications](slack-notifications.md) are enabled for succeeded deployments.

- `onSuccess.previewUrlAsComment`

  - if set to true, a comment for the pull request is made, with the URL of the freshly [deployed preview instance](preview-deployment.md).

- `onFailure.slackNotify`

  - If set to true, [Slack notifications](slack-notifications.md) are enabled for failed deployments.

- `pullRequest.onClose.purgePreviewDeployments`

  - if set to true, all [preview deployment are deleted](preview-deployment.md) from the cluster.

  