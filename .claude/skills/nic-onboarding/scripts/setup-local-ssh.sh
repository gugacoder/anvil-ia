#!/usr/bin/env bash
# setup-local-ssh.sh — prepara acesso SSH local pro ia-web (suporte@172.27.0.50).
#
# Uso (a partir da raiz do repo do projeto):
#   bash <skill>/scripts/setup-local-ssh.sh
#
# Idempotente: se `ssh iaweb true` ja funciona na entrada, sai 0 sem mexer em nada.
# Se nao, monta tudo em `~/.ssh/` (caminho padrao OpenSSH), nao em `.tmp/`.
#
# Caminhos criados/mantidos:
#   ~/.ssh/processa_deploy_ed25519      (keypair privado, chmod 600)
#   ~/.ssh/processa_deploy_ed25519.pub  (pubkey, chmod 644)
#   ~/.ssh/config                       (bloco `Host iaweb` prepended)
#   ~/.ssh/known_hosts                  (host key do ia-web via ssh-keyscan)
#
# Fontes da chave privada (em ordem de preferencia):
#   1. GitLab group NIC SSH_DEPLOY_KEY (se .env tem GITLAB_ACCESS_TOKEN + GITLAB_URL)
#      → reusa a chave do CI, sem ceremonia.
#   2. Gera novo keypair local
#      → a pubkey precisa ser instalada em ~suporte/.ssh/authorized_keys do ia-web,
#        via `ssh-copy-id` + VPS_IAWEB_PASS do .env (se disponivel), OU via admin manual.

set +e

VPS_HOST="${VPS_IAWEB_HOST:-172.27.0.50}"
VPS_USER="${VPS_IAWEB_USER:-suporte}"
GROUP_ID="${GITLAB_GROUP_NIC:-470}"
HOST_ALIAS="iaweb"

KEY_PATH="$HOME/.ssh/processa_deploy_ed25519"
SSH_CONFIG="$HOME/.ssh/config"
KNOWN_HOSTS="$HOME/.ssh/known_hosts"

info() { printf "\033[34m▸\033[0m %s\n" "$*"; }
ok()   { printf "\033[32m✓\033[0m %s\n" "$*"; }
warn() { printf "\033[33m!\033[0m %s\n" "$*"; }
die()  { printf "\033[31m✗\033[0m %s\n" "$*" >&2; exit 1; }

# 0. Source .env (opcional — usado pra Opcao A e pra VPS_IAWEB_PASS)
[ -f .env ] && { set -a; . ./.env; set +a; }

# Fast-path: se ja funciona, sai
if ssh -o BatchMode=yes -o ConnectTimeout=5 "$HOST_ALIAS" true 2>/dev/null; then
    ok "ssh $HOST_ALIAS ja funciona (nada a fazer)"
    exit 0
fi

info "ssh $HOST_ALIAS nao funciona ainda — rodando bootstrap..."

# 1. ~/.ssh com permissoes corretas
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

# 2. known_hosts — adiciona host key do VPS_HOST se ausente
touch "$KNOWN_HOSTS"
chmod 644 "$KNOWN_HOSTS"
if ! ssh-keygen -F "$VPS_HOST" -f "$KNOWN_HOSTS" >/dev/null 2>&1; then
    info "adicionando $VPS_HOST em $KNOWN_HOSTS via ssh-keyscan"
    ssh-keyscan -H "$VPS_HOST" >> "$KNOWN_HOSTS" 2>/dev/null
    ok "known_hosts atualizado"
else
    ok "known_hosts ja tem $VPS_HOST"
fi

# 3. Keypair — puxa do GitLab OU gera local
if [ -f "$KEY_PATH" ]; then
    ok "keypair ja existe: $KEY_PATH"
else
    # Opcao A: puxar SSH_DEPLOY_KEY do group via API
    if [ -n "$GITLAB_ACCESS_TOKEN" ] && [ -n "$GITLAB_URL" ]; then
        info "tentando puxar SSH_DEPLOY_KEY do group $GROUP_ID..."
        VALUE=$(curl -s -m 10 -H "PRIVATE-TOKEN: $GITLAB_ACCESS_TOKEN" \
            "$GITLAB_URL/api/v4/groups/$GROUP_ID/variables/SSH_DEPLOY_KEY" \
            | python -c "import sys,json; print(json.load(sys.stdin).get('value',''))" 2>/dev/null)
        if [ -n "$VALUE" ]; then
            printf '%s' "$VALUE" | tr -d '\r' > "$KEY_PATH"
            printf '\n' >> "$KEY_PATH"
            chmod 600 "$KEY_PATH"
            ssh-keygen -y -f "$KEY_PATH" > "$KEY_PATH.pub" 2>/dev/null
            chmod 644 "$KEY_PATH.pub"
            ok "keypair obtido do GitLab group $GROUP_ID (SSH_DEPLOY_KEY)"
        else
            warn "nao foi possivel puxar SSH_DEPLOY_KEY do group"
        fi
    fi
    # Opcao B: gerar novo
    if [ ! -f "$KEY_PATH" ]; then
        info "gerando novo keypair em $KEY_PATH"
        ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "processa-deploy-$(whoami)@$(hostname)" >/dev/null
        chmod 600 "$KEY_PATH"
        chmod 644 "$KEY_PATH.pub"
        ok "keypair novo gerado"
    fi
fi

# 4. Host block em ~/.ssh/config (prepend pra ficar antes de eventual `Host *`)
touch "$SSH_CONFIG"
chmod 600 "$SSH_CONFIG"
if ! grep -qE "^Host $HOST_ALIAS([[:space:]]|$)" "$SSH_CONFIG"; then
    info "adicionando bloco Host $HOST_ALIAS em $SSH_CONFIG"
    TMP=$(mktemp)
    {
        echo "Host $HOST_ALIAS"
        echo "    HostName $VPS_HOST"
        echo "    User $VPS_USER"
        echo "    IdentityFile $KEY_PATH"
        echo "    IdentitiesOnly yes"
        echo ""
        cat "$SSH_CONFIG"
    } > "$TMP"
    mv "$TMP" "$SSH_CONFIG"
    chmod 600 "$SSH_CONFIG"
    ok "Host $HOST_ALIAS adicionado"
else
    ok "Host $HOST_ALIAS ja existe em $SSH_CONFIG"
fi

# 5. Pubkey instalada no server?
if ssh -o BatchMode=yes -o ConnectTimeout=5 "$HOST_ALIAS" true 2>/dev/null; then
    ok "pubkey ja aceita por ${VPS_USER}@${VPS_HOST}"
else
    info "pubkey ainda nao aceita — tentando instalar"
    if [ -n "$VPS_IAWEB_PASS" ] && command -v sshpass >/dev/null 2>&1; then
        sshpass -p "$VPS_IAWEB_PASS" ssh-copy-id \
            -i "$KEY_PATH.pub" \
            -o StrictHostKeyChecking=accept-new \
            "$VPS_USER@$VPS_HOST" >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            ok "pubkey instalada via sshpass + VPS_IAWEB_PASS"
        else
            warn "ssh-copy-id falhou (senha errada? user sem shell?)"
        fi
    fi
    # Ainda falha? imprime instrucoes e sai
    if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$HOST_ALIAS" true 2>/dev/null; then
        cat >&2 <<EOF

Setup automatico nao conseguiu instalar a pubkey em ~${VPS_USER}/.ssh/authorized_keys.
Escolha um dos caminhos abaixo:

  (a) Voce tem a senha do ${VPS_USER}?
      ssh-copy-id -i $KEY_PATH.pub ${VPS_USER}@${VPS_HOST}

  (b) Senao, peca pro admin instalar esta pubkey no servidor:
$(sed 's/^/      /' "$KEY_PATH.pub")

Depois rode este script de novo pra validar.
EOF
        die "setup incompleto"
    fi
fi

# 6. Verificacao final
WHO=$(ssh -o BatchMode=yes "$HOST_ALIAS" whoami 2>/dev/null)
if [ "$WHO" = "$VPS_USER" ]; then
    ok "ssh $HOST_ALIAS funciona (whoami=$WHO)"
else
    die "verificacao falhou: esperava $VPS_USER, veio '$WHO'"
fi
