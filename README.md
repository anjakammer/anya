> This installation guide will change over time since **anya** will gradually abstract away all the setup for you.

# Installation Steps

## 1. create K8s Cluster
- enable RBAC (disable legacy Authorization)
- min 2 Instances 1 CPU, 2GB RAM

## 2. Set yourself Admin permissions 
`kubectl create clusterrolebinding add-on-cluster-admin --clusterrole=cluster-admin --serviceaccount=kube-system:default`

## 3. Set your cluster context
- set your current cluster context to the cluster you just created

## 4. Install the package Manager
- Helm
 - https://docs.helm.sh/using_helm/#installing-helm
- Helmsman
 - `curl -L https://github.com/Praqma/helmsman/releases/download/v1.6.2/helmsman_1.6.2_linux_amd64.tar.gz | tar zx`
 - `mv helmsman /usr/local/bin/helmsman # GOPATH `
- Helm-diff
  - `helm plugin install https://github.com/databus23/helm-diff --version master`

## 5. Create a GitHub App
- https://github.com/Azure/brigade-github-app#1-create-a-github-app
- leave Webhook secret (SharedSecret) empty for now
- The webhook url consists of your domain or an IP adress - which will be created later
- generate a private key, save it carefully and securely
- install the Github App for your repository (at GitHub)

## 6. Provide your configuration
- `brigade-github-app-values.yaml`
  - rbac.enabled: true
  - hosts: [your-domain]
  - hosts.tls.hosts: [your-domain]
  - github.key: [the generated github-app private key]
  - kubernetes.io/ingress.global-static-ip-name: [your-static-IP-Identifier]
- `brigade-values.yaml`
  - rbac.enabled: true
- `setup.toml`
  - settings.kubeContext: [your cluster context] 
    - `kubectl config current-context`

## 7. Apply the configurations to your fresh cluster
- `helmsman -f setup.toml --apply`

## 8. Create a Project, for your repository
- `brig project create --namespace anya`
- _Auto-generated a Shared Secret_
  - use this one as the webhook secret of your GitHub app
- _Configure GitHub Access? Yes_
  - provide here your OAuth credentials (Client secret) from the GitHub App

## 9. Configure your Pipeline
- create a `brigade.js` file inside your repository
- see this [Brigade Example](https://github.com/Azure/brigade-github-app#running-a-new-set-of-checks)
