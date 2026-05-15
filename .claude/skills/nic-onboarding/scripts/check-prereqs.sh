#!/usr/bin/env bash
# check-prereqs.sh — valida que estamos prontos pra deployar este projeto.
#
# Uso (a partir da raiz do repo do projeto):
#   bash <skill>/scripts/check-prereqs.sh
#
# Verifica:
#   1. .env do projeto existe e tem GITLAB_ACCESS_TOKEN + GITLAB_URL
#   2. Estrutura monorepo esperada (apps/frontend, apps/backend, infra/)
#   3. PAT funciona (chama GitLab API /user)
#   4. Conectividade com GitLab e ia-web
#   5. Quais portas no host ia-web estao livres

set +e
PASS=0; FAIL=0
ok()   { echo "  ✓ $*"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $*"; FAIL=$((FAIL+1)); }
note() { echo "  · $*"; }

echo "===== 1. .env do projeto (CWD: $(pwd)) ====="
if [ ! -f .env ]; then
  fail ".env nao existe — crie a partir de .env.production.example e preencha"
else
  ok ".env existe"
  set -a; . ./.env; set +a
  [ -n "$GITLAB_ACCESS_TOKEN" ] && ok "GITLAB_ACCESS_TOKEN setada" || fail "GITLAB_ACCESS_TOKEN vazia (PAT pessoal — crie em GitLab Profile)"
  [ -n "$GITLAB_URL" ] && ok "GITLAB_URL setada (= $GITLAB_URL)" || fail "GITLAB_URL vazia (use http://gitlab.processa.info ou IP interno)"
fi
echo ""

echo "===== 2. Estrutura monorepo ====="
for d in apps/frontend apps/backend infra; do
  [ -d "$d" ] && ok "$d existe" || fail "$d NAO existe"
done
for f in package.json package-lock.json; do
  [ -f "$f" ] && ok "$f existe" || fail "$f NAO existe"
done
echo ""

echo "===== 3. PAT funciona (GitLab API /user) ====="
if [ -n "$GITLAB_ACCESS_TOKEN" ] && [ -n "$GITLAB_URL" ]; then
  ME=$(curl -s -m 10 -H "PRIVATE-TOKEN: $GITLAB_ACCESS_TOKEN" "$GITLAB_URL/api/v4/user" \
    | python -c "import sys,json; u=json.load(sys.stdin); print(u.get('username','?'))" 2>/dev/null)
  if [ -n "$ME" ] && [ "$ME" != "?" ]; then
    ok "autenticado como '$ME'"
  else
    fail "PAT rejeitado ou GitLab inalcancavel"
  fi
fi
echo ""

echo "===== 4. Conectividade ====="
test_tcp() {
  if timeout 5 bash -c "echo > /dev/tcp/$1/$2" 2>/dev/null; then ok "$1:$2 reachable"; else fail "$1:$2 NAO reachable"; fi
}
test_tcp 172.27.0.50 22
GITLAB_HOST=$(echo "$GITLAB_URL" | sed -E 's|https?://||; s|/.*||; s|:.*||')
[ -n "$GITLAB_HOST" ] && test_tcp "$GITLAB_HOST" 80
echo ""

echo "===== 5. Portas livres no ia-web ====="
PORTS_USED=$(ssh -o BatchMode=yes -o ConnectTimeout=5 "suporte@172.27.0.50" \
  "ss -ltn | awk 'NR>1 {sub(/.*:/,\"\",\$4); print \$4}' | sort -u | sort -n | tr '\\n' ' '" 2>/dev/null)
if [ -n "$PORTS_USED" ]; then
  note "Ocupadas no host: $PORTS_USED"
  note "Sugestoes (valide cada uma livre):"
  note "  PUBLIC_PORT:    8080-8099 ou 5001-5020"
  note "  FRONTEND_PORT:  4001-4019"
  note "  BACKEND_PORT:   4000-4019"
  ok "ia-web alcancavel via SSH (key-based)"
else
  note "SSH key-based pra ia-web nao funciona — bootstrap-project.sh usara senha do group var"
  note "(nao e bloqueio; pula a sugestao de portas)"
fi
echo ""

echo "===== Resultado ====="
echo "  ✓ Pass: $PASS  ✗ Fail: $FAIL"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
