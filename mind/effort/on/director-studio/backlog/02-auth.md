# 02 — Implementação de auth

> Modelo conceitual em [[mind/atlas/concepts/processa-auth-paths]]. Este documento é só o plano de execução no protótipo.

## Objetivo

Cobrir os 5 caminhos de auth Processa em Node + Hono, **sem .NET local**, com sessão server-side via cookie httpOnly + Redis.

## Mapeamento dos 5 caminhos

| # | Caminho | Detecção | Implementação Node |
|---|---|---|---|
| 1 | JWT validate | header Bearer | `jose.jwtVerify(token, HS256_KEY)` |
| 2 | Senha temp `processa` | user == "processa" | replicar `TokenUtils.ValidateTempPassword` (algoritmo em `Processa.Sdk.Auth/TokenUtils.cs:157-177`) |
| 3 | LDAP via bridge AWS | user.startsWith("processa\\") | `fetch http://{ServidorAutenticacao}:4306/api/auth/validate` POST Bearer + body criptografado |
| 4 | Fornecedor (email) | user.includes("@") | `mssql` query `AuthFornecedorAWSQuery` |
| 5 | Usuário interno | resto | `mssql` query `AuthQuery` |

SQL completos dos caminhos 4-5 em `Processa.Sdk.Api/Settings.cs:40-65` — copiar verbatim.

## Sessão e cookie

```
POST /auth/login (JSON: { dominio?, login, senha })
  ↓
Hono monta Basic: btoa([dominio+"|"]+login+":"+senha)
  ↓
Roteia para 1 dos 5 caminhos acima
  ↓
Sucesso: { id, nome, codEmpresa, nomeEmpresa, dominio }
  ↓
sid = crypto.randomUUID()
redis.SET session:<sid> JSON({ user, expires, jwt? }) EX 28800
Set-Cookie: director_session=<sid>; HttpOnly; Secure; SameSite=Lax; Path=/
```

Frontend nunca toca o token. Cliente faz `fetch('/api/...', { credentials: 'include' })`.

Middleware Hono em cada request:
```ts
const sid = c.req.cookie('director_session')
const session = await redis.get(`session:${sid}`)
if (!session) return c.json({ error: 'unauthorized' }, 401)
c.set('user', JSON.parse(session).user)
```

## Endpoints

- `POST /auth/login` — coleta credenciais, roteia, cria sessão
- `GET /auth/me` — retorna `{ user }` ou 401
- `POST /auth/logout` — `redis.DEL session:<sid>` + Set-Cookie expirado

## Configuração

Variáveis de ambiente (`.env`):
- `DB_LOCAL_CONN` — connection string SQL Server local (DBdirector)
- `AWS_BRIDGE_HOST` — default `52.67.203.133:4306`
- `JWT_SECRET` — durante coexistência com .NET, usar a `Consts.SecretKey` hard-coded; quando autônomo, rotacionar
- `REDIS_URL`
- `SESSION_TTL_HOURS` (default 8)

## Replicar `Cryptography.Encrypt` em Node

O body do POST para o bridge AWS precisa ser criptografado com o mesmo algoritmo do `Processa.Sdk.Api.Cryptography` (AES-256-CBC com chave derivada da SecretKey). Algoritmo aberto em `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs`. Replicar com `node:crypto`.

## Tarefas

- [ ] Levantar Redis local (docker-compose dev)
- [ ] Implementar `POST /auth/login` com roteamento dos 5 caminhos
- [ ] Replicar `Cryptography.Encrypt` (AES) em Node — necessário só para path 3 (LDAP-bridge)
- [ ] Replicar `ValidateTempPassword` — necessário só para path 2
- [ ] Tela de login no SPA (campos: dominio opcional, login, senha; flag `useDomain` por configuração)
- [ ] Middleware de validação de sessão em todas as rotas exceto `/auth/*` e estáticos
- [ ] Testes E2E dos 5 caminhos contra base real (Área 52)

## TODO transversais

- Decidir política de "domínio único" vs "Studio multi-tenant": pode um Studio servir vários DBdirector? Provavelmente sim (via `TBconexao`), mas escopo do protótipo é single-tenant.
- LDAP-bridge AWS exige IP atingível do servidor cliente. Verificar firewall em ambientes reais.
- CSRF: cookie é `SameSite=Lax`, endpoints sensíveis são POST/JSON — mitigação suficiente para protótipo; se expor formulários cross-site, adicionar double-submit token.
