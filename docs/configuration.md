# Configuration Files
The directory `helmsman-config` contains value files for the anya installation. The setup.toml file is referencing these files with the `valuesFile` option, to configure the helm deployments with custom values.

Please copy the files from the `template` directory in here and remove the `template` keyword from the file name for matching the required name.

## Configure anya
- `anya-values.yaml`
  - _ingress.host_: This is a hostname which is used for the preview deployments.
  - _tls.hosts_: Same as _ingress.host_
  - _tls.secretName_: Get a TLS Certificate for your hostname and upload it into the cluster. See [this explanation on how to get TLS Encryption for your cluster](../docs/TLS_HTTPS.md). However, you could use this command:
    - `kubectl create secret tls anya-tls --key path/to/private-key.key --cert path/to/origin-certificate.pem -n anya`
  - _projects_: This is an array of projects, as they define your applications. You find an explanation for each value in the template as comments. In short: you specify your docker registry credentials for pushing and pulling your container images. Additionally, you define the production hostname and its TLS Certificate name. Note: the certificates need to be created in their respective namespace. So the certificate for the production environment needs to be present in the namespace 'production'.
    The ssh key is used for a private GitHub repository and to pull the code.

```yaml
- project: "GitHub-Account/my-app" # Name of the project, in the form "user/project"
    repository: "github.com/GitHub-Account/my-app" # Domain/Org/Project
    cloneURL: "https://github.com/GitHub-Account/my-app.git"
    sharedSecret: "superSecret" # Create this for the GitHub App
    github:
      token: "1234superSecret5678" # GitHub App > OAuth credentials > Client secret
    initGitSubmodules: "false"  # submodules should be checked out
    secrets:
      GH_APP_NAME: "my-anya-ci" # name of the GitHub App for anya
      DOCKER_REGISTRY: "docker.io" # docker.io
      DOCKER_REPO: my-organisation # organisation
      DOCKER_USER: my-username
      DOCKER_PASS: "superSecret"
      SLACK_CHANNEL: "CI/CD"
      SLACK_WEBHOOK: "https://hooks.slack.com/services/ABC/XYZ/ndfjhkfdjk"
      PREV_HOST: "anya.example.com"  # anya.example.com for preview deployments
      PREV_TLS: "anya-tls" # name of the TLS certificate for PREV_HOST
      PROD_HOST: example.com # root domain of the application in production
      PROD_PATH: "/"  # endpoint/path of your application in production
      PROD_TLS: "prod-tls"  # name of the TLS certificate for PROD_HOST
      PROD_BRANCH: master # branch name for production deployments
    sshKey: ""  # to pull from private repositories
```



- `brigade-github-app-values.yaml`
  - _github.appID_: Here you need to provide the id of the GitHub App, you created.
  - _github.checkSuiteOnPR_: This is a feature of the [Brigade-GitHub App gateway](https://github.com/Azure/brigade-github-app). Leave this to `false` unless you know what you do.
  - _github.key_: Generate a private key at your GitHub App settings page, and put it in here. It is used to authenticate with the GitHub API on your behalf.

## Secure your configurations
Naturally, your custom configurations are vulnerabilities and need to be stored securely.

Consider these 2 options:
- encrypt all files, so that they can be checked into version control safely
- do not commit these files to version control


For encryption is [SOPS](https://github.com/mozilla/sops) recommended, it can be used for all .yaml files.
