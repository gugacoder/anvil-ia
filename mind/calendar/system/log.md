# Compile Log

## [2026-05-13T23:05:54-03:00] compile | 2026-05-13.md

- Source: calendar/notes/2026-05-13.md
- Articles created: [[concepts/mind-pipeline]], [[concepts/dbdirector]], [[concepts/pipeliner-service]], [[concepts/tbopcoes]], [[concepts/idempotencia-filesystem]], [[connections/pipeliner-dbdirector-bypass]]
- Articles updated: none
- Notes: xml-to-json-node already up-to-date from same-day creation; no merge needed

## [2026-05-14T18:30:00-03:00] compile | 2026-05-14.md

- Source: calendar/notes/2026-05-14.md
- Articles created: [[concepts/appbuilder]], [[concepts/director-web]], [[concepts/deploy-pipeline-newdb]], [[concepts/scriptpack-appbuilder]], [[connections/appbuilder-directorweb-topology]]
- Articles updated: [[concepts/pipeliner-service]] (Query-only pipeline, schedule details, absence from Srv-DirectorWeb), [[concepts/area-52]] (SSH, firewall, service infrastructure, DB apontamento)
- Notes: Rich day — 4 sessions covering AppBuilder UI mapping, end-to-end test, infrastructure discovery via SSH, and interlocutor handoff to Everton (PO). Key topology insight: AppBuilder cadastra → Director.Web opera.

## [2026-05-19T01:00:00-03:00] compile (incremental) | 2026-05-14.md

- Source: calendar/notes/2026-05-14.md (Session 16:40 — previously missed)
- Articles created: none
- Articles updated: [[concepts/director-web]] (multi-app host architecture: 12+ SQL modules discovered in `engenharia--fabrica--sql--portal-director/`; WMS as default app; `processa.pipeliner/` as operational module; `module.info` config files; open questions about app loading mechanism)
- Notes: Incremental compile — the Session (16:40) insight about Director.Web being a multi-app host with 12 SQL modules was not captured in the original compile pass. This is architecturally significant: Director.Web is not a single app but a runtime hosting WMS, Pipeliner, GDE, Check-in, Cotação, Agendamento, Rebaixa, and more.

## [2026-05-19T01:50:00-03:00] compile | 2026-05-15.md

- Source: calendar/notes/2026-05-15.md
- Articles created: [[concepts/validar-cript]], [[concepts/director-studio-agent-team]], [[concepts/director-studio-wave-model]], [[connections/validar-cript-auth-dependency]]
- Articles updated: [[concepts/director-studio]] (stack decisions, auth divergence, Docker infra, PREFIX convention, manifest seed, agent team & wave model refs), [[concepts/processa-auth-paths]] (schema dbo vs acesso discovery, UsuarioFornecedor not universal, VALIDAR_CRIPT link)
- Notes: Dense bootstrap session — Director.Studio project founded with full stack, 5-agent team, wave model, and 27-feature manifest. Key security finding: dbo.fn_Decript reverses all passwords in plaintext (XOR scramble from 2011). PROCESSA seed password = 99. Auth path schema correction: TBusuario lives in dbo, not acesso, in most installations.

## [2026-05-19T00:54:38-03:00] compile | 2026-05-16.md

- Source: calendar/notes/2026-05-16.md
- Articles created: [[concepts/power-select-versions]], [[concepts/select-options-endpoint]]
- Articles updated: [[concepts/react-tools]] (PowerSelect 3-version coexistence, useSelectFields hook, cache/debounce audit)
- Notes: F019 excavation revealed manifest mislabeling — PowerSelect3 is client-side modal filter, not typeahead+async. Real async lives in V1 (PowerSelect.js). No version implements debounce, cancel, or cache. useSelectFields defines 4 endpoint patterns reused by F016 and F019.

## [2026-05-19T01:56:00-03:00] compile | 2026-05-17.md

- Source: calendar/notes/2026-05-17.md
- Articles created: [[concepts/tbaplicacao-app-registry]], [[connections/tbaplicacao-auth-scheme-switching]]
- Articles updated: [[concepts/acesso-metamodel]] (TBaplicacao cross-tenant survey reference, 23 appKeys, DFchave as stable discriminator)
- Notes: F113 excavation — cross-tenant probe of 97 DBdirector_* bases revealed 23 appKeys in acesso.TBaplicacao with core/opt-in/one-off taxonomy. Key discovery: AppClientService.BuildHeader switches auth-scheme per DFchave using fixed service identity (not user identity). Imperial lacks appKey `agent` — F093 impact noted. Also: new work front Imperial NFE separation created but too thin for concept article (spec pending from Everton).

## [2026-05-19T03:30:00-03:00] compile | 2026-05-19.md

- Source: calendar/notes/2026-05-19.md
- Articles created: [[concepts/processa-source-control]]
- Articles updated: none
- Notes: Thin log — single session. New concept: SVN/network share topology across Processa hosts (Director VB6 at 172.27.0.5 HTTP-only, procedures at 172.27.3.10 SMB, corporate shares at 172.27.0.4). Corrects recurring confusion between the two SVN repos. Other session content (secret handling rules, agent identity cleanup) went to CLAUDE.md/AGENTS.md as operational rules, not wiki material.

## [2026-05-23T04:02:04-03:00] compile | 2026-05-19.md (full recompile with 4 sessions)

- Source: calendar/notes/2026-05-19.md
- Articles created: [[concepts/anchor-mission-persona]], [[concepts/vite-dev-gate-pattern]], [[concepts/feature-granularity-heuristic]], [[connections/anchor-curator-quality-gate]]
- Articles updated: [[concepts/director-studio]] (brand "Processa Studio", manifest 27→132 features, auditoria pós-harness F123-F131), [[concepts/director-studio-wave-model]] (stateless dwave, Ralph Loop 132 features, feature granularity heuristic, retrofit recipe), [[concepts/director-studio-agent-team]] (smith↔ui-tester workflow validated, anti-pattern flags top 5)
- Notes: Full recompile of 2026-05-19.md which now has 4 sessions (00:47, 14:47, 14:48, 03:00) vs the 1 session at prior compile. Rich methodology session (03:00) with NIC yielded anchor concept (MISSION+PERSONA), feature granularity heuristic, and retrofit recipe. Audit session (18:00) yielded vite dev-gate pattern and 9 post-harness débits. Session 00:47 SVN/source-control content already compiled in prior pass. KB total: 32 articles + team concept.

## [2026-05-23T04:08:19-03:00] compile | 2026-05-22.md

- Source: calendar/notes/2026-05-22.md
- Articles created: [[concepts/processa-os]], [[concepts/processa-os-federation]], [[concepts/openclaude-sdk-chat]]
- Articles updated: none (brands session already captured in maps/brands.md at 2026-05-22)
- Notes: 3 sessions — brands migration (already in maps/brands.md), Processa OS prototype (GNOME-like web OS with window manager, 5 real apps, SSE notifications, smoke test green), and Processa OS Fed architecture audit (Module Federation via @originjs/vite-plugin-federation, zero iframe, no shared reactive state). OpenClaude SDK+Chat vendorization pattern extracted as reusable concept across hub/jornada/processa-os. KB total: 36 articles.
