# How to secure anya

The setup of anya requires a SSL/TLS Certificate to allow incoming traffic.

## Option 1
### Cloudflare - SSL Full (Strict)
One can register for a _free_ SSL Cetificate. Cloudflare will restrict and route
all incoming requests to your server. Therefore you need to generate a
_Origin Certificate_. This certificate needs to be uploaded
* via kubectl
 * `kubectl create secret tls anya-tls --key path/to/private-key.key --cert path/to/origin-certificate.pem -n anya`
* via anya-values.yaml
  * section `certificate`

The _Origin Certificate_ is only valid when using the [Cloudflare SSL Full (Strict)](https://support.cloudflare.com/hc/en-us/articles/200170416) Service.
For using this service, you need to set Cloudflare's nameservers for your domain.

## Option 2
### cert-manager
You can install the cert-manager as a Kubernetes App, which will automatically watches the state of your certificate and will issue or renew a Let's Encrypt Certificate.
