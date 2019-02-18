> This installation guide will change over time since **anya** will gradually abstract away all the setup for you.

# Installation Steps

## 1. Create a Kuberntes Cluster
- enable RBAC (disable legacy Authorization)
- anya uses a maximum of 2 Instances (each 1 CPU & 2GB RAM)

## 2. Give yourself Admin Permissions
- `kubectl create clusterrolebinding add-on-cluster-admin --clusterrole=cluster-admin --serviceaccount=kube-system:default`
- `kubectl create clusterrolebinding cluster-admin-binding --clusterrole=cluster-admin --user=[your-user-email-address]`

You are getting your user email address at the providers IAM user configurations page.
This is not trivial, the command is case sensitive.

## 3. Set your Cluster Context
Set your current cluster context to the cluster you just created. Save this context as an environment variable under `$KUBE_CONTEXT` so that the `helmsman-config/setup.toml` file can grab your cluster context from it.

## 4. Install the Package Manager
anya uses _Helmsman_ to deploy its components to your Kubernetes cluster. _Helmsman_ utilizes _Helm_ and _Helm-diff_.

- Helm
 - https://docs.helm.sh/using_helm/#installing-helm
- Helmsman
 - `curl -L https://github.com/Praqma/helmsman/releases/download/v1.6.2/helmsman_1.6.2_linux_amd64.tar.gz | tar zx`
 - `mv helmsman /usr/local/bin/helmsman # GOPATH `
- Helm-diff
  - `helm plugin install https://github.com/databus23/helm-diff --version master`

## 5. Create a GitHub App
For the communication with _GitHub_ and to access your code repositories, anya needs to get registered as an authorized application (GitHub App).
Please, follow the [instructions to create a GitHub App](https://developer.github.com/apps/building-github-apps/creating-a-github-app/).
- _Webhook Secret_ should be a secure passphrase, you need it later as the `SharedSecret`
- _Homepage URL_ is anything you like. It is recommended to point to this documentation.
- _Webhook URL_ is used by GitHub to notify anya about any repository events. Please consider a hostname such as `anya.yourBusiness.com`. The full webhook URL would look like this: `https://anya.yourBusiness.com/events/github`
- generate a private key, save it carefully you will need it later on.
- install the created Github App for your repositories (left sidebar)

### Permissions & events
Set the following permissions:
- _Checks_: Read&Write
- _Pull requests_: Read&Write

The anya GitHub App needs to subscribe to some events of your repositories:
- _Check suite_
- _Pull request_

## 6. Provide your Environment Configuration
Copy the templates-files of `helmsman-config/templates` into `helmsman-config`.
Remove the substring `.template` from the files.
The most important file is `anya-values.yaml`; here you are defining your repositories to deploy your applications (projects).
You find a detailed explanation on how to configure your projects here: [Configuration Files](configuration.md)

## 7. Apply the Configurations to your fresh Cluster
- Run `make helmsman-plan` to watch for error in your configuration
- Run `make helmsman-apply` to deploy anya to your cluster. You can run this command repeatedly.

## 8. Configure your Pipeline
Copy the folder `pipeline-config/anya` in all of your repositories that should use anya. There are 2 files:
- `test.yaml`: Specify the commands to run for the test stage. Note: all the required test scripts need to be present in your container.
- `deploy.yaml`: Turn on _Slack_ notifications, automatic deployments, or automatic deletion of old preview deployments.

All options are turned off, if not specified otherwise.
