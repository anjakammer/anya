# Anya Configuration Files
## Content of this directory
This directory contains all value files, which are getting passed for the anya installation. The setup.toml file is referencing these files with the `valuesFile` option, to configure the helm deployments with custom values.

Please copy the files from the `template` directory here and remove the `template` keyword from the file name for matching the required name.

## Secure your configurations
Naturally, your custom configurations are vulnerabilities and need to be stored securely.

Consider these 2 options:
- encrypt all files, so that they can be checked into version control safely
- do not commit these files to version control


For encryption is [SOPS](https://github.com/mozilla/sops) recommended, it can be used for all .yaml files.
