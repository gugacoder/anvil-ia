# Gotchas — Processa Deploy

Coisas que custaram caro descobrir. Cada uma esta aqui porque levou >15min de investigacao na pesquisa de 2026-04-20. Leia antes de debugar problemas similares.

---

## 1. DinD nao funciona — runner sem `privileged=true`

**Sintoma**: `.gitlab-ci.yml` com `services: docker:dind` falha com:

```
Could not mount /sys/kernel/security.
AppArmor detection and --privileged mode might break.
mount: permission denied (are you root?)
...
error during connect: Get "http://docker:2376/...": dial tcp: lookup docker on ...: server misbehaving
```

**Causa**: `runner-docker-01` esta configurado **sem** `privileged=true`. DinD precisa pra criar bridge networks/iptables.

**Solucao**: usar `/var/run/docker.sock` do host. O runner ja monta a sock no container do job. No `.gitlab-ci.yml`:

```yaml
variables:
  DOCKER_HOST: unix:///var/run/docker.sock
# remova:
# services:
#   - docker:dind
```

E `image: docker:26` (so cliente — daemon vem do host).

---

## 2. `$CI_REGISTRY` (`gitlab.processa.info:5001`) esta quebrado

**Sintoma**: `docker login $CI_REGISTRY -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD` falha com:

```
Error response from daemon: Get "https://gitlab.processa.info:5001/v2/":
  dial tcp 172.27.0.194:5001: connect: connection refused
```

**Causa**: misconfig do GitLab Omnibus. Variavel `$CI_REGISTRY` aponta pra `:5001` mas a porta esta fechada. Provavelmente `gitlab_rails['registry_external_url']` setado errado (ou registry simplesmente nao habilitado).

**Solucao**: nao usar `$CI_REGISTRY*` automaticas. Use registry alternativo configurado nas vars do GitLab group: `DOCKER_REGISTRY_URL/USER/PASSWORD`.

---

## 3. `registry.processa.info` usa Basic Auth (htpasswd), nao JWT

**Sintoma**: tentar logar em `registry.processa.info` com `$CI_REGISTRY_PASSWORD` (JWT do GitLab) falha com 401 Unauthorized.

**Causa**: o `registry.processa.info` e um Docker Registry v2 standalone (em `172.27.0.49:5000`, fronteado por nginx no ia-web), com `WWW-Authenticate: Basic realm="Registry Realm"`. Nao integrado com GitLab.

**Solucao**: precisa usuario+senha htpasswd configurada no host onde o registry roda. Configure as vars do GitLab group (`DOCKER_REGISTRY_URL/USER/PASSWORD`) com essas credenciais. Trocar entre registries: ver `changing-the-registry.md`.

---

## 4. Caddy `redir /path/ permanent` — parser ambiguity

**Sintoma**: `handle /app { redir /app/ permanent }` retorna 200 OK vazio em `/app`, sem redirecionar.

**Causa**: Caddy v2 parser interpreta `redir /path/ permanent` como `redir <matcher=/path/> <to=permanent>` quando o primeiro arg comeca com `/`. Resultado: HTTP 302 com `Location: permanent` (literal, palavra "permanent" como destino).

Verifique com `caddy adapt`:

```json
{"handler":"static_response","headers":{"Location":["permanent"]},"status_code":302}
```

**Solucao**: matcher explicito `*`:

```caddyfile
handle /app {
    redir * /app/ permanent
}
```

Ou matcher nomeado, ou destino com URL completa (sem ambiguidade).

---

## 5. Caddy `handle /path/*` nao casa com `/path` (sem barra final)

**Sintoma**: usuario abre `http://server:8080/app` (sem `/`), recebe 200 vazio. Com `/app/` funciona.

**Causa**: Caddy v2 path matcher `/app/*` casa `/app/`, `/app/foo`, mas **nao** `/app` sozinho.

**Solucao**: handler separado pra `/app` que redireciona pra `/app/`:

```caddyfile
handle /app/* {
    reverse_proxy frontend:4001
}
handle /app {
    redir * /app/ permanent
}
```

---

## 6. Bind-mount stale apos `git reset --hard`

**Sintoma**: deploy executa `git pull`, novo Caddyfile chega no host, mas Caddy continua servindo a versao antiga. Mesmo `caddy reload` nao adianta.

**Causa**: `git reset --hard` recria arquivos com **inode novo**. Bind mount Docker em arquivo unico (`./Caddyfile:/etc/caddy/Caddyfile`) trava no inode antigo. Container ve a versao stale.

Verifique:

```bash
diff <(cat infra/docker/caddy/Caddyfile) <(docker exec caddy cat /etc/caddy/Caddyfile)
# se DIFFEREM, e bind-mount stale
```

**Solucao** (atual): `docker compose restart caddy` no fim do deploy. Restart re-resolve o mount.

**Solucao mais robusta** (futuro): montar diretorio em vez de arquivo:

```yaml
volumes:
  - ./docker/caddy:/etc/caddy:ro
```

Mas verifica se o container nao escreve em `/etc/caddy` (Caddy guarda `caddy.pid`, `data/`, etc — pode ser problema). Alternativa: mount em path diferente e `caddy run --config /caddy-conf/Caddyfile`.

---

## 7. Backend com checks de import-time

**Sintoma**: backend crasha no boot com:

```
Error: BACKBONE_URL is not set
    at file:///app/.../routes/ai.js:7:11
    at ModuleJob.run (...)
```

Healthcheck falha, frontend (depends_on backend healthy) nao sobe.

**Causa**: `apps/backend/src/routes/ai.ts` faz `if (!process.env.X) throw new Error(...)` na importacao do modulo. Sem a var, o import explode antes do server iniciar.

**Solucao curto prazo**: setar placeholder no `.env`:

```
BACKBONE_URL=http://placeholder.invalid
BACKBONE_API_KEY=placeholder
```

App sobe, mas qualquer chamada `/api/v1/ai/*` falha em runtime — feature de AI inativa ate vars reais.

**Solucao longo prazo**: refatorar `ai.ts` pra lazy-load (so checa vars quando alguem chama o endpoint, nao no import).

**Lembrete**: ao adicionar novo backend, **leia os imports do entrypoint** procurando `if (!process.env.X) throw`. Liste todas as vars obrigatorias e garanta no `.env` template.

---

## 8. Chave SSH em GitLab CI file var perde newline final

**Sintoma**: `ssh -i $SSH_DEPLOY_KEY ...` falha com:

```
Load key "/tmp/deploy_key": error in libcrypto
Permission denied (publickey,password).
```

**Causa**: GitLab CI file vars as vezes perdem o newline final ou ganham CRLF. OpenSSH rejeita chaves mal formatadas.

**Solucao**: normalize antes de usar:

```yaml
before_script:
  - tr -d '\r' < "$SSH_DEPLOY_KEY" > /tmp/deploy_key
  - printf '\n' >> /tmp/deploy_key
  - chmod 600 /tmp/deploy_key
```

---

## 9. `suporte` nao esta no grupo `docker` por padrao

**Sintoma**: `docker ps` com usuario `suporte` retorna:

```
permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
```

**Causa**: usuario `suporte` no ia-web esta em `suporte, sudo, users` — nao em `docker`.

**Solucao**: `sudo usermod -aG docker suporte`. Efetivo em **novas sessoes SSH** (sessoes existentes precisam logout/login). Bootstrap script ja faz isso.

Alternativa: usar `sudo docker ...` em todos os comandos. Funciona mas e mais verboso.

---

## 10. `/projetos` e owned por `ti:ti`, nao `suporte`

**Sintoma**: `mkdir /projetos/<app>` como `suporte` falha com permission denied.

**Causa**: dono historico de `/projetos` e `ti:ti`. `suporte` nao tem permissao de write na raiz.

**Solucao**: usar sudo pra criar a pasta do app, depois chown pro suporte:

```bash
sudo mkdir -p /projetos/<app>
sudo chown suporte:suporte /projetos/<app>
```

Apos isso, `suporte` e dono da pasta do app e pode operar livremente dentro.

---

## 11. DNS da VPN Processa pusha 8.8.8.8 (dev only)

**Sintoma na dev**: `curl https://gitlab.processa.info` com VPN Processa ativa retorna `Connection reset` ou timeout, mesmo a VPN funcionando pra outros recursos.

**Causa**: a interface "Processa" da VPN no Windows pusha `8.8.8.8`/`8.8.4.4` como DNS. `*.processa.info` resolve pro IP **publico**, que filtra origens via SNI.

**Solucoes** (escolha uma):

a) Editar `C:\Windows\System32\drivers\etc\hosts` com:
   ```
   172.27.0.194  gitlab.processa.info
   172.27.0.50   registry.processa.info ia-web
   ```

b) Usar `--resolve` no curl:
   ```bash
   curl --resolve gitlab.processa.info:80:172.27.0.194 http://gitlab.processa.info/...
   ```

c) Usar `nslookup ... 172.27.0.2` pra resolver via DC interno

**Importante**: isso afeta **so a maquina de dev**. O runner e o ia-web usam DNS interno corretamente — pipeline e producao nao tem esse problema.

---

## 12. `compose config` falha com "invalid IP address: # comentario"

**Sintoma**: `docker compose -f infra/docker-compose.yml --env-file .env config` falha com mensagem confusa.

**Causa**: `.env` tem comentario inline depois de `=`:

```
PUBLIC_PORT=                # comentario aqui  <- BUG
```

Tudo apos `=` (incluindo espacos e o comentario) vira o valor da var. Compose recebe `"  # comentario aqui"` como porta.

**Solucao**: comentarios em linha propria:

```
# comentario aqui
PUBLIC_PORT=8080
```

---

## 13. `up -d` nao recria container quando so o conteudo mountado mudou

**Sintoma**: editou Caddyfile/etc no host, fez `docker compose up -d`, container continua rodando configuracao antiga.

**Causa**: `up -d` so recria container se a **definicao** (image, env, ports) mudou. Conteudo de bind mount nao conta.

**Solucao**: usar `--force-recreate caddy` OU `docker compose restart caddy` apos `up -d`. Deploy job ja faz isso pra Caddy especificamente.

---

## 14. nginx-proxy cacheia IP do upstream — 502 generalizado apos compose up

**Sintoma**: o site inteiro `https://<dominio>/` (raiz, /landing, /hub, /portal, /api/) retorna **502 Bad Gateway**, intermitente ou permanente. Aconteceu **logo depois** de:

- `docker compose up -d` (ou `restart`/`down`+`up`) no stack do projeto, OU
- `docker restart nginx-proxy` (ex: pra carregar cert renovado, ver gotcha 7 sobre `setup-edge.sh`).

`docker exec nginx-proxy curl` direto pro container do projeto funciona normal (302/200). So o trafego que entra pelo nginx-proxy via 443 que falha.

`docker logs nginx-proxy` mostra:

```
[error] ... connect() failed (113: No route to host) while connecting to upstream,
  ... upstream: "http://172.20.0.14:2000/", host: "processa.info"
```

— mas o caddy do projeto esta em `172.20.0.5` (confira com `docker inspect <projeto>-<env>-caddy-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`).

**Causa**: nginx resolve o nome do upstream (`<projeto>-<env>-caddy-1`) **uma vez quando o worker inicializa** e cacheia o IP. Quando o container e' recriado (Compose recria em qualquer `up -d` que mude env/image/labels, ou `down`+`up`), ele ganha **IP novo** na rede Docker. nginx-proxy continua tentando o IP velho indefinidamente. Pior: o vhost passa `nginx -t` e `reload` sem erro — a falha so aparece em runtime quando o request chega no worker.

**Solucao curta** (alivio imediato): `docker restart nginx-proxy` — forca re-resolucao.

**Solucao certa** (no vhost — ja aplicada no template `nginx-vhost.conf` desta skill):

```nginx
server {
    listen 443 ssl;
    ...
    # Docker embedded DNS — re-resolve com TTL curto
    resolver 127.0.0.11 valid=10s ipv6=off;

    # Upstream como variavel obriga nginx a re-resolver a cada request
    set $caddy_upstream     "<PROJECT>-<ENV>-caddy-1:<PUBLIC_PORT>";
    set $authelia_upstream  "http://authelia:9091/api/verify";

    location = / {
        proxy_pass http://$caddy_upstream;   # <- variavel, nao literal
        ...
    }

    location = /internal/authelia/authz {
        proxy_pass $authelia_upstream;       # <- variavel, nao literal
        ...
    }

    # ... idem em TODAS as locations que fazem proxy_pass pra container Docker
}
```

**Por que funciona**: quando o `proxy_pass` tem variavel na URL, nginx **nao** cacheia o IP no worker — re-resolve via DNS a cada request (o cache respeita `valid=10s`). `127.0.0.11` e' o resolver embarcado do Docker, que sempre tem o IP atual de cada container.

**Observacao** (fora do escopo desta skill, mas relevante): vhosts de outros projetos no mesmo `nginx-proxy` (`gitlab.processa.info`, `n8n.processa.info`, …) tem o mesmo problema latente se foram escritos com `proxy_pass http://nome-do-container:porta;` literal. Mexer ali requer coordenacao com admin.

---

## Padroes pra evitar todos os 14

1. Sempre normalize chave SSH (gotcha 8) no `before_script`
2. Sempre `restart caddy` no fim do deploy (gotcha 6, 13)
3. Sempre matcher explicito em `redir` Caddy (gotcha 4)
4. Sempre `handle /path` separado de `handle /path/*` (gotcha 5)
5. Sempre comentarios em linha propria no `.env` (gotcha 12)
6. Sempre `usermod -aG docker suporte` no bootstrap (gotcha 9)
7. Sempre `sudo mkdir + chown` em `/projetos/` (gotcha 10)
8. Sempre listar vars import-time obrigatorias antes de subir backend (gotcha 7)
9. Sempre `resolver 127.0.0.11` + `set $upstream` + `proxy_pass http://$upstream` no vhost (gotcha 14)

Quase tudo isso ja esta nos templates desta skill.
