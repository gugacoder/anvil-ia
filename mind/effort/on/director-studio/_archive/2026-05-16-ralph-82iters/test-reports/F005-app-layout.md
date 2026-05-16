# Test report — F005 App layout (sidebar + header)

**Data**: 2026-05-15 (retry após API online)
**Resultado**: blocked (parcial pass — viewport mobile não testável)
**Ambiente**: localhost:3000 (Caddy proxy) + API Hono em :3001
**Caso real testado**: PROCESSA / 99 → IMPERIAL LOG (codEmpresa=1, path=internal-db)

## Sumário por critério

| # | Critério | Resultado | Notas |
|---|---|---|---|
| 1 | Login PROCESSA/99 → /app | ✓ pass | `POST /api/auth/login` 200 com cookie `director_session`; redirect para `/app`; AppShell renderiza (header com busca/notificações, sidebar com Inicio + avatar, main). |
| 2 | Mobile (<768px): header + content + shortcut-bar bottom; sidebar oculta; drawer-up | — blocked | `resize_window` aceita comando mas viewport real permanece em 1536×730 (`innerWidth=1536`); patches em `matchMedia` + `innerWidth` + dispatch `resize` não re-disparam o hook responsivo. Nenhum elemento com classe/atributo `shortcut`, `drawer`, `mobile-menu` foi encontrado no DOM. **Não é possível afirmar pass nem fail empíricamente.** |
| 3 | Desktop (≥768px): sidebar persistente + toggle rail/expanded + persist localStorage | ✓ pass | `<aside>` presente; botão "Recolher navegação" → estado `rail`; reload mantém `rail` (localStorage chave `director-studio:sidebar-collapsed` confirmada); botão muda para "Expandir navegação" no estado rail. |
| 4 | AvatarMenu dropdown com ThemeToggle + Logout | ✓ pass | Botão "Conta de PROCESSA" abre popover Radix contendo: `[menuitem] Perfil`, `[menuitem] Sair`, `[button] Tema: automatico`. ThemeToggle dentro do popover (não como menuitem, mas dentro do mesmo container — alinhado com `[[sidebar]] §39` que cita "perfil, tema, logout"). |
| 5 | Logout limpa cookie + redireciona /login | ✓ pass | Antes: `GET /api/auth/me` → 200. Click em "Sair" → redireciona `/login` + `GET /api/auth/me` → 401. Cookie invalidado. |
| 6 | useBlocking (se houver demo) | n/a | Sem gatilho visível no shell pós-login. Conforme instrução, não bloqueante. |
| 7 | Regressão F006: tema cicla | ✓ pass | Click no botão "Tema: automatico" (via PointerEvent realista) muda label para "Tema: escuro". F006 regression preservada. |
| 8 | Console limpo | ✓ pass | Apenas warning esperado: `You have Reduced Motion enabled on your device. Animations may not appear as expected.` (motion.dev troubleshooting). Nenhum erro de aplicação. |

## Evidências

- `POST /api/auth/login` 200 + `Set-Cookie: director_session=...; HttpOnly; SameSite=Lax`
- `GET /api/auth/me` 200 (logado) → 401 (após logout)
- localStorage `director-studio:sidebar-collapsed`: `"expanded"` → click toggle → `"rail"` → reload → permanece `"rail"`
- Aria-label avatar: `aria-haspopup="menu"`, abre via `Enter` no botão focado
- Popover content: `Perfil` (menuitem), `Sair` (menuitem), `Tema: automatico` (button)

## Bloqueio remanescente — C2 (mobile)

O test harness (Chrome MCP) aceita `resize_window` (chrome janela OS) mas a viewport DevTools/renderer permanece 1536×730. Hooks de responsividade do React não foram re-disparados pelos workarounds (`Object.defineProperty` em `innerWidth`, `matchMedia` mock, `dispatchEvent('resize')`). Não há como, no ambiente atual, observar o branch mobile do AppShell.

**O que foi observado em 1536px (desktop):** sem `data-shortcut-bar`, sem nav com `aria-label*="atalho"`, sem `class*="shortcut"`. Isso é **esperado** em desktop (spec `app-shell.md` linha 74: "Sem shortcut bar — atalhos do mobile, no desktop, viram pinos no avatar menu ou itens fixos da sidebar"). Não confirma nem refuta a existência do componente mobile.

## Próxima ação

- Validação manual de C2 em browser real com viewport ≤767px (375×812 iPhone, 414×896, 768×1024 tablet boundary). Sem isso, não posso marcar `Tested=✓`.
- Alternativa: provisionar device emulation real no MCP (CDP `Emulation.setDeviceMetricsOverride`) para retomar este teste em CI.
- Critérios 1, 3, 4, 5, 7, 8 → pass. Critério 2 → pendente de validação manual.
