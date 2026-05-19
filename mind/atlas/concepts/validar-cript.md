---
title: "Validar_Cript / fn_Decript — criptografia legada reversível"
aliases: [validar-cript, fn-decript, dbo.VALIDAR_CRIPT, dbo.fn_Decript, xor-scramble]
tags: [security, legacy, processa, auth, cryptography, sql-server]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-19
updated: 2026-05-19
---

# Validar_Cript / fn_Decript — criptografia legada reversível

Par de funções SQL Server no schema `dbo` do [[dbdirector]] que implementa o mecanismo de armazenamento e validação de senhas do Director ERP. `dbo.VALIDAR_CRIPT(@senha_plaintext, @senha_armazenada)` retorna `1` se a senha confere; `dbo.fn_Decript(@senha_armazenada)` **reverte a senha para plaintext**. O algoritmo é um XOR scramble de 2011 (autor: Rogério Macêdo), sem salt, sem KDF, sem hashing unidirecional — a chave de cifragem está embutida na própria senha armazenada.

## Key Points

- **Reversível por design**: `fn_Decript` é uma função pública no banco que qualquer `SELECT` pode invocar. Um `SELECT DFnome_usuario, dbo.fn_Decript(DFsenha) FROM TBusuario` expõe **todas as senhas em plaintext**.
- **Algoritmo**: XOR scramble com chave derivada da própria string armazenada. Sem salt, sem iterações, sem KDF. Não é hashing — é cifragem simétrica trivial.
- **Round-trip verificado**: `dbo.VALIDAR_CRIPT(dbo.fn_Decript(DFsenha), DFsenha) = 1` para todos os registros de `TBusuario`.
- **Usado pelo auth path 5** (usuário interno): o `AuthQuery` do [[processa-auth-paths]] chama `(SELECT dbo.VALIDAR_CRIPT(@senha, DFsenha)) = 1` para validar login. É o único mecanismo de senha para usuários internos do Director ERP.
- **Senha seed `PROCESSA` = `99`**: em bases novas do Director, o usuário admin `PROCESSA` (id=1) tem senha `99` — provável seed do installer. Descoberta via `fn_Decript` na base `DBdirector_imperial_logistica_29`.

## Details

A descoberta aconteceu durante o bootstrap do Director.Studio (2026-05-15), quando o ui-tester reportou bloqueio na feature F003 (login) por falta de credencial real de `TBusuario` ativo. A investigação encontrou `dbo.fn_Decript` na base, que reverteu a senha do usuário PROCESSA para `99`. O round-trip `VALIDAR_CRIPT(fn_Decript(DFsenha), DFsenha) = 1` confirmou que a função é inversa exata do mecanismo de cifragem.

Do ponto de vista de segurança, esta é uma vulnerabilidade severa: qualquer ator com acesso de leitura ao banco (DBA, backup operator, SQL injection) pode extrair todas as senhas em plaintext com um único SELECT. O algoritmo data de 2011 e provavelmente nunca foi atualizado porque (a) funciona, (b) ninguém auditou, (c) a reversibilidade é usada ativamente pelo suporte (há evidências de que `fn_Decript` é invocado em procedures de manutenção). A existência de uma função de decrypt pública no banco é, por si só, um anti-pattern — senhas devem ser armazenadas com hashing unidirecional (bcrypt, argon2, PBKDF2).

Para o Director.Studio, a implicação imediata é operacional: o Studio precisa validar senhas usando `VALIDAR_CRIPT` para manter compatibilidade durante a coexistência com o legado. A migração para hashing moderno (bcrypt/argon2) é item P2 pós-cutover — exige forçar reset de todas as senhas, incluindo a seed `PROCESSA/99`, e deprecar `fn_Decript`. Até lá, o Studio herda a fragilidade.

## Related Concepts

- [[processa-auth-paths]] — auth path 5 (usuário interno) depende de `VALIDAR_CRIPT` para validar login
- [[dbdirector]] — banco onde `VALIDAR_CRIPT` e `fn_Decript` vivem como funções `dbo`
- [[director-studio]] — precisa manter compatibilidade com `VALIDAR_CRIPT` durante coexistência; migração para hashing moderno é P2
- [[processa-adm-tool]] — o ADM tem ferramentas de suporte que podem usar `fn_Decript` internamente

## Sources

- [[calendar/notes/2026-05-15.md]] — descoberta de `fn_Decript` ao investigar bloqueio de F003; decifrou senha PROCESSA=99; round-trip verificado; classificação como achado de auditoria fora do escopo imediato; decisão de registrar e postergar correção para P2 pós-cutover
