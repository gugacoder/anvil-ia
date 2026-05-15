#!/usr/bin/env bash
# bootstrap-project.sh — prepara /projetos/<PROJECT> no ia-web (one-time).
#
# Uso (a partir da raiz do repo do projeto):
#   bash <skill>/scripts/bootstrap-project.sh <PROJECT> <BRANCH> <GITLAB_PATH>
#
# Exemplos:
#   bash <skill>/scripts/bootstrap-project.sh nic nic nic/automacao/nic-lab
#   bash <skill>/scripts/bootstrap-project.sh meuapp main meuteam/meuapp
#
# Operador precisa apenas: GITLAB_ACCESS_TOKEN + GITLAB_URL no .env do projeto.
# Tudo o resto (registry creds, deploy key, senha do suporte) eh puxado do
# GitLab group via API.
#
# Idempotente: se ja foi rodado antes, pula passos ja concluidos.

set +e

PROJECT="${1:?Uso: $0 <PROJECT> <BRANCH> <GITLAB_PATH>}"
BRANCH="${2:?Uso: $0 <PROJECT> <BRANCH> <GITLAB_PATH>}"
GITLAB_PATH="${3:?Uso: $0 <PROJECT> <BRANCH> <GITLAB_PATH>}"

# 1. Sourcear .env do projeto (PAT + GITLAB_URL)
[ -f .env ] && { set -a; . ./.env; set +a; }
[ -z "$GITLAB_ACCESS_TOKEN" ] && { echo "ERRO: GITLAB_ACCESS_TOKEN vazia em .env"; exit 1; }
[ -z "$GITLAB_URL" ] && { echo "ERRO: GITLAB_URL vazia em .env"; exit 1; }

# 2. Pergunta o group id (default NIC=470)
read -rp "GitLab Group ID que tem as deploy vars [470]: " GROUP_ID
GROUP_ID="${GROUP_ID:-470}"

# 3. Fetch das group vars via API
echo ""
echo "===== Buscando deploy vars no group $GROUP_ID ====="
GET_VAR() {
  curl -s -m 10 -H "PRIVATE-TOKEN: $GITLAB_ACCESS_TOKEN" \
    "$GITLAB_URL/api/v4/groups/$GROUP_ID/variables/$1" \
    | python -c "import sys,json; print(json.load(sys.stdin).get('value',''))" 2>/dev/null
}

REG_URL=$(GET_VAR DOCKER_REGISTRY_URL)
REG_USER=$(GET_VAR DOCKER_REGISTRY_USER)
REG_PASS=$(GET_VAR DOCKER_REGISTRY_PASSWORD)
DEPLOY_KEY_PRIV=$(GET_VAR SSH_DEPLOY_KEY)
VPS_HOST=$(GET_VAR VPS_IAWEB_HOST)
VPS_USER=$(GET_VAR VPS_IAWEB_USER)
VPS_PASS=$(GET_VAR VPS_IAWEB_PASS)
VPS_FOLDER=$(GET_VAR VPS_IAWEB_DEPLOY_FOLDER)

for v in REG_URL REG_USER REG_PASS DEPLOY_KEY_PRIV VPS_HOST VPS_USER VPS_PASS VPS_FOLDER; do
  if [ -z "${!v}" ]; then
    echo "ERRO: var '$v' vazia (via group $GROUP_ID). Admin precisa rodar setup-group-vars.sh primeiro."
    exit 1
  fi
done
echo "  ✓ todas as 8 vars puxadas do group"
echo ""

# 4. Escrever deploy key num arquivo temporario
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT
KEY_PATH="$TMPDIR/deploy_key"
printf '%s\n' "$DEPLOY_KEY_PRIV" | tr -d '\r' > "$KEY_PATH"
chmod 600 "$KEY_PATH"

# 5. SSH no ia-web com a deploy key, faz tudo de uma vez
echo "===== Bootstrap em $VPS_USER@$VPS_HOST:$VPS_FOLDER/$PROJECT (branch $BRANCH) ====="
ssh -i "$KEY_PATH" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new \
  -o UserKnownHostsFile="$TMPDIR/known_hosts" \
  "$VPS_USER@$VPS_HOST" \
  "SUDO_PASS='$VPS_PASS' \
   GITLAB_TOKEN='$GITLAB_ACCESS_TOKEN' \
   REG_URL='$REG_URL' \
   REG_USER='$REG_USER' \
   REG_PASS='$REG_PASS' \
   PROJECT='$PROJECT' \
   BRANCH='$BRANCH' \
   GITLAB_PATH='$GITLAB_PATH' \
   GITLAB_URL='$GITLAB_URL' \
   VPS_FOLDER='$VPS_FOLDER' \
   bash -s" << 'REMOTE'
set +e
echo "$SUDO_PASS" | sudo -S -v -p '' 2>&1 | grep -v "^\[sudo\]"

echo "-- 1. Cria $VPS_FOLDER/$PROJECT (owner $USER) --"
if [ -d "$VPS_FOLDER/$PROJECT" ]; then
  echo "   ↻ ja existe ($(ls -ld $VPS_FOLDER/$PROJECT | awk '{print $3":"$4}'))"
else
  sudo mkdir -p "$VPS_FOLDER/$PROJECT"
  sudo chown "$USER:$USER" "$VPS_FOLDER/$PROJECT"
  echo "   + criado"
fi

echo "-- 2. Grupo docker pra $USER --"
if id -nG "$USER" | grep -qw docker; then
  echo "   ↻ ja no grupo docker"
else
  sudo usermod -aG docker "$USER"
  echo "   + adicionado (efetivo em proximas sessoes SSH)"
fi

echo "-- 3. Clone branch $BRANCH em $VPS_FOLDER/$PROJECT --"
if [ -d "$VPS_FOLDER/$PROJECT/.git" ]; then
  cd "$VPS_FOLDER/$PROJECT"
  echo "   ↻ ja e repo git (remote: $(git remote get-url origin), branch: $(git branch --show-current))"
else
  cd "$VPS_FOLDER"
  GITLAB_HOST=$(echo "$GITLAB_URL" | sed -E 's|https?://||; s|/.*||')
  git clone --branch "$BRANCH" "http://oauth2:$GITLAB_TOKEN@$GITLAB_HOST/$GITLAB_PATH.git" "$PROJECT" 2>&1 | tail -3
  cd "$PROJECT"
  git remote set-url origin "$GITLAB_URL/$GITLAB_PATH.git"
  echo "   + cloned, remote sanitizado"
fi

echo "-- 4. .env (a partir de template, se nao existe) --"
cd "$VPS_FOLDER/$PROJECT"
if [ -f .env ]; then
  echo "   ↻ .env ja existe (nao sobrescrevo)"
elif [ -f .env.production.example ]; then
  cp .env.production.example .env
  # Pre-popula IMAGE_REGISTRY com valor do group var
  REG_HOST=$(echo "$REG_URL" | sed -E 's|https?://||; s|/.*||')
  sed -i "s|^IMAGE_REGISTRY=.*|IMAGE_REGISTRY=$REG_HOST|" .env
  chmod 600 .env
  echo "   + .env criado a partir do template (IMAGE_REGISTRY pre-populado: $REG_HOST)"
  echo "   ⚠ OPERADOR PRECISA PREENCHER no .env do servidor:"
  echo "      PUBLIC_PORT, FRONTEND_PORT, BACKEND_PORT (livres no host)"
  echo "      JWT_SECRET (openssl rand -base64 32)"
  echo "      POSTGRES_PASSWORD (openssl rand -base64 24)"
  echo "      BACKBONE_URL, BACKBONE_API_KEY (placeholders OK pra primeiro deploy)"
else
  echo "   ✗ .env.production.example nao existe no repo — adicione antes de continuar"
fi

echo "-- 5. docker login persistente em $REG_URL --"
REG_HOST=$(echo "$REG_URL" | sed -E 's|https?://||; s|/.*||')
if [ -f ~/.docker/config.json ] && grep -q "$REG_HOST" ~/.docker/config.json 2>/dev/null; then
  echo "   ↻ ja logado em $REG_HOST"
else
  echo "$REG_PASS" | docker login "$REG_HOST" -u "$REG_USER" --password-stdin
fi

echo ""
echo "===== Bootstrap concluido ====="
echo "Proximos passos:"
echo "  1. SSH no servidor ($VPS_USER@<host>) e edite $VPS_FOLDER/$PROJECT/.env com valores reais"
echo "  2. git push origin $BRANCH (dispara o pipeline; deploy automatico)"
REMOTE
