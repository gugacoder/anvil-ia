# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Director Gestão Empresarial** is a legacy enterprise resource planning (ERP) system built in Visual Basic 6, developed by Processa Sistemas. It targets Brazilian businesses with full fiscal compliance (NFe, CTe, SPED). The system is composed of 70+ independent VB6 projects covering domains like sales/billing, receivables, payables, payroll, warehouse management (WMS), fiscal, fixed assets, and more.

Version control uses **SVN (Subversion)**, not Git. The SVN binary is at `C:\Program Files (x86)\Subversion\bin\svn.exe`.

## Repository Structure

- **Fontes/** — Main VB6 source code (~4,700+ files: forms, modules, classes)
  - `Director.vbp` — Main launcher executable (v1.29.0)
  - `Director.Framework.vbg` — VB6 workspace grouping framework DLL/OCX projects
  - `Formularios/` — ~4,200+ UI forms (.frm)
  - `Modulos/` — ~169 shared modules (.bas) with core business logic
  - `Classes/` — Shared OOP classes (.cls) for NFe, web services, database, UI
  - `Especificos/` — Module-specific customizations organized by business domain
  - `Controles/` — Custom VB6 controls
  - `Crystal/` — Crystal Reports templates
  - `Dist/Libs/` — Compiled DLLs and OCXs output directory
- **Fontes_ASP/** — ASP web front-end (Painel de Controle Operacional)
- **SQL/** — Database scripts, stored procedures, and functions (SQL Server / T-SQL)
- **Scripts/** — ScriptPack modules (Xdb, Valide, Vortex3, Sped, CheckIn, Director)
- **Relatorios/** — Crystal Reports report files
- **RelatorioDinamico/** — Custom dynamic reporting engine (piRD)
- **Instalacao/** — Inno Setup installation package
- **Documentacao/** — Technical documentation
- **Setup/** — MSI/MSM setup projects for Director.Framework

## Architecture

### Module System

Each business module (Faturamento, Contas_Receber, Folha_Pagamento, WMS, etc.) is a separate .vbp project that compiles to its own .exe. Modules share code through:
- Common classes in `Fontes/Classes/`
- Common modules in `Fontes/Modulos/`
- The Director Framework DLLs/OCXs (`piDirector.dll`, `piDirector.ocx`, `piGrafico.dll`, `piFolhaPgto.dll`)

Entry point for each module: `Sub Main` in `Especificos/[Module]/Modulo_Main.bas` or `Modulo_Main.bas`.

### Framework (Director.Framework.vbg)

The framework workspace groups the shared component projects:
- `piDirectorOCX.vbp` (startup) — Custom UI controls
- `piDirectorDLL.vbp` — Core framework DLL
- `piGraficoDLL.vbp` — Charting components
- `piFolhaPgto.vbp` — Payroll-specific DLL

Framework must be compiled first. Output goes to `Fontes/Dist/Libs/`.

### Data Access

- ADO 2.8 via global `cnConexao` connection object (defined in `Modulos/Banco_Dados.bas`)
- SQL Server backend with stored procedures in `SQL/Procedures/`
- Configuration via `Director.ini` ([SERVIDOR] section for connection details)

### Key Shared Modules

- `Banco_Dados.bas` — Database connectivity and ADO wrappers
- `Erro.bas` — Centralized error handling
- `Relatorio.bas` — Report engine integration
- `Auditoria.bas` — Audit trail logging
- `Criptografia.bas` — Encryption utilities
- `Interface_WMS.bas` — WMS integration layer

### Fiscal Integration Classes

- `ExportacaoNFe.cls`, `TransmissaoNFe.cls`, `ConsultaNFe.cls`, `ProcessoNFe.cls` — NFe workflow
- SPED export in `Exportacao_Sintegra.bas`
- CTe handling via `piMdfe.dll`

### External Dependencies

- ADO 2.8, ADOX 2.6 — Database
- Crystal Reports 8.5 — Reporting
- MSXML 6.0 — XML processing (fiscal documents)
- GridEX 2.0 — Advanced data grids
- Custom DLLs: piVortex.dll, piDirector.dll, piGrafico.dll, piMdfe.dll

## Build Process

1. **Framework first**: Open `Fontes/Director.Framework.vbg` in VB6 IDE, compile all projects. Output goes to `Fontes/Dist/Libs/`.
2. **Individual modules**: Open the specific .vbp file (e.g., `Faturamento_AV.vbp`) in VB6 IDE → File → Make .exe.
3. **Installation package**: Copy compiled libs from `Fontes/Dist/Libs/` to `Fontes/Setup/Director.Framework/Dist/Libs/`, then build the MSI/MSM via `Setup/Director.Framework/Setup/Setup.sln`.
4. **Inno Setup**: Final installer built from `Instalacao/` using Inno Setup compiler.

Target installation path: `C:\Program Files (x86)\Director_GE\V1.029\`

## Working with This Codebase

- VB6 source files use Windows-1252 encoding (Portuguese characters). Some .md files also use this encoding.
- Conditional compilation flags control which module is active (e.g., `booFaturamento = 1` in .vbp files).
- Forms (.frm) are text-based but include binary sections (.frx) for embedded resources.
- No automated test framework — testing is manual via VB6 IDE debug mode.
- The ScriptPack modules under `Scripts/Modulos/` follow a trunk/tags versioning convention within SVN.

## Notas
- **Nao mexa em arquivos .frx**
- **Nao mude o encode do arquivo .frm alterado**
- **Ao efetuar getlock em um arquivo .frm efetuar também no arquivo .frm com mesmo nome.**

