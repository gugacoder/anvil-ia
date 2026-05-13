// Lint the knowledge base for structural and semantic health.
//
// Usage:
//   node lint.js                    # all checks
//   node lint.js --structural-only  # skip LLM checks

import fs from "node:fs";
import path from "node:path";

import {
  AGENT_ROOT,
  ATLAS_DIR,
  EFFORT_DIR,
  EFFORT_OFF_DIR,
  EFFORT_ON_DIR,
  EFFORT_SLOW_DIR,
  KB_DIR,
  lintReportPath,
  nowIso,
  todayIso,
} from "./config.js";
import {
  countInboundLinks,
  extractWikilinks,
  fileHash,
  getArticleWordCount,
  listRawFiles,
  listWikiArticles,
  loadPrompt,
  loadState,
  readAllWikiContent,
  resolveWikiPath,
  saveState,
  wikiArticleExists,
} from "./utils.js";

function articleRel(article) {
  const parts = article.split(/[\\/]/);
  if (parts.includes("atlas")) {
    return path.relative(ATLAS_DIR, article).replace(/\\/g, "/");
  }
  return path.relative(EFFORT_DIR, article).replace(/\\/g, "/");
}

function checkBrokenLinks() {
  const issues = [];
  for (const article of listWikiArticles()) {
    const content = fs.readFileSync(article, "utf-8");
    const rel = articleRel(article);
    for (const link of extractWikilinks(content)) {
      if (link.startsWith("calendar/")) continue;
      if (!wikiArticleExists(link)) {
        issues.push({
          severity: "error",
          check: "broken_link",
          file: rel,
          detail: `Broken link: [[${link}]] - target does not exist`,
        });
      }
    }
  }
  return issues;
}

function checkOrphanPages() {
  const issues = [];
  for (const article of listWikiArticles()) {
    const rel = articleRel(article);
    const linkTarget = rel.replace(/\.md$/, "");
    if (countInboundLinks(linkTarget) === 0) {
      issues.push({
        severity: "warning",
        check: "orphan_page",
        file: rel,
        detail: `Orphan page: no other articles link to [[${linkTarget}]]`,
      });
    }
  }
  return issues;
}

function checkOrphanSources() {
  const state = loadState();
  const ingested = state.ingested || {};
  const issues = [];
  for (const logPath of listRawFiles()) {
    const name = path.basename(logPath);
    if (!(name in ingested)) {
      issues.push({
        severity: "warning",
        check: "orphan_source",
        file: `calendar/notes/${name}`,
        detail: `Uncompiled daily log: ${name} has not been ingested`,
      });
    }
  }
  return issues;
}

function checkStaleArticles() {
  const state = loadState();
  const ingested = state.ingested || {};
  const issues = [];
  for (const logPath of listRawFiles()) {
    const name = path.basename(logPath);
    if (name in ingested) {
      const stored = ingested[name].hash || "";
      const current = fileHash(logPath);
      if (stored !== current) {
        issues.push({
          severity: "warning",
          check: "stale_article",
          file: `calendar/notes/${name}`,
          detail: `Stale: ${name} has changed since last compilation`,
        });
      }
    }
  }
  return issues;
}

function checkMissingBacklinks() {
  const issues = [];
  for (const article of listWikiArticles()) {
    const content = fs.readFileSync(article, "utf-8");
    const rel = articleRel(article);
    const sourceLink = rel.replace(/\.md$/, "");

    for (const link of extractWikilinks(content)) {
      if (link.startsWith("calendar/")) continue;
      const targetPath = resolveWikiPath(link);
      if (targetPath !== null) {
        const targetContent = fs.readFileSync(targetPath, "utf-8");
        if (!targetContent.includes(`[[${sourceLink}]]`)) {
          issues.push({
            severity: "suggestion",
            check: "missing_backlink",
            file: rel,
            detail: `[[${sourceLink}]] links to [[${link}]] but not vice versa`,
            auto_fixable: true,
          });
        }
      }
    }
  }
  return issues;
}

function listEffortSlugs() {
  const slugs = new Set();
  for (const dir of [EFFORT_ON_DIR, EFFORT_SLOW_DIR, EFFORT_OFF_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        slugs.add(entry.name);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        slugs.add(entry.name.replace(/\.md$/, ""));
      }
    }
  }
  return slugs;
}

function listRecognizedSystems() {
  const systemsDir = path.join(AGENT_ROOT, ".systems");
  if (!fs.existsSync(systemsDir)) return new Set();
  const names = new Set();
  for (const entry of fs.readdirSync(systemsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "node_modules") continue;
    if (entry.name.startsWith(".")) continue;
    names.add(entry.name);
  }
  return names;
}

function checkXLayout() {
  const issues = [];
  const xDir = path.join(KB_DIR, "x");
  if (!fs.existsSync(xDir)) return issues;

  const allowedTopLevel = new Set(["files", "work", ...listRecognizedSystems()]);
  const effortSlugs = listEffortSlugs();
  const workDir = path.join(xDir, "work");

  for (const entry of fs.readdirSync(xDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const rel = `x/${entry.name}`;
    if (entry.isFile()) {
      issues.push({
        severity: "error",
        check: "x_loose_file",
        file: rel,
        detail: `Loose file in mind/x/: only files/, work/, and recognized systems may live as direct children`,
      });
      continue;
    }
    if (!allowedTopLevel.has(entry.name)) {
      issues.push({
        severity: "warning",
        check: "x_unknown_subfolder",
        file: rel,
        detail: `Unknown subfolder in mind/x/: "${entry.name}" is not files/, not work/, and does not match any recognized system in .systems/`,
      });
    }
  }

  if (fs.existsSync(workDir)) {
    for (const entry of fs.readdirSync(workDir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const rel = `x/work/${entry.name}`;
      if (entry.isFile()) {
        issues.push({
          severity: "error",
          check: "x_work_loose_file",
          file: rel,
          detail: `Loose file in mind/x/work/: only effort-paired subfolders allowed here`,
        });
        continue;
      }
      if (!effortSlugs.has(entry.name)) {
        issues.push({
          severity: "warning",
          check: "x_work_orphan",
          file: rel,
          detail: `Orphan work folder: no effort matches slug "${entry.name}" in effort/{on,slow,off}/`,
        });
      }
    }
  }

  if (fs.existsSync(EFFORT_ON_DIR)) {
    for (const entry of fs.readdirSync(EFFORT_ON_DIR, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      let slug;
      if (entry.isDirectory()) {
        slug = entry.name;
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        slug = entry.name.replace(/\.md$/, "");
      } else {
        continue;
      }
      const pairedPath = path.join(workDir, slug);
      if (!fs.existsSync(pairedPath)) {
        issues.push({
          severity: "suggestion",
          check: "x_work_missing_pair",
          file: `effort/on/${entry.name}`,
          detail: `Active effort has no paired mind/x/work/${slug}/ folder`,
        });
      }
    }
  }

  return issues;
}

function checkSparseArticles() {
  const issues = [];
  for (const article of listWikiArticles()) {
    const wc = getArticleWordCount(article);
    if (wc < 200) {
      const rel = articleRel(article);
      issues.push({
        severity: "suggestion",
        check: "sparse_article",
        file: rel,
        detail: `Sparse article: ${wc} words (minimum recommended: 200)`,
      });
    }
  }
  return issues;
}

async function checkContradictions() {
  const { query } = await import("@anthropic-ai/claude-agent-sdk");

  const wikiContent = readAllWikiContent();
  const prompt = loadPrompt("lint-contradictions.md", { wiki_content: wikiContent });

  let response = "";
  try {
    for await (const message of query({
      prompt,
      options: {
        cwd: AGENT_ROOT,
        allowedTools: [],
        maxTurns: 2,
      },
    })) {
      if (message.type === "assistant") {
        for (const block of message.message?.content || []) {
          if (block.type === "text") response += block.text;
        }
      }
    }
  } catch (e) {
    return [
      {
        severity: "error",
        check: "contradiction",
        file: "(system)",
        detail: `LLM check failed: ${e?.message || e}`,
      },
    ];
  }

  const issues = [];
  if (!response.includes("NO_ISSUES")) {
    for (const rawLine of response.trim().split("\n")) {
      const line = rawLine.trim();
      if (line.startsWith("CONTRADICTION:") || line.startsWith("INCONSISTENCY:")) {
        issues.push({
          severity: "warning",
          check: "contradiction",
          file: "(cross-article)",
          detail: line,
        });
      }
    }
  }
  return issues;
}

function generateReport(allIssues) {
  const errors = allIssues.filter((i) => i.severity === "error");
  const warnings = allIssues.filter((i) => i.severity === "warning");
  const suggestions = allIssues.filter((i) => i.severity === "suggestion");

  const lines = [
    `# Lint Report - ${todayIso()}`,
    "",
    `**Total issues:** ${allIssues.length}`,
    `- Errors: ${errors.length}`,
    `- Warnings: ${warnings.length}`,
    `- Suggestions: ${suggestions.length}`,
    "",
  ];

  for (const [label, issues, marker] of [
    ["Errors", errors, "x"],
    ["Warnings", warnings, "!"],
    ["Suggestions", suggestions, "?"],
  ]) {
    if (issues.length) {
      lines.push(`## ${label}`, "");
      for (const issue of issues) {
        const fixable = issue.auto_fixable ? " (auto-fixable)" : "";
        lines.push(`- **[${marker}]** \`${issue.file}\` - ${issue.detail}${fixable}`);
      }
      lines.push("");
    }
  }

  if (allIssues.length === 0) {
    lines.push("All checks passed. Knowledge base is healthy.", "");
  }

  return lines.join("\n");
}

async function main() {
  const structuralOnly = process.argv.includes("--structural-only");

  console.log("Running knowledge base lint checks...");
  const allIssues = [];

  const checks = [
    ["Broken links", checkBrokenLinks],
    ["Orphan pages", checkOrphanPages],
    ["Orphan sources", checkOrphanSources],
    ["Stale articles", checkStaleArticles],
    ["Missing backlinks", checkMissingBacklinks],
    ["Sparse articles", checkSparseArticles],
    ["x/ layout", checkXLayout],
  ];

  for (const [name, fn] of checks) {
    console.log(`  Checking: ${name}...`);
    const issues = fn();
    allIssues.push(...issues);
    console.log(`    Found ${issues.length} issue(s)`);
  }

  if (!structuralOnly) {
    console.log("  Checking: Contradictions (LLM)...");
    const issues = await checkContradictions();
    allIssues.push(...issues);
    console.log(`    Found ${issues.length} issue(s)`);
  } else {
    console.log("  Skipping: Contradictions (--structural-only)");
  }

  const report = generateReport(allIssues);
  const reportPath = lintReportPath();
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, "utf-8");
  console.log(`\nReport saved to: ${reportPath}`);

  const state = loadState();
  state.last_lint = nowIso();
  saveState(state);

  const errors = allIssues.filter((i) => i.severity === "error").length;
  const warnings = allIssues.filter((i) => i.severity === "warning").length;
  const suggestions = allIssues.filter((i) => i.severity === "suggestion").length;
  console.log(`\nResults: ${errors} errors, ${warnings} warnings, ${suggestions} suggestions`);

  if (errors > 0) {
    console.log("\nErrors found - knowledge base needs attention!");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
