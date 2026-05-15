#!/usr/bin/env bash
# setup-edge.sh — configura nginx-proxy + Let's Encrypt pra um app novo no ia-web.
#
# Uso (a partir da raiz do repo do projeto):
#   bash <skill>/scripts/setup-edge.sh <PROJECT> <ENV> <PUBLIC_PORT> <DOMAIN>
#
# Exemplos:
#   bash <skill>/scripts/setup-edge.sh coletivos development 2000 processa.info
#   bash <skill>/scripts/setup-edge.sh meuapp production    8080 meuapp.processa.info
#
# Pre-requisitos:
#   • `ssh iaweb true` funciona (rodar setup-local-ssh.sh antes se nao)
#   • Container do projeto ja deployado e na rede web_network
#     (containers <PROJECT>-<ENV>-caddy-1 acessivel)
#   • DNS publico do <DOMAIN> ja aponta pra 45.226.239.x (ia-web)
#
# Tecnica: container-as-root bypass — em vez de pedir senha de sudo a cada
# passo (suporte nao tem NOPASSWD), rodamos comandos dentro de containers
# Docker que montam os paths root-owned como volumes. Docker daemon roda como
# root, container roda como root, o write no host file e' como root.
# Suporte so precisa de acesso ao Docker daemon (ja tem via grupo `docker`).
#
# Idempotente: rerun apos falha cobre os passos pendentes.
#
# Apos rodar este script, AINDA falta o admin adicionar a regra Authelia em
# /projetos/proxy/authelia/config/configuration.yml (territorio admin-only).
# Sem a regra, /hub e /portal retornam 403; o ROOT e /landing ja funcionam.

set -e

PROJECT="${1:?Uso: $0 <PROJECT> <ENV> <PUBLIC_PORT> <DOMAIN>}"
ENV="${2:?Uso: $0 <PROJECT> <ENV> <PUBLIC_PORT> <DOMAIN>}"
PUBLIC_PORT="${3:?Uso: $0 <PROJECT> <ENV> <PUBLIC_PORT> <DOMAIN>}"
DOMAIN="${4:?Uso: $0 <PROJECT> <ENV> <PUBLIC_PORT> <DOMAIN>}"

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TPL_BOOT="$SKILL_DIR/templates/nginx-vhost-bootstrap.conf"
TPL_FULL="$SKILL_DIR/templates/nginx-vhost.conf"

[ -f "$TPL_BOOT" ] || { echo "ERRO: template nao achado: $TPL_BOOT"; exit 1; }
[ -f "$TPL_FULL" ] || { echo "ERRO: template nao achado: $TPL_FULL"; exit 1; }

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

echo "===== Edge setup pra $DOMAIN ====="
echo "  project=$PROJECT  env=$ENV  caddy=${PROJECT}-${ENV}-caddy-1:${PUBLIC_PORT}"
echo ""

# 1. Vhost bootstrap (HTTP-only) — viabiliza ACME challenge ANTES do cert existir
echo "-- 1. Vhost bootstrap (HTTP-only) --"
sed "s|<DOMAIN>|$DOMAIN|g" "$TPL_BOOT" > "$TMPDIR/vhost-boot.conf"
scp -q "$TMPDIR/vhost-boot.conf" "iaweb:/tmp/vhost-${DOMAIN}-boot.conf"
ssh iaweb "docker run --rm \
  -v /tmp/vhost-${DOMAIN}-boot.conf:/in:ro \
  -v /projetos/proxy/nginx/conf.d:/conf \
  alpine cp /in /conf/${DOMAIN}.conf"
ssh iaweb "docker exec nginx-proxy nginx -t" 2>&1 | tail -2
ssh iaweb "docker exec nginx-proxy nginx -s reload"
echo "   + bootstrap vhost ativo, ACME challenge handler disponivel"
echo ""

# 2. certbot via container — usa account default existente em /etc/letsencrypt
echo "-- 2. Emitir cert Let's Encrypt pra $DOMAIN --"
if ssh iaweb "docker run --rm -v /etc/letsencrypt:/le:ro alpine test -d /le/live/$DOMAIN" 2>/dev/null; then
    echo "   ↻ cert ja existe em /etc/letsencrypt/live/$DOMAIN/"
else
    ssh iaweb "docker run --rm \
      -v /projetos/proxy/www/certbot:/var/www/certbot \
      -v /etc/letsencrypt:/etc/letsencrypt \
      certbot/certbot certonly --webroot -w /var/www/certbot \
      -d $DOMAIN \
      --agree-tos --non-interactive \
      --register-unsafely-without-email" 2>&1 | tail -10
    echo "   + cert emitido"
fi
echo ""

# 3. Copiar cert pro path do nginx-proxy (rename privkey.pem -> private.key)
echo "-- 3. Copiar cert pro /projetos/proxy/nginx/certs/live/$DOMAIN/ --"
ssh iaweb "docker run --rm \
  -v /etc/letsencrypt:/le:ro \
  -v /projetos/proxy/nginx/certs:/certs \
  alpine sh -c '
    mkdir -p /certs/live/$DOMAIN && \
    cp -L /le/live/$DOMAIN/fullchain.pem /certs/live/$DOMAIN/ && \
    cp -L /le/live/$DOMAIN/privkey.pem /certs/live/$DOMAIN/private.key && \
    chmod 644 /certs/live/$DOMAIN/fullchain.pem && \
    chmod 600 /certs/live/$DOMAIN/private.key
  '"
echo "   + cert copiado e permissoes ajustadas"
echo ""

# 4. Trocar bootstrap vhost pelo final (HTTPS + Authelia)
echo "-- 4. Vhost final (HTTPS + Authelia) --"
sed -e "s|<DOMAIN>|$DOMAIN|g" \
    -e "s|<PROJECT>|$PROJECT|g" \
    -e "s|<ENV>|$ENV|g" \
    -e "s|<PUBLIC_PORT>|$PUBLIC_PORT|g" \
    "$TPL_FULL" > "$TMPDIR/vhost-full.conf"
scp -q "$TMPDIR/vhost-full.conf" "iaweb:/tmp/vhost-${DOMAIN}-full.conf"
ssh iaweb "docker run --rm \
  -v /tmp/vhost-${DOMAIN}-full.conf:/in:ro \
  -v /projetos/proxy/nginx/conf.d:/conf \
  alpine cp /in /conf/${DOMAIN}.conf"
ssh iaweb "docker exec nginx-proxy nginx -t" 2>&1 | tail -2
ssh iaweb "docker exec nginx-proxy nginx -s reload"
echo "   + vhost final ativo"
echo ""

echo "===== Edge setup concluido ====="
echo ""
echo "Smoke test:"
echo "  curl -sIL https://$DOMAIN/                # esperado: 302 -> /landing -> 200"
echo "  curl -sI  https://$DOMAIN/landing         # esperado: 200"
echo "  curl -sI  https://$DOMAIN/hub/            # esperado: 403 (sem rule Authelia ainda)"
echo ""
echo "FALTA (admin-only):"
echo "  • Adicionar regra Authelia em /projetos/proxy/authelia/config/configuration.yml:"
echo "      - domain: \"$DOMAIN\""
echo "        policy: one_factor"
echo "  • sudo docker restart authelia"
echo ""
echo "RENOVACAO SSL (a cada ~60 dias):"
echo "  certbot renova /etc/letsencrypt/ automaticamente MAS NAO copia pro"
echo "  /projetos/proxy/nginx/certs/. Rerun deste script (passos 1-3 sao no-ops"
echo "  se cert existe) OU criar hook em /etc/letsencrypt/renewal-hooks/deploy/."
