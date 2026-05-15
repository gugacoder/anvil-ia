---
name: playwright-session
description: "Lançar e reutilizar uma única instância persistente do Playwright (Chromium via CDP). Use quando: o usuário quer abrir um browser para testes visuais, interagir com páginas ao longo do tempo, tirar screenshots, ou qualquer tarefa que envolva browser automation."
---

# Playwright Session

Técnica para lançar **uma única instância** do Chromium e interagir com ela ao longo de toda a conversa.

## Conceito

O Chromium é lançado como **processo desatachado do SO** com `--remote-debugging-port`, usando o executável bundled do Playwright. Isso garante que:

- O browser **sobrevive** à saída do script de lançamento
- Múltiplos processos/agentes podem **conectar e desconectar** sem afetar o browser
- O estado (abas, cookies, localStorage) **persiste** entre conexões

A sessão é identificada por um **slug** definido pelo usuário. O arquivo de sessão fica em `.tmp/.playwright-{slug}` (JSON com `cdpUrl` e `pid`).

## Comportamento

### 1. Obtenha o slug

Se o usuário não informou o slug, **peça um**. O slug identifica a sessão e determina com qual instância interagir.

Exemplos de slug: `hub-test`, `portal-login`, `visual-qa`.

### 2. Verifique se a sessão já existe

Antes de lançar, verifique se `.tmp/.playwright-{slug}` existe e se o processo está vivo:

```js
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

function getSession(slug) {
  try {
    const session = JSON.parse(readFileSync(`.tmp/.playwright-${slug}`, 'utf-8'));
    // Verifica se o processo está vivo (Windows)
    execSync(`tasklist /FI "PID eq ${session.pid}" | findstr ${session.pid}`, { stdio: 'pipe' });
    return session; // sessão ativa
  } catch {
    return null; // não existe ou processo morto
  }
}
```

- **Sessão ativa** → conecte via CDP e interaja.
- **Sessão inexistente ou morta** → lance uma nova (passo 3).

### 3. Lance o Chromium (apenas se necessário)

```js
import { execSync, spawn } from 'child_process';
import { writeFileSync } from 'fs';

// Descobre o executável do Playwright
const executablePath = execSync(
  'node -e "const {chromium}=require(\'playwright\');console.log(chromium.executablePath())"',
  { encoding: 'utf-8' }
).trim();

// Escolhe uma porta livre (base 9222 + hash do slug para evitar conflitos)
const port = 9222 + Math.abs([...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0) % 1000);

const child = spawn(executablePath, [
  `--remote-debugging-port=${port}`,
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank',
], {
  detached: true,
  stdio: 'ignore',
});

child.unref();

const session = { cdpUrl: `http://localhost:${port}`, pid: child.pid };
writeFileSync(`.tmp/.playwright-${slug}`, JSON.stringify(session));
```

Aguarde ~2 segundos antes de conectar para o CDP estabilizar.

### 4. Conecte e interaja

```js
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(session.cdpUrl);
const context = browser.contexts()[0] || await browser.newContext();

// Abrir nova aba
const page = await context.newPage();
await page.goto('https://...');

// Ou reutilizar aba existente
const pages = context.pages();
const page = pages.find(p => p.url().includes('algum-critério')) || pages[0];
```

### 5. Desconecte sem matar

Ao terminar a interação, **nunca** chame `browser.close()`. Use `process.exit(0)` no script inline ou simplesmente deixe o script terminar. O browser continua rodando.

### 6. Encerre a sessão (apenas quando solicitado)

Se o usuário pedir para encerrar:

```js
import { readFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';

const session = JSON.parse(readFileSync(`.tmp/.playwright-${slug}`, 'utf-8'));
// Windows: taskkill pelo PID específico (NUNCA pelo nome do processo)
execSync(`taskkill /PID ${session.pid} /T /F`);
unlinkSync(`.tmp/.playwright-${slug}`);
```

## Regras

- **Um slug = uma instância.** Nunca lance dois browsers para o mesmo slug.
- **Slug é obrigatório.** Se o usuário não deu, peça.
- **Nunca mate processos pelo nome.** Use apenas o PID salvo no arquivo de sessão.
- **Porta por slug.** Use hash do slug para derivar a porta, evitando conflitos entre sessões simultâneas.
- **Arquivo de sessão em `.tmp/`.** Nunca salve fora de `.tmp/`.
- **`connectOverCDP`, não `connect`.** O CDP permite que o browser seja independente do processo Node.
