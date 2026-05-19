---
title: "Processa Source Control — SVN e network shares"
aliases: [processa-source-control, svn-director, svn-processa, network-shares]
tags: [infra, processa, svn, source-control, rede]
sources:
  - "calendar/notes/2026-05-19.md"
created: 2026-05-19
updated: 2026-05-19
---

# Processa Source Control — SVN e network shares

A infraestrutura de controle de fonte e compartilhamento de arquivos da Processa distribui-se por vários hosts na rede `172.27.x.x`. O Director ERP (legado VB6) vive em um **repositório SVN acessível apenas via HTTP** — não existe share SMB com o trunk materializado. Um segundo repositório SVN em host diferente contém procedures SQL do time de desenvolvimento, o que gera confusão frequente.

## Key Points

- **Director VB6 (SVN HTTP)**: `https://172.27.0.5/svn/director/trunk` — repo do Director ERP legado. Contém forms VB6 (`.frm`, `.vbp`), incluindo telas de importação como `frmImportacao_Pedido_Venda_XML_Saudense.frm`. Acesso exclusivamente via protocolo SVN/HTTP — nenhum share SMB expõe o checkout.
- **`\\172.27.0.5` (SMB)**: expõe apenas o share `Backup`. O SVN e os shares SMB coexistem no mesmo host mas são disjuntos — não há trunk materializado como pasta de rede.
- **`\\172.27.0.4` (shares corporativos)**: expõe `Sistemas`, `Suporte`, `Projetos`. O share `Projetos` é acessível com credencial padrão; `Sistemas` e `Suporte` retornam acesso negado. É onde vivem artefatos de engenharia como MSIs do AppBuilder (ver [[scriptpack-appbuilder]]).
- **`\\172.27.3.10\svn\trunk` (procedures SQL)**: repo **diferente** do Director VB6. Contém apenas `Relatorios/`, `Scripts/`, `SQL/` — procedures do time de desenvolvimento que executam no [[dbdirector]]. Confundir este repo com "o SVN do Director" é erro recorrente.
- **Sem svn.exe na máquina dev**: nem `svn.exe` nem TortoiseSVN estão instalados no ambiente de trabalho. Para acessar o fonte VB6, é necessário instalar um cliente SVN e fazer checkout (preferencialmente esparso: `--depth empty` + `svn update` dos arquivos específicos).

## Details

A descoberta surgiu durante a frente Imperial NFE (2026-05-19), quando foi necessário acessar o form VB6 `frmImportacao_Pedido_Venda_XML_Saudense.frm` (tela id 2595, módulo Ferramentas, autor Luiz Paulo). A tentativa de encontrar o arquivo via shares SMB nos hosts vizinhos revelou que o SVN do Director não tem representação no filesystem acessível por rede — é um servidor Subversion puro HTTP.

A confusão com `\\172.27.3.10\svn\trunk` é particularmente insidiosa: a presença de uma pasta `svn/trunk` sugere que é "o SVN" da organização, mas é um repo separado dedicado a procedures SQL e relatórios. O Director VB6 vive em outro host (`172.27.0.5`) e outro protocolo (HTTP, não SMB). A nota no artigo [[dbdirector]] que menciona `\\172.27.3.10\svn\trunk` como "referência para técnicas já adotadas" é correta — é o repo de procedures — mas não deve ser confundida com o fonte do Director ERP propriamente.

Para trabalhar com o fonte VB6 do Director, o caminho operacional é: (1) instalar cliente SVN (svn CLI ou TortoiseSVN), (2) fazer checkout esparso do trunk (`svn checkout --depth empty https://172.27.0.5/svn/director/trunk`), (3) atualizar apenas os arquivos necessários (`svn update --set-depth infinity <path>`). Isso evita baixar o repositório inteiro, que pode ser volumoso.

## Mapa de hosts e protocolos

| Host | Protocolo | Conteúdo | Acesso |
|---|---|---|---|
| `172.27.0.5` | SVN HTTP (`https://172.27.0.5/svn/director/trunk`) | Director ERP VB6 (`.frm`, `.vbp`, `.bas`) | Requer cliente SVN |
| `172.27.0.5` | SMB (`\\172.27.0.5\Backup`) | Backups | Único share exposto |
| `172.27.0.4` | SMB (`\\172.27.0.4\Projetos`) | Artefatos de engenharia (MSIs, ScriptPack, etc.) | Acessível com credencial padrão |
| `172.27.0.4` | SMB (`\\172.27.0.4\Sistemas`, `\Suporte`) | Desconhecido | Acesso negado |
| `172.27.3.10` | SMB (`\\172.27.3.10\svn\trunk`) | Procedures SQL do time de dev (`Relatorios/`, `Scripts/`, `SQL/`) | Acessível — NÃO é o Director VB6 |

## Related Concepts

- [[dbdirector]] — banco onde as procedures de `\\172.27.3.10\svn\trunk` executam
- [[scriptpack-appbuilder]] — artefato distribuído via `\\172.27.0.4\Projetos\Engenharia\`
- [[area-52]] — ambiente de dev (`172.27.0.52`) que consome os builds dos apps mantidos nesses repos

## Sources

- [[calendar/notes/2026-05-19.md]] — varredura de hosts vizinhos durante frente Imperial NFE; descoberta de que SVN do Director é HTTP-only sem share SMB; distinção entre repos `172.27.0.5` (Director VB6) e `172.27.3.10` (procedures SQL)
