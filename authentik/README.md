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
