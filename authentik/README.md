# Authentik

Secrets generated with:
```bash
umask 077
touch .env

grep -q '^PG_PASS=' .env || \
  printf 'PG_PASS=%s\n' "$(openssl rand -hex 32)" >> .env

grep -q '^AUTHENTIK_SECRET_KEY=' .env || \
  printf 'AUTHENTIK_SECRET_KEY=%s\n' "$(openssl rand -hex 48)" >> .env

chmod 600 .env

```

Due to `caddy` CA certificate not being recognized, the `.crt` has to be copied into the containers:
```bash
sudo cp ./caddy/data/caddy/pki/authorities/local/root.crt ./actual/data/caddy-root.crt
```
