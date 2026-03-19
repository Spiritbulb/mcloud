#!/usr/bin/env node
// scripts/release.mjs
//
// Generates/updates CHANGELOG.md from conventional commits.
// Usage:
//   node scripts/release.mjs           → auto patch bump (0.1.0 → 0.1.1)
//   node scripts/release.mjs minor     → minor bump  (0.1.0 → 0.2.0)
//   node scripts/release.mjs major     → major bump  (0.1.0 → 1.0.0)
//   node scripts/release.mjs 1.5.0     → explicit version
//
// Commit format:  type(scope): message
//   feat: add dark mode
//   fix(auth): handle token expiry
//   fix!: drop Node 16 support        ← BREAKING (! suffix)
//   BREAKING CHANGE: footer in body   ← also BREAKING

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split(".").map(Number);
  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function parseCommit(raw) {
  // Format: <hash> <subject>\n<body (optional)>
  const lines = raw.trim().split("\n");
  const firstLine = lines[0] ?? "";
  const [hash, ...rest] = firstLine.split(" ");
  const subject = rest.join(" ");
  const body = lines.slice(1).join("\n");

  // Detect breaking from "!" suffix or "BREAKING CHANGE" in body
  const breaking =
    subject.includes("!:") ||
    body.toLowerCase().includes("breaking change");

  // Parse type, scope, message
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?\!?:\s*(.+)$/);
  if (!match) return null;

  const [, type, scope, message] = match;
  return { hash: hash?.slice(0, 7), type, scope, message, breaking };
}

const TYPE_LABELS = {
  feat:     "Features",
  fix:      "Bug Fixes",
  perf:     "Performance",
  refactor: "Refactoring",
  docs:     "Documentation",
  chore:    "Maintenance",
  style:    "Maintenance",
  test:     "Maintenance",
  build:    "Maintenance",
  ci:       "Maintenance",
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const pkgPath = resolve("package.json");
const changelogPath = resolve("CHANGELOG.md");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const currentVersion = pkg.version ?? "0.0.0";

// Determine new version
const arg = process.argv[2] ?? "patch";
const newVersion = ["major", "minor", "patch"].includes(arg)
  ? bumpVersion(currentVersion, arg)
  : arg; // treat as explicit version string

// Find the last git tag to know what range to scan
let sinceTag = "";
try {
  sinceTag = run("git describe --tags --abbrev=0");
} catch {
  // No tags yet — use all commits
}

const range = sinceTag ? `${sinceTag}..HEAD` : "HEAD";
const logCmd = `git log ${range} --pretty=format:"%H %s%n%b---COMMIT_END---"`;

let rawLog = "";
try {
  rawLog = run(logCmd);
} catch {
  console.error("❌ git log failed. Are you inside a git repo?");
  process.exit(1);
}

// Parse commits
const grouped = {}; // label → items[]
let hasBreaking = false;

const commitBlocks = rawLog.split("---COMMIT_END---").filter(Boolean);
for (const block of commitBlocks) {
  const commit = parseCommit(block);
  if (!commit) continue;

  if (commit.breaking) {
    hasBreaking = true;
    if (!grouped["Breaking Changes"]) grouped["Breaking Changes"] = [];
    grouped["Breaking Changes"].push(
      `**${commit.message}**${commit.scope ? ` (${commit.scope})` : ""}`
    );
  }

  const label = TYPE_LABELS[commit.type];
  // Skip unlabelled types (merge commits etc) unless breaking
  if (!label && !commit.breaking) continue;
  if (label) {
    if (!grouped[label]) grouped[label] = [];
    const scope = commit.scope ? `**${commit.scope}:** ` : "";
    grouped[label].push(`${scope}${commit.message}`);
  }
}

// Build CHANGELOG entry
const date = new Date().toISOString().slice(0, 10);
const repoUrl = (() => {
  try {
    const remote = run("git remote get-url origin");
    return remote.replace(/\.git$/, "").replace(/^git@github\.com:/, "https://github.com/");
  } catch {
    return "";
  }
})();

const versionLink = repoUrl
  ? `[${newVersion}](${repoUrl}/compare/v${currentVersion}...v${newVersion})`
  : newVersion;

const ORDER = ["Breaking Changes", "Features", "Bug Fixes", "Performance", "Refactoring", "Documentation", "Maintenance"];

let newEntry = `## ${versionLink} (${date})\n\n`;

if (Object.keys(grouped).length === 0) {
  newEntry += "_No significant changes._\n";
} else {
  for (const label of ORDER) {
    if (!grouped[label]?.length) continue;
    newEntry += `### ${label}\n\n`;
    for (const item of grouped[label]) {
      newEntry += `* ${item}\n`;
    }
    newEntry += "\n";
  }
}

// Prepend to existing CHANGELOG or create new
let existing = "";
if (existsSync(changelogPath)) {
  existing = readFileSync(changelogPath, "utf8");
  // Strip the header line if present so we can re-add it
  if (existing.startsWith("# Changelog")) {
    existing = existing.replace(/^# Changelog\n+/, "");
  }
}

const header = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n`;
writeFileSync(changelogPath, header + newEntry + existing);

// Bump version in package.json
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// Git commit + tag
try {
  run(`git add CHANGELOG.md package.json`);
  run(`git commit -m "chore(release): ${newVersion}"`);
  run(`git tag v${newVersion}`);
  console.log(`\n✅ Released v${newVersion}`);
  console.log(`   CHANGELOG.md updated`);
  console.log(`   package.json bumped: ${currentVersion} → ${newVersion}`);
  console.log(`   git tag: v${newVersion}`);
  console.log(`\n   Push with: git push && git push --tags\n`);
} catch (e) {
  console.warn("\n⚠️  CHANGELOG.md and package.json updated, but git commit failed.");
  console.warn("   You may be in a dirty state — commit manually.\n");
}
