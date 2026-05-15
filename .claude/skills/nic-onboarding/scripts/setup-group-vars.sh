#!/usr/bin/env bash
# setup-group-vars.sh — popula CI/CD vars compartilhadas no GitLab group.
#
# RODE UMA VEZ NA VIDA do grupo. Apos isso, todos projetos do grupo
# herdam as vars; ninguem mais precisa setar nada por projeto.
#
# Uso (interativo):
#   bash <skill>/scripts/setup-group-vars.sh
#
# Pre-req: PAT pessoal com role Maintainer+ no group, em .env do projeto OU
#          variavel de ambiente GITLAB_ACCESS_TOKEN. Mesma coisa pra GITLAB_URL.

set +e

# 1. Sourcear .env do projeto se existir
[ -f .env ] && { set -a; . ./.env; set +a; }

[ -z "$GITLAB_ACCESS_TOKEN" ] && { echo "ERRO: GITLAB_ACCESS_TOKEN vazia — preencha .env do projeto"; exit 1; }
[ -z "$GITLAB_URL" ] && { echo "ERRO: GITLAB_URL vazia — preencha .env do projeto"; exit 1; }

# 2. Pergunta o group (NIC = 470 por default)
read -rp "GitLab Group ID [470]: " GROUP_ID
GROUP_ID="${GROUP_ID:-470}"

# Confirma o group existe e usuario tem Maintainer+
GROUP_INFO=$(curl -s -m 10 -H "PRIVATE-TOKEN: $GITLAB_ACCESS_TOKEN" "$GITLAB_URL/api/v4/groups/$GROUP_ID")
GROUP_NAME=$(echo "$GROUP_INFO" | python -c "import sys,json; print(json.load(sys.stdin).get('full_path','?'))" 2>/dev/null)
[ "$GROUP_NAME" = "?" ] && { echo "ERRO: nao consigo ler grupo $GROUP_ID — token invalido ou sem permissao"; exit 1; }
echo "Group: $GROUP_NAME (id $GROUP_ID)"
echo ""

# 3. Pergunta os valores do registry
echo "===== Docker Registry de deploy ====="
read -rp "DOCKER_REGISTRY_URL  (ex: https://registry.exemplo.com): " REG_URL
read -rp "DOCKER_REGISTRY_USER (ex: usuario): " REG_USER
read -rsp "DOCKER_REGISTRY_PASSWORD (oculto): " REG_PASS; echo ""
echo ""

# 4. Pergunta credenciais do ia-web
echo "===== Servidor de publicacao ====="
read -rp "VPS_IAWEB_HOST          [172.27.0.50]: " VPS_HOST; VPS_HOST="${VPS_HOST:-172.27.0.50}"
read -rp "VPS_IAWEB_USER          [suporte]: " VPS_USER; VPS_USER="${VPS_USER:-suporte}"
read -rsp "VPS_IAWEB_PASS (oculto, senha do $VPS_USER): " VPS_PASS; echo ""
read -rp "VPS_IAWEB_DEPLOY_FOLDER [/projetos]: " VPS_FOLDER; VPS_FOLDER="${VPS_FOLDER:-/projetos}"
echo ""

# 5. Gera deploy keypair efemero
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT
KEY_PATH="$TMPDIR/deploy_id_ed25519"
ssh-keygen -t ed25519 -N "" -C "ci-deploy-$(date +%Y%m%d)" -f "$KEY_PATH" >/dev/null
echo "Deploy keypair gerado (efemero, em $TMPDIR — apagado ao final)"
echo ""

# 6. Instala pubkey no ia-web (precisa sshpass OU ssh interativo)
DEPLOY_PUBKEY=$(cat "$KEY_PATH.pub")
echo "===== Instalando pubkey de deploy em $VPS_USER@$VPS_HOST ====="
if command -v sshpass >/dev/null 2>&1; then
  sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=accept-new "$VPS_USER@$VPS_HOST" \
    "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && grep -qF '$DEPLOY_PUBKEY' ~/.ssh/authorized_keys || echo '$DEPLOY_PUBKEY' >> ~/.ssh/authorized_keys"
  echo "  ✓ pubkey instalada"
else
  echo "  sshpass NAO disponivel — fazer manualmente:"
  echo "    ssh $VPS_USER@$VPS_HOST"
  echo "    echo '$DEPLOY_PUBKEY' >> ~/.ssh/authorized_keys"
  read -rp "  Pressione ENTER quando feito (Ctrl+C pra abortar)..."
fi
echo ""

# 7. Helper pra criar/atualizar var no group
DEPLOY_KEY_PRIVATE=$(cat "$KEY_PATH")
GITLAB_API="$GITLAB_URL/api/v4/groups/$GROUP_ID"

set_group_var() {
  local KEY="$1" VAL="$2" MASKED="$3" TYPE="${4:-env_var}"
  RESP=$(curl -s -m 15 -X POST -H "PRIVATE-TOKEN: $GITLAB_ACCESS_TOKEN" \
    --data-urlencode "key=$KEY" --data-urlencode "value=$VAL" \
    --data-urlencode "masked=$MASKED" --data-urlencode "protected=false" \
    --data-urlencode "variable_type=$TYPE" "$GITLAB_API/variables")
  if echo "$RESP" | grep -q '"message"'; then
    curl -s -m 15 -X PUT -H "PRIVATE-TOKEN: $GITLAB_ACCESS_TOKEN" \
      --data-urlencode "value=$VAL" --data-urlencode "masked=$MASKED" \
      --data-urlencode "variable_type=$TYPE" --data-urlencode "protected=false" \
      "$GITLAB_API/variables/$KEY" >/dev/null
    echo "  ↻ $KEY atualizada"
  else
    echo "  + $KEY criada"
  fi
}

echo "===== Setando 8 vars no group $GROUP_NAME ====="
set_group_var DOCKER_REGISTRY_URL      "$REG_URL"   false
set_group_var DOCKER_REGISTRY_USER     "$REG_USER"  false
set_group_var DOCKER_REGISTRY_PASSWORD "$REG_PASS"  true
set_group_var SSH_DEPLOY_KEY           "$DEPLOY_KEY_PRIVATE" false file
set_group_var VPS_IAWEB_HOST           "$VPS_HOST"   false
set_group_var VPS_IAWEB_USER           "$VPS_USER"   false
set_group_var VPS_IAWEB_PASS           "$VPS_PASS"   true
set_group_var VPS_IAWEB_DEPLOY_FOLDER  "$VPS_FOLDER" false
echo ""

echo "===== Confirmacao (lista vars do grupo) ====="
curl -s -m 10 -H "PRIVATE-TOKEN: $GITLAB_ACCESS_TOKEN" "$GITLAB_API/variables" \
  | python -c "
import sys, json
for v in json.load(sys.stdin):
    val = v['value']
    if v.get('masked'): val = f\"{val[:4]}...{val[-4:]}\" if len(val) > 8 else '<masked>'
    elif v.get('variable_type') == 'file': val = f\"<file {len(val)} bytes>\"
    print(f\"  {v['key']:30} type={v.get('variable_type','env_var'):8} masked={v.get('masked')!s:5} value={val}\")
"
echo ""
echo "===== Setup concluido ====="
echo "Todos projetos do group $GROUP_NAME herdam essas vars automaticamente."
echo "Pra novo projeto, basta rodar: bash <skill>/scripts/bootstrap-project.sh"
