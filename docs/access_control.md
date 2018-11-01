# How to access anya

Anya has no access control by default, do not expose anya without it. This is so, to make you free to choose an appropriate authentication method by yourself.

## Option 1
### Cloudflare access
There is a [free access control](https://www.cloudflare.com/products/cloudflare-access/), up to 5 Users which are authenticating against your domain.
You can restrict user access by specific email, domain and other rules. It is recommended to use the specific email restriction in conjunction with the GitHub OAuth2 Login. This way, you can review all registered users via GitHub. Your users should be registered at GitHub anyway.


## Option 2
### oAuth2-Proxy
The [oAuth2-Proxy of bitly](https://github.com/bitly/oauth2_proxy) is a self-hostet Kubernetes App, which secures the access to the app. You can specify email and domain rules, as well as turning on the oAuth2 Login via GitHub
