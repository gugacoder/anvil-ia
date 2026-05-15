---
name: nic-authelia
description: "Implementar integração SSO com Authelia em qualquer app do stack Processa. Cobre: endpoint /auth/sso, upsert de usuário no primeiro login, bootstrap mode, hybrid auth no frontend, e hints de UI (badge SSO, ocultação de senha, banner de bootstrap). A skill descobre o mecanismo correto inspecionando o codebase antes de implementar — não presume arquivo, banco, ORM ou formato de token. Use sempre que o usuário mencionar: 'integrar com Authelia', 'SSO', 'login automático via Authelia', 'Remote-User', 'criar usuário no primeiro login SSO', 'bootstrap mode', ou qualquer variante de integração forward-auth."
---

# Authelia SSO Integration

Esta skill guia a integração SSO de um app com o Authelia do stack Processa. O processo tem **duas partes**: entender o que o Authelia faz (contexto fixo) e descobrir como o app em questão funciona para implementar os hook points corretamente.

---

## Parte 1 — Como o Authelia funciona

O Authelia atua como **forward-auth** no nginx. Ele não é chamado pelo app — ele intercepta o request antes:

```
browser → nginx → Authelia (autenticação)
                       ↓ (sucesso)
                  nginx injeta headers → app
```

Após autenticação bem-sucedida, o nginx injeta 4 headers em cada request:

| Header | Conteúdo |
|---|---|
| `Remote-User` | login LDAP (ex: `guga`) |
| `Remote-Email` | email do usuário |
| `Remote-Name` | nome completo |
| `Remote-Groups` | grupos LDAP separados por vírgula |

**O app só lê esses headers.** Não faz LDAP, não gerencia MFA, não controla sessão do Authelia. A segurança está na topologia: como o app só recebe esses headers via nginx autenticado, não há como falsificá-los a partir da internet.

Em desenvolvimento (sem nginx/Authelia), esses headers não existem — o endpoint SSO retorna 401 e o app cai no fluxo manual de login. Isso é o comportamento correto.

---

## Parte 2 — Hook points de implementação

Para cada hook point abaixo, **inspecione o codebase antes de implementar**. A forma certa de fazer cada passo depende do que o app já usa.

---

### Hook 1 — `user_upsert`

**O que fazer:** ao receber o header `Remote-User`, garantir que o usuário existe no app. Se não existir, criar. Se existir, atualizar nome e email.

**Como descobrir o mecanismo do app:**

```bash
# Buscar onde usuários são criados hoje
grep -r "createUser\|insertUser\|upsertUser\|create.*user\|new User" src/ --include="*.ts" -l
grep -r "INSERT INTO.*users\|users.create\|users.insert" src/ --include="*.ts" -l
# Se houver migrations, checar schema de users
find . -name "*.sql" -o -name "*migration*" | head -10
```

Identificar: é arquivo no filesystem? Tabela SQL? ORM (Prisma, Drizzle, TypeORM)? API externa?

Implementar o `upsertSSOUser(slug, displayName, email)` usando **exatamente esse mecanismo** — não criar um paralelo.

---

### Hook 2 — `credential_check`

**O que fazer:** distinguir usuários SSO (sem senha própria) de usuários com login manual. Isso alimenta a flag `sso: true` nas respostas da API.

**Como descobrir:**

```bash
# O que define que um usuário tem senha?
grep -r "password\|credential\|hash\|bcrypt\|argon" src/ --include="*.ts" -l
# Existe um campo nullable? Um arquivo separado? Uma tabela de credentials?
```

Possibilidades comuns:
- **Arquivo ausente**: `credential.yml` não existe → SSO
- **Coluna null**: `password_hash IS NULL` → SSO
- **Flag explícita**: `sso: true` no registro → SSO
- **Tabela separada**: join não encontra linha → SSO

Implementar `userHasCredential(slug): boolean` usando o mecanismo encontrado. Aplicar em todos os endpoints que retornam dados de usuário.

---

### Hook 3 — `token_emit`

**O que fazer:** após autenticar via SSO, emitir a mesma sessão que o login manual emite.

**Como descobrir:**

```bash
# Onde o login manual emite token?
grep -r "sign\|jwt\|setCookie\|session\|token" src/routes/auth* --include="*.ts" | head -20
```

Possibilidades comuns:
- **JWT em cookie HttpOnly**: copiar exatamente o `setCookie` do login manual (mesmo path, maxAge, sameSite, secure)
- **JWT em body (localStorage)**: retornar o token no body com a mesma estrutura
- **Session ID**: criar sessão no store e setar o cookie de sessão

O endpoint SSO deve emitir o **mesmo formato** que o login manual — cliente não deve distinguir a origem.

---

### Hook 4 — `admin_check` + Bootstrap mode

**O que fazer:** se não existe nenhum admin real configurado, todo login SSO recebe permissão de admin automaticamente. Quando um admin real for configurado, o modo encerra.

**Como descobrir:**

```bash
# Como o app define "admin"?
grep -r "sysadmin\|admin\|role.*admin\|isAdmin\|role_id" src/ --include="*.ts" | head -20
# Existe um usuário técnico (system, root, admin) que não deve contar?
grep -r '"system"\|"root"\|"admin"\|slug.*system' src/ --include="*.ts" | head -10
```

Implementar:

```
bootstrapMode = nenhum usuário não-técnico tem role de admin
effectiveRole = bootstrapMode ? admin : role_do_usuario
```

**Atenção crítica:** usuários técnicos (ex: `system`, `root`) frequentemente têm role de admin para funcionar em dev. Eles **não devem** contar na checagem de bootstrap — caso contrário o bootstrap nunca ativa e o primeiro usuário SSO entra sem permissão. Identificar esses usuários inspecionando o codebase e excluí-los explicitamente da query.

**O mesmo bug pode existir no frontend** se ele recomputar a condição de bootstrap localmente a partir da lista de usuários. Corrigir nos dois lugares com a mesma exclusão.

---

### Hook 5 — `router_guard`

**O que fazer:** no frontend, antes de redirecionar para a tela de login, tentar autenticação SSO silenciosa. Usuários que já estão no Authelia não devem ver a tela de login.

**Como descobrir:**

```bash
# Onde o frontend protege rotas?
grep -r "beforeLoad\|isAuthenticated\|PrivateRoute\|AuthGuard\|redirect.*login" src/ --include="*.tsx" -l
grep -r "useEffect.*auth\|checkAuth\|requireAuth" src/ --include="*.tsx" -l
```

Possibilidades comuns:
- **TanStack Router**: `beforeLoad` na rota `_authenticated`
- **React Router**: `loader` ou `element` com componente de guard
- **Next.js**: middleware ou `getServerSideProps`

Injetar a tentativa SSO **antes** do redirect:

```
1. checkAuth() → já autenticado → OK
2. loginWithSSO() → sucesso → OK
3. redirect → /login
```

O `loginWithSSO` faz `POST /auth/sso` com `credentials: "include"`. Se retornar 401 (sem Authelia), segue para login manual sem exibir erro.

---

### Hook 6 — `ui_hints`

Após a implementação funcional, adicionar indicadores visuais:

1. **Badge SSO**: nos usuários com `sso: true`, exibir badge visual (ex: "SSO") para indicar que não têm senha local. Usar o componente de badge já existente no projeto.

2. **Ocultar botão de senha**: se o usuário é SSO, não exibir o botão/link de troca de senha — não faz sentido para quem não tem senha local.

3. **Bootstrap banner**: quando `bootstrapMode === true`, exibir aviso informando que todos os usuários têm acesso total e oferecendo ação para o usuário corrente se tornar admin. Esconder o banner assim que existir um admin real.

Para descobrir os componentes corretos, inspecionar a página de gestão de usuários existente antes de criar novos componentes.

---

## Montagem do endpoint SSO

O endpoint final integra todos os hooks:

```
POST /auth/sso  (público, sem middleware de auth)
  1. Ler Remote-User header
     → se ausente: return 401 (sem mensagem descritiva — anti-enumeração)
  2. Ler Remote-Email, Remote-Name
  3. [Hook 1] upsertUser(slug, name, email)
  4. [Hook 4] bootstrapMode = !existeAdminReal()
              effectiveRole = bootstrapMode ? admin : role_do_usuario
  5. [Hook 3] emitirSessão(slug, effectiveRole)
  6. return { user: { id, role, displayName } }
```

O endpoint deve estar em uma rota **sem** o middleware de autenticação do app. Verificar onde o login manual está registrado e usar a mesma camada pública.

---

## Casos de borda

- **Anti-enumeração**: quando `Remote-User` está ausente, retornar `401` sem mensagem específica. Não dizer "header ausente" ou "não está sob Authelia" — isso vaza informação sobre a topologia.
- **Usuário técnico no bootstrap**: identificar todos os usuários criados programaticamente (não por humanos) e excluí-los da checagem de admin. Um usuário técnico com role de admin não deve "fechar" o bootstrap.
- **Bug espelhado no frontend**: se o frontend recomputar bootstrap a partir da lista de usuários, aplicar a mesma exclusão de usuários técnicos. O bug vai existir nos dois lugares se não for verificado.
- **SSO flag consistente**: aplicar a flag `sso` em todos os endpoints que retornam dados de usuário (listagem, detalhe, update). Inconsistência causa UI quebrada.
- **Hybrid auth no dev**: em desenvolvimento sem Authelia, `POST /auth/sso` retorna 401 imediatamente — o frontend deve tratar isso como "sem SSO disponível" e ir direto para o login manual, sem exibir erro.
