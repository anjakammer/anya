## anya

An open-source CI/CD system for containerized applications that deploys to your _Kubernetes_ cluster.

### Features
- Fixed Build pipeline: Build, Test, Deploy
- Creates preview deployments for the last pushed commit of a pull request
- Deletes a preview deployment with the push of a button
- Deletes all preview deployments of a closed pull request (optional)
- Deploys to production for mainline merges
- Continuous Deployment workflow (optional)
- Manual deployment trigger (optional)
- Sends _Slack_ Notifications for failed and successful deployments (optional)

Read the docs here: [anjakammer.github.io/anya](https://anjakammer.github.io/anya/)

### For Developers
anya is an abstraction of [Brigade](https://github.com/Azure/brigade); it configures Brigade and provides a default build pipeline (DefaultScript). You find the DefaultScript in the chart: `charts/anya/files/brigade.js`
The DefaultScript is created as a configmap. The configmap name is used in the template for creating Brigade projects (`charts/anya/templates/brigade-projects.yaml`), so that every project uses this DefaultScript.

#### Deployment
anya uses [Helmsman](https://github.com/Praqma/helmsman) for the deployment. It is planned to utilize _Terraform_ instead.

#### Makefile
The Makefile of this repository has the following functions:
- `make lint` calls the linter of helm, to check your all charts in here: `charts/*`
- `make package` packages all charts and pushes it to the anya chart repository.
- `make helmsman-plan` Dry-Run for the deployment with verbose output
- `make helmsman-apply` Will apply the deployment with
- `make purge-worker` If you cannot wait for _vacuum_ to free your cluster from all Brigade jobs and builds - use this.
- `make purge-previews` This will delete all preview deployments, made by anya.
- `make update-pipeline` For pipeline development without packaging. This function will update the DefaultScript in your cluster. Do not forget to package the chart to publish your changes permanently.
- `make watch-jobs` Observe all jobs that are currently running. Failed ones are displayed permanently, so you can spot them easily.
