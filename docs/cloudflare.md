# Using Cloudflare

You can use Cloudflare for your [TLS certificate](TLS_HTTPS.md) and the [access control](access_control.md) of anya.

## How to make it more secure
It is strongly recommended to protect your cluster against requests which could bypass the Cloudflare proxy. This can be done by simply using curl: `curl --silent --verbose https://anya.example.com --resolve anya.example.com:443:<your-ip-address> --insecure`

You can secure your setup with these options:

### IP Whitelisting
- Whitelisting [Cloudflares IPs](https://www.cloudflare.com/ips/) via Firewall
  - manually via the cloud providers console
  - as code via Terraform (ex.: [Google Compute Firewall](https://www.terraform.io/docs/providers/google/r/compute_firewall.html))

  Firewalls are configured to first deny all access for all ports on all IP ranges (0.0.0.0/0). Then there should be a rule with higher priority, which allows only the [Cloudflares IP ranges](https://www.cloudflare.com/ips/) on port 443 (tcp:443).

  _Watch out:_ check your firewall carefully with the curl command from above. It is very likely that there is already a firewall rule, which allows all tcp:80/443 traffic. Simply deactivate this one.

- Whitelisting [Cloudflares IPs](https://www.cloudflare.com/ips/) via nginx-ingress controller
  - for global configuration use the `nginx-values.yaml` file to configure the Whitelisting:
  ```
    controller:
      service:
        annotations:
          nginx.ingress.kubernetes.io/whitelist-source-range:
            103.21.244.0/22,
            103.22.200.0/22,
            103.31.4.0/22,
            104.16.0.0/12,
            [...]
  ```
  - for anya-specific configuration use the `anya-values.yaml` file to configure the Whitelisting:
  ```
    ingress:
      annotations:
        nginx.ingress.kubernetes.io/whitelist-source-range:
        103.21.244.0/22,
        103.22.200.0/22,
        103.31.4.0/22,
        104.16.0.0/12,
        [...]
  ```

### JWT Validation
Cloudflare offers the possibility to [validate a provided JWT token with a key](https://developers.cloudflare.com/access/setting-up-access/validate-jwt-tokens/).
Every request will send a JWT token and the receiving application needs to verify the validity of it. So it will be necessary to build a gateway for this. There is also a possibility to use [annotations of the nginx plus for this](https://github.com/nginxinc/kubernetes-ingress/tree/master/examples/jwt).

### Argo Tunnel
Cloudflare provides the possibility to [tunnel all requests to the cluster](https://developers.cloudflare.com/argo-tunnel/quickstart/). To make this work, you will need to install a specific cloudflare ingress controller.
