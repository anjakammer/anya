# anya
[![Maintenance](https://img.shields.io/badge/Maintained%3F-no-red.svg)](https://GitHub.com/Naereen/StrapDown.js/graphs/commit-activity)

An open-source CI/CD system for containerized applications that deploys to your _Kubernetes_ cluster.


### Features
- [Fixed build pipeline: Build, Test, Deploy](https://anjakammer.github.io/anya/features/pipeline)
- [Creates preview deployments for the last pushed commit of a pull request](https://anjakammer.github.io/anya/features/preview-deployment)
- [Deletes a preview deployment with the push of a button](https://anjakammer.github.io/anya/features/delete-deployment.html#1-manual-deployment-deletion)
- [Deletes all preview deployments of a closed pull request](https://anjakammer.github.io/anya/features/delete-deployment.html#2-purge-preview-deployments-option) (optional)
- [Deploys to production for Build pipeline of the mainline](https://anjakammer.github.io/anya/features/production-deployment)
- [Manual deployment trigger](https://anjakammer.github.io/anya/features/manual-deployment) (optional)
- [Sends _Slack_ notifications for failed and successful deployments](https://anjakammer.github.io/anya/features/slack-notifications) (optional)

Read the docs here: [anjakammer.github.io/anya](https://anjakammer.github.io/anya/)

### For Developers
anya is an abstraction of [Brigade](https://github.com/Azure/brigade); it configures Brigade and provides a default build pipeline (DefaultScript). You find the DefaultScript in the chart: `charts/anya/files/brigade.js`
The DefaultScript is created as a configmap. The configmap name is used in the template for creating Brigade projects (`charts/anya/templates/brigade-projects.yaml`), so that every project uses this DefaultScript.

#### Deployment
anya uses [Helmsman](https://github.com/Praqma/helmsman) for the deployment. It is planned to utilize _Terraform_ instead.

#### Makefile
The Makefile of this repository has the following functions:
- `make lint` calls the linter of helm, to check your the charts in here: `charts/*`
- `make package` packages all charts and pushes them to the anya chart repository.
- `make helmsman-plan` Dry-Run for the deployment with verbose output
- `make helmsman-apply` Will apply the deployment
- `make purge-worker` If you cannot wait for _vacuum_ to free your cluster from all Brigade jobs and builds - use this.
- `make purge-previews` This will delete all preview deployments, made by anya.
- `make update-pipeline` For pipeline development without packaging. This function will update the DefaultScript in your cluster. Do not forget to package the chart to publish your changes permanently.
- `make watch-jobs` Observe all jobs that are currently running. Failed ones are displayed permanently, so you can spot them easily.
