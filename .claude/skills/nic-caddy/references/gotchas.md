# Caddy gotchas

Armadilhas que custaram tempo pra descobrir. Leia antes de debugar sintomas inexplicaveis.

## 1. `redir <path> permanent` — parser ambiguity

**Sintoma**: `handle /app { redir /app/ permanent }` retorna 200 OK vazio em `/app`, sem redirecionar. Ou retorna 302 com `Location: permanent` (literal).

**Causa**: Caddyfile parser interpreta `redir /path/ permanent` como `redir <matcher=/path/> <to=permanent>` quando o primeiro arg comeca com `/`. Resultado: destino vira a palavra "permanent", codigo default 302.

Confirmacao via `caddy adapt`:
```json
{"handler":"static_response","headers":{"Location":["permanent"]},"status_code":302}
```

**Solucao**: matcher `*` explicito:
```caddyfile
handle /app {
    redir * /app/ permanent
}
```

## 2. `handle /path/*` nao casa com `/path` (sem barra)

**Sintoma**: usuario abre `http://server/app` (sem `/`), recebe 200 vazio. Com `/app/` funciona.

**Causa**: Caddy v2 path matcher `/app/*` casa `/app/`, `/app/foo`, mas **nao** `/app` sozinho.

**Solucao**: handler separado pra `/app` que redireciona pra `/app/`:
```caddyfile
handle /app/* {
    reverse_proxy backend:4000
}
handle /app {
    redir * /app/ permanent
}
```

## 3. Bind-mount stale apos `git reset --hard`

**Sintoma**: edita Caddyfile no host, `git pull` deployou a nova versao, mas Caddy continua servindo a versao antiga. Mesmo `caddy reload` nao adianta.

**Causa**: `git reset --hard` recria arquivos com **inode novo**. Bind mount Docker em arquivo unico (`./Caddyfile:/etc/caddy/Caddyfile`) trava no inode antigo. Container ve a versao stale.

Verifique:
```bash
diff <(cat infra/docker/caddy/Caddyfile) <(docker exec caddy cat /etc/caddy/Caddyfile)
# se DIFEREM, eh bind-mount stale
```

**Solucao** (pragmatica): `docker compose restart caddy` apos `git pull`. Restart re-resolve o mount.

**Solucao mais robusta**: montar diretorio em vez de arquivo unico:
```yaml
volumes:
  - ./docker/caddy:/etc/caddy:ro
```
(Nota: Caddy container pode escrever em `/etc/caddy` internamente — use path de mount diferente se der problema.)

## 4. `up -d` nao recria container quando so o conteudo mountado mudou

**Sintoma**: editou Caddyfile/etc no host, fez `docker compose up -d`, container continua rodando configuracao antiga.

**Causa**: `up -d` so recria container se a **definicao** (image, env, ports) mudou. Conteudo de bind mount nao conta como mudanca.

**Solucao**: usar `--force-recreate caddy` OU `docker compose restart caddy` apos `up -d`.

## 5. `handle` vs `handle_path` vs raw blocks

Tres formas de rotear — nao misture:

- **`handle <matcher> { ... }`**: mutuamente exclusivo. Caddy avalia por especificidade; primeira correspondencia vence. **Use este pra a maioria dos casos.**
- **`handle_path <prefix> { ... }`**: igual ao handle mas **remove o prefix** antes do upstream ver. Util quando voce quer que `/api/v1/users` vire `/users` no backend.
- **Blocos raw de diretivas** (sem `handle`): sao aditivos — todos se aplicam. Evite em configs complexas — dificil de debugar.

## 6. Variaveis `{$VAR}` sao resolvidas em parse-time

`{$BACKEND_HOST}` e `{$PUBLIC_PORT}` sao substituidos uma vez no startup do Caddy. Se voce mudar a var ambiente em runtime, Caddy NAO re-le — restart o container.

## 7. Reload nao derruba outros sites

`caddy reload` (ou `nginx -s reload` do proxy externo, idem) e zero downtime. Worker antigo termina requests, worker novo pega novos. **Nao se preocupe** em mexer no Caddy enquanto outros apps usam o mesmo container.

Se a config nova for invalida: Caddy rejeita e mantem a antiga rodando. Nada cai.

## 8. SPA com `base: "/prefix/"` no Vite — runtime PRECISA strippar o prefix

**Sintoma**: a SPA funciona em **dev** mas em **prod** a tela fica congelada no boot splash. Browser baixa `/<prefix>/assets/index-XXX.js` retornando **status 200** mas **content-type text/html** (o conteudo é o `index.html`). Console fica em silencio (nao da erro: o browser executa HTML como modulo ES, que nao faz nada). React nunca monta.

**Causa**: Vite buildado com `base: "/<prefix>/"` gera `dist/index.html` referenciando assets em `/<prefix>/assets/...`. Os arquivos no disco estao em `dist/assets/...` (sem prefix). Em dev, Vite dev server entende o `base` e responde corretamente. Em prod, se voce usar um static server **dumb** tipo `serve -s dist` (npm package zeit/serve, http-server, sirv), ele NAO strippa o prefix — procura `dist/<prefix>/assets/...` (que nao existe), cai no SPA fallback e devolve o `index.html`.

O bug se esconde atras do **service worker** (PWA): primeira visita carrega tudo errado mas o SW so faz precache do `index.html` "correto" via `revision` interno; visitas subsequentes parecem funcionar (cache local). Quando o SW e' limpo (DevTools → Clear storage, ou hard reload em modo anonimo), o bug vem a tona.

**Fix**: trocar o static server por **Caddy in-container** que faz `handle_path` (strip do prefix) + SPA fallback. Dockerfile do app fica:

```dockerfile
# Builder com node ...
FROM node:22-alpine AS builder
...
RUN cd apps/hub && npm run build

# Runtime: Caddy
FROM caddy:2-alpine
COPY --from=builder /app/apps/hub/dist /usr/share/caddy/hub
COPY apps/hub/Caddyfile /etc/caddy/Caddyfile
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
```

`apps/hub/Caddyfile`:
```caddyfile
:{$HUB_PORT:2205} {
    handle_path /hub/* {
        root * /usr/share/caddy/hub
        try_files {path} /index.html
        file_server
    }
}
```

**Alternativas que parecem funcionar mas NAO sao recomendadas**:

- Colocar `handle_path /hub/* { reverse_proxy ... }` no Caddyfile **externo** do projeto (em vez do interno do container do app). Funciona em prod, mas quebra dev: Vite dev espera receber requests **com** o prefix (porque seu `base` esta configurado) — strippar antes de Vite gera 404 cascateado em `/@vite/client`, `/src/main.tsx`, etc.
- Mudar `base: "/"` no Vite. Quebra deep-linking de PWA, manifest scope, e qualquer URL hardcoded no codigo.

**Aplicacao**: vale pra TODA SPA buildada com Vite + `base`. No projeto coletivos: hub e portal. Landing nao precisa (Next.js standalone tem basePath nativo).
