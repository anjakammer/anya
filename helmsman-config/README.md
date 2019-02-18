# Anya Configuration Files
## Content of this directory
This directory contains value files for the anya installation. The setup.toml file is referencing these files with the `valuesFile` option, to configure the helm deployments with custom values.

Please copy the files from the `template` directory in here and remove the `template` keyword from the file name for matching the required name.

## Configure anya
- `anya-values.yaml`
  - _ingress.host_: This is a host name which is used for the preview deployments.
  - _tls.hosts_: Same as _ingress.host_
  - _tls.secretName_: Get a TLS Certificate for your host name and upload it into the cluster. See [this explanation on how to get TLS Encryption for your cluster](../docs/TLS_HTTPS.md). However, you could use this command:
    - `kubectl create secret tls anya-tls --key path/to/private-key.key --cert path/to/origin-certificate.pem -n anya`
  - _projects_: This is an array of projects, as they define your application. You find an explanation for each value in the template. In short: you specify your docker registry credentials for pushing and pulling your container images. Additionally, you define the production host name and its TLS Certificate name. Note: the certificates need to be created in their respective namespace. So the certificate for the production environment needs to be present in the namespace 'production'.
  The ssh key is for your GitHub repository and is used to pull your code.


## Secure your configurations
Naturally, your custom configurations are vulnerabilities and need to be stored securely.

Consider these 2 options:
- encrypt all files, so that they can be checked into version control safely
- do not commit these files to version control


For encryption is [SOPS](https://github.com/mozilla/sops) recommended, it can be used for all .yaml files.
