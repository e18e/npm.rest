## Generating Certificates

https://go-acme.github.io/lego/dns/cloudflare/

```bash
CLOUDFLARE_DNS_API_TOKEN="..." lego \
    --dns cloudflare \
    --domains ... \
    --accept-tos \
    --path certs
```
