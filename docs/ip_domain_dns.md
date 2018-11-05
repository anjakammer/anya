## How to use a Domain with anya
Anya needs to be available to the outside world for receiving webhooks from GitHub.
These webhooks trigger the pipeline. However you can use a static IP, if you wish.

In order to use a domain (or subdomain) for anya, you need to get a static IP address and  
point your domain to it. It follows a more detailed guide for that.

### Get a static IP
To get an IP you typically create a LoadBalancer. The anya setup uses a
nginx-ingress controller for that. But you can also use your providers
LoadBalancer Service (ex. [Google CLoud LoadBalancer](https://cloud.google.com/load-balancing/)).

Most IPs you will get, are ephemeral. To reliably use those IPs, you need to turn them into static IPs.
This depends on your Cloud Provider. Watch out for the IP address, which is used by the ingress-controller
and promote it to a static IP, if it is ephemeral.

### Point your domain to the IP
Your domain or CDN Provider will let you change the A-records for your domain. You could use the Top-level-Domain for that, or a subdomain:
* example.com -> 123.456.789.0
* anya.example.com -> 123.456.789.0

It is recommended to use a subdomain for the anya services. This way you have
a clear entrypoint for all anya services.
