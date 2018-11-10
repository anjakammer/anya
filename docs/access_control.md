# How to access anya

Anya has no access control by default, do not expose anya without it. This is so, to make you free to choose an appropriate authentication method by yourself.

## Minimum access control to implement
### Main entry point
* __Entrypoint:__ [your-domain] (anya.example.com)
* __Backend:__ Kashti-Dashboard
* __Recommendation:__ GitHub oAuth2 Login with the restriction to organisation members or e-mail addresses. 

_Note:_ Do not just turn on a bare GitHub oAuth2 Login without restrictions. Anybody with a GitHub account could access your Cluster.

### GitHub App
* __Entrypoint:__ [your-domain]/events/github (anya.example.com/events/github)
* __Backend:__ Brigade-GitHub-App (receives GitHub Webhooks)
* __Recommendation:__ Bypass the access control, through whitelisting [GitHub's Webhook IPs](https://api.github.com/meta)


## Access control provider
### Cloudflare access
There is a [free access control](https://www.cloudflare.com/products/cloudflare-access/), up to 5 Users which are authenticating against your domain.
You can restrict user access by specific email, domain and other rules. It is recommended to use the specific email restriction in conjunction with the GitHub OAuth2 Login. This way, you can review all registered users via GitHub. Your users should be registered at GitHub anyway.


### oAuth2-Proxy
The [oAuth2-Proxy of bitly](https://github.com/bitly/oauth2_proxy) is a self-hostet Kubernetes App, which secures the access to the app. You can specify email and domain rules, as well as turning on the oAuth2 Login via GitHub
