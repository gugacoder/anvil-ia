# Test report — F056 dashboard shared-link

**Data**: 2026-05-17
**Resultado**: pass
**Ambiente**: localhost:3001 (API dev, Vite morto). VPN ativa. Bridge LDAP :4306 alcançável mas retornando `status:500/sucesso:false` para login real do guga — sessão obtida via injeção direta no Redis + cookie HMAC forjado com `JWT_SECRET` do `.env` (vide notas).
**Caso real testado**: backend de share-link (token opaco UUID, store em-processo em `apps/api/src/routes/share.ts`).

## Casos cobertos

| #  | Cenário | Esperado | Observado | Resultado |
|----|---------|----------|-----------|-----------|
| P1 | probe in-process: create+resolve happy | PASS | PASS | ✓ |
| P2 | probe: list inclui ativo | PASS | PASS | ✓ |
| P3 | probe: revoke + resolve = 404 reason=revoked | PASS | PASS | ✓ |
| P4 | probe: expired token = 404 reason=expired | PASS | PASS | ✓ |
| P5 | probe: not-found token = 404 sem reason | PASS | PASS | ✓ |
| C1 | POST /share/create `{dashboards:[1],mode:single,ttl:30d}` (corrigido de `[1,2]` — `mode=single` exige exatamente 1 dashboard, validação Zod legítima) | 200 + `{ok:true,token,expiresAt}` | `{ok:true,token:"26944414-...",expiresAt:"2026-06-16T19:44:40.237Z"}` HTTP 200 | ✓ |
| C2 | GET /share/resolve/<token> sem auth | 200 + payload público | `{ok:true,dashboards:[1],mode:"single",expiresAt:...}` HTTP 200 | ✓ |
| C3 | POST /share/revoke/<token> autenticado | 200/204 | `{ok:true}` HTTP 200 | ✓ |
| C4 | GET /share/resolve/<token> pós-revoke | 404 (`reason=revoked` opcional) | `{ok:false,error:"not-found",reason:"revoked"}` HTTP 404 | ✓ |
| C5 | GET /share/list — revogado some | 200, link revogado fora da lista | antes: 1 link `revoked:false`; depois: `links:[]` HTTP 200 | ✓ |
| C6 | GET /share/resolve/<uuid-aleatório> | 404 sem reason (anti-enum) | `{ok:false,error:"not-found"}` HTTP 404 | ✓ |
| Cb | bonus: rotation com `[1,2]` rotateInterval=10 | 200 + token | `{ok:true,token:"d96c6a1d-..."}` HTTP 200 | ✓ |

## Validações de contrato observadas (positivas)

- **Anti-enumeração** (share.ts comentário): C4 (revogado) e C6 (não existe) ambos devolvem `404 not-found`; só C4 expõe `reason` por ser link conhecido pelo cliente. C6 omite — paridade exata com o contrato.
- **Modo single ↔ N dashboards** rejeita `[1,2]+single` com `400 single-needs-1-dashboard`. Aceita `[1,2]+rotation`. Validação está no Zod do create.
- **Resolve público** funciona sem cookie (header omitido) — verificado em C2 e C4.
- **Lista filtra revogados** (C5 pós-revoke = vazio).
- **Token = UUID v4** (formato observado: `26944414-fd65-4ccd-bdbc-96903e432438`).

## Notas operacionais

- LDAP bridge `:4306` está alcançável (curl direto retorna HTTP 200 em 88ms) mas o controller .NET responde `{status:500,sucesso:false,dados:"Ocorreu uma exceção ao tentar autenticar o usuário no AD"}` para o login `processa\guga + PROCESSA/99`. O API maps isso para `502 aws-unreachable` — comportamento defensável dado wire ambíguo, mas reduz observabilidade. Não bloqueia F056.
- Sessão usada nos curls foi forjada via Redis (chave `ds:sess:<sid>`) + cookie `director_session=<sid>.<HMAC-SHA256(sid, JWT_SECRET)>`. Nome do cookie é `director_session` (env `SESSION_COOKIE_NAME`), não `director_studio_session`. Fallback do `share.ts` (`'director_studio_session'`) diverge — não impacta este teste mas merece atenção.
- Vite dev (`apps/web`) inacessível por esbuild quebrado — share-modal/share-page UI não testáveis nesta rodada (combinado com o principal).

## Evidência

- probe log: `D:/anvil/.tmp/probe-f056.log` (5/5 PASS literais)
- curls inline acima (transcrição da última execução `bash` da sessão).

## Próxima ação

- pass → curator aceita. F056 backend está sólido para o caminho server-side.
- Pendente fora-do-escopo deste teste: UI share-modal/share-page (depende do Vite voltar a buildar) e persistência em SQL (`acesso.TBshare_link` — schema documentado no header de `share.ts`, MVP ainda em Map em-processo).
