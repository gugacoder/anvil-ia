# Trocando o Docker Registry

A skill e agnostica de fornecedor de registry. O atual vive em **3 vars do GitLab group NIC** — basta editar elas pra trocar de registry. Nenhum codigo do projeto muda.

## O modelo

```
GitLab group NIC
├── DOCKER_REGISTRY_URL       (env_var)        ← URL atual
├── DOCKER_REGISTRY_USER      (env_var)        ← usuario
└── DOCKER_REGISTRY_PASSWORD  (env_var, masked) ← senha

CI usa essas vars no `docker login` e `docker push`.
Servidor (.env) tem IMAGE_REGISTRY com o hostname (sem https://) — bootstrap pre-popula.
```

## Procedimento de troca

### 1. Validar credenciais novas

Antes de mexer em nada:

```bash
NEW_URL=https://registry.exemplo.com
NEW_USER=novo-usuario
NEW_PASS='nova-senha'

curl -sI -u "$NEW_USER:$NEW_PASS" "$NEW_URL/v2/" | head -3
# Esperado: HTTP/2 200 (autenticado) ou similar
```

Se 401: senha errada. Se outro erro: registry inalcancavel.

### 2. Atualizar 3 vars do GitLab group

Via API (rapido):

```bash
. .env  # carrega GITLAB_ACCESS_TOKEN + GITLAB_URL
GROUP_ID=470
GITLAB_API="$GITLAB_URL/api/v4/groups/$GROUP_ID"

set_var() {
  curl -s -X PUT -H "PRIVATE-TOKEN: $GITLAB_ACCESS_TOKEN" \
    --data-urlencode "value=$2" \
    "$GITLAB_API/variables/$1" >/dev/null
  echo "  ↻ $1 atualizada"
}

set_var DOCKER_REGISTRY_URL      "$NEW_URL"
set_var DOCKER_REGISTRY_USER     "$NEW_USER"
set_var DOCKER_REGISTRY_PASSWORD "$NEW_PASS"
```

Ou via UI: GitLab → Group NIC → Settings → CI/CD → Variables → editar cada uma.

### 3. Atualizar `.env` no servidor (cada projeto)

Em CADA projeto que ja foi deployado, editar o `.env` no `/projetos/<app>/`:

```bash
ssh suporte@172.27.0.50
for app in projetos-deployados; do
  cd "/projetos/$app"
  REG_HOST=$(echo "$NEW_URL" | sed -E 's|https?://||; s|/.*||')
  sed -i "s|^IMAGE_REGISTRY=.*|IMAGE_REGISTRY=$REG_HOST|" .env
done
```

### 4. `docker login` persistente no servidor

Como o `suporte` no ia-web mantem credenciais em `~/.docker/config.json`:

```bash
ssh suporte@172.27.0.50
echo "$NEW_PASS" | docker login "$NEW_URL_HOST" -u "$NEW_USER" --password-stdin
# (opcional) limpa login antigo:
docker logout "$OLD_URL_HOST"
```

### 5. Disparar deploy de teste

Pra cada projeto deployado, push trivial dispara pipeline:

```bash
git commit --allow-empty -m "deploy: switch registry"
git push origin <branch>
```

Pipeline:
- `build`: pusha imagens pro novo registry
- `deploy`: SSH no ia-web, faz `compose pull` (puxa do novo registry — IMAGE_REGISTRY ja foi atualizado no .env), `up -d`

### 6. (Opcional) Limpeza

- **Docker logout no servidor** do registry antigo: `docker logout <old-host>`
- **Imagens antigas no registry antigo**: deixar (proximo deploy nao usa) ou limpar via API do registry, conforme desejo

## Por que essa rota e simples

Toda a configuracao de registry vive em **3 lugares**:

1. **3 vars no GitLab group** (URL, USER, PASSWORD)
2. **1 var em cada `.env` do servidor** (IMAGE_REGISTRY, derivada da URL)
3. **`~/.docker/config.json`** do `suporte` no ia-web (cache de credenciais)

Nenhuma referencia hardcoded em `.gitlab-ci.yml`, `docker-compose.yml`, scripts, ou Dockerfiles. Trocar = editar config, **sem alterar codigo**.

## Riscos

- **Imagens antigas nao migradas**: se decidir migrar imagens existentes ao inves de re-buildar, use `docker pull/tag/push` manualmente. Geralmente nao vale o trabalho — proximo deploy republica tudo.
- **Reverter**: se o registry novo der problema, basta refazer os passos 2 e 3 com os valores antigos. Imagens antigas no registry antigo continuam la.
- **Cache de docker login**: enquanto nao fizer logout do antigo, Docker pode tentar autenticar la pra imagens com path do novo. Solucao: `docker logout <old-host>` no ia-web.

## Checklist da troca

- [ ] Credenciais novas validadas via curl
- [ ] 3 vars `DOCKER_REGISTRY_*` atualizadas no GitLab group
- [ ] `.env` de cada projeto deployado tem `IMAGE_REGISTRY` apontando pro novo host
- [ ] `docker login <new-host>` persistente no `suporte` do ia-web
- [ ] Deploy de teste em cada projeto — pipeline verde
- [ ] Imagens novas aparecem no registry novo (`curl -u ... /v2/_catalog`)
- [ ] Stack rodando OK no ia-web (smoke test em `/health`)
- [ ] (Opcional) `docker logout <old-host>` no ia-web
- [ ] (Opcional) Imagens antigas removidas do registry antigo

## Gotcha: senha com caracteres fora de base64-safe

GitLab so aceita `masked=true` em valores com chars `[A-Za-z0-9@_\-+=:]`. Se a senha tiver `#`, `!`, `$` etc., GitLab retorna:

```json
{"message":{"value":["is invalid"]}}
```

Solucao imediata: usar `masked=false`. O log do CI continua limpo pois o CI usa `--password-stdin` (nunca imprime a senha em stdout). O risco e cosmetico: quem tem acesso a UI CI/CD do GitLab ve o valor em claro.

Solucao definitiva: pedir ao admin que troque a senha do htpasswd por uma base64-safe e re-ativar `masked=true`.

## Historico

| Data | De | Para | Motivo |
|------|----|------|--------|
| 2026-04-21 | `registry.codrstudio.dev` (CODR, pessoal do Guga) | `registry.processa.info` (registry oficial Processa) | htpasswd disponibilizado pelo admin Processa; eliminar dependencia de infra externa |
