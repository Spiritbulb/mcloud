#!/usr/bin/env node
/**
 * Generates an Obsidian vault from this monorepo's source code.
 *
 * Apps (web, storefront, mobile): parsed via TypeDoc JSON output.
 * Packages (auth, config, db, themes, ui): parsed via TypeScript compiler API.
 *
 * Output: C:\Users\busie\obsidian\mcloud\
 * Run:    npm run obsidian
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ts = require('typescript');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..');
const VAULT_DIR = 'C:\\Users\\busie\\obsidian\\mcloud';

const APPS = [
  {
    name: '@mcloud/web',
    dir: 'apps/web',
    // TypeDoc entry dirs (relative to app dir)
    entries: ['app', 'components', 'lib', 'contexts', 'hooks', 'scripts', 'src'],
    description: 'Next.js main app — merchant dashboard, billing, auth',
  },
  {
    name: '@mcloud/storefront',
    dir: 'apps/storefront',
    entries: ['app', 'components', 'lib', 'contexts'],
    description: 'Public-facing storefront for white-label tenants',
  },
  {
    name: '@mcloud/mobile',
    dir: 'apps/mobile',
    entries: ['app', 'src'],
    description: 'Expo merchant app — thin client over /api/mobile/*',
  },
];

const PACKAGES = [
  { name: '@mcloud/config', dir: 'packages/config', description: 'Shared config and environment variables (leaf)' },
  { name: '@mcloud/db', dir: 'packages/db', description: 'Supabase client and generated types' },
  { name: '@mcloud/auth', dir: 'packages/auth', description: 'Auth abstraction layer (WorkOS adapter)' },
  { name: '@mcloud/ui', dir: 'packages/ui', description: 'Shared React component library' },
  { name: '@mcloud/themes', dir: 'packages/themes', description: 'Theme tokens and CSS variables' },
];

// Internal workspace dependency map (from package.json analysis)
const PACKAGE_DEPS = {
  '@mcloud/web': ['@mcloud/auth', '@mcloud/db', '@mcloud/themes', '@mcloud/ui', '@mcloud/config'],
  '@mcloud/storefront': ['@mcloud/db', '@mcloud/themes', '@mcloud/ui', '@mcloud/config'],
  '@mcloud/mobile': [],
  '@mcloud/auth': ['@mcloud/db', '@mcloud/config'],
  '@mcloud/db': ['@mcloud/config'],
  '@mcloud/themes': ['@mcloud/ui', '@mcloud/config'],
  '@mcloud/ui': ['@mcloud/config'],
  '@mcloud/config': [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(pkgName) {
  // @mcloud/web → mcloud-web
  return pkgName.replace('@', '').replace('/', '-');
}

function vaultPath(...parts) {
  return path.join(VAULT_DIR, ...parts);
}

function wikilink(relVaultPath) {
  // Strip .md extension for wikilinks
  return `[[${relVaultPath.replace(/\.md$/, '')}]]`;
}

function pkgNodePath(pkgName) {
  // e.g. packages/mcloud-auth.md  or  apps/mcloud-web.md
  const slug = slugify(pkgName);
  const isApp = pkgName.includes('/web') || pkgName.includes('/storefront') || pkgName.includes('/mobile');
  return isApp ? `apps/${slug}.md` : `packages/${slug}.md`;
}

function fileNodePath(repoRelFilePath) {
  // apps/web/lib/auth/session.ts → apps-web/lib/auth/session.md
  const noExt = repoRelFilePath.replace(/\.(ts|tsx|js|jsx)$/, '');
  const parts = noExt.split('/');
  // Merge first two segments with dash (apps/web → apps-web)
  if (parts.length >= 2) {
    parts.splice(0, 2, `${parts[0]}-${parts[1]}`);
  }
  return parts.join('/') + '.md';
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function write(filePath, content) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
}

// ---------------------------------------------------------------------------
// Reverse index: file → files that import it
// ---------------------------------------------------------------------------

class ReverseIndex {
  constructor() {
    this.map = new Map(); // repoRelPath → Set<repoRelPath>
  }

  add(importerPath, importeePath) {
    if (!this.map.has(importeePath)) this.map.set(importeePath, new Set());
    this.map.get(importeePath).add(importerPath);
  }

  get(importeePath) {
    return [...(this.map.get(importeePath) || [])];
  }
}

const reverseIndex = new ReverseIndex();

// ---------------------------------------------------------------------------
// TypeDoc parsing (apps)
// ---------------------------------------------------------------------------

function runTypedoc(app) {
  const appAbsDir = path.join(REPO_ROOT, app.dir);
  const outFile = path.join(appAbsDir, '_typedoc-tmp.json');

  // Filter entries to only those that exist
  const existingEntries = app.entries.filter(e => fs.existsSync(path.join(appAbsDir, e)));
  if (existingEntries.length === 0) {
    console.warn(`  [warn] no entry dirs found for ${app.name}, skipping TypeDoc`);
    return null;
  }

  const entryArgs = existingEntries.join(' ');
  const cmd = `npx typedoc --json "${outFile}" --skipErrorChecking --entryPointStrategy expand ${entryArgs}`;

  console.log(`  running typedoc for ${app.name}...`);
  try {
    execSync(cmd, { cwd: appAbsDir, stdio: 'pipe' });
  } catch (e) {
    console.warn(`  [warn] typedoc failed for ${app.name}: ${e.message.slice(0, 200)}`);
    return null;
  }

  if (!fs.existsSync(outFile)) return null;

  let json;
  try {
    json = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  } catch {
    return null;
  } finally {
    fs.unlinkSync(outFile);
  }

  return json;
}

function extractJsdoc(comment) {
  if (!comment) return '';
  if (typeof comment === 'string') return comment.trim();
  // TypeDoc v0.25+ uses { summary: [{text}], blockTags: [] }
  if (comment.summary) {
    return comment.summary.map(p => p.text || '').join('').trim();
  }
  return '';
}

function parseTypedocJson(json, app) {
  /** @type {Map<string, {exports: {name:string,doc:string}[], imports: string[], repoRelPath: string}>} */
  const fileNodes = new Map();

  if (!json || !json.children) return fileNodes;

  function walk(node) {
    if (!node) return;

    // A "module" or "file" node in TypeDoc has a sources array
    if (node.kindString === 'Module' || node.kindString === 'Project') {
      if (node.children) node.children.forEach(walk);
      return;
    }

    // Find the source file for this declaration
    const source = node.sources && node.sources[0];
    if (!source) {
      if (node.children) node.children.forEach(walk);
      return;
    }

    const absFile = source.fileName;
    // Normalize to repo-relative path
    const repoRel = absFile.startsWith(REPO_ROOT.replace(/\\/g, '/'))
      ? absFile.slice(REPO_ROOT.replace(/\\/g, '/').length + 1)
      : path.join(app.dir, absFile).replace(/\\/g, '/');

    // Skip node_modules and .next
    if (repoRel.includes('node_modules') || repoRel.includes('.next') || repoRel.includes('.expo')) return;

    if (!fileNodes.has(repoRel)) {
      fileNodes.set(repoRel, { exports: [], imports: [], repoRelPath: repoRel });
    }

    const fileNode = fileNodes.get(repoRel);

    // Record export
    if (node.name && node.kindString && node.kindString !== 'Module') {
      const doc = extractJsdoc(node.comment);
      fileNode.exports.push({ name: node.name, doc });
    }

    if (node.children) node.children.forEach(walk);
  }

  // TypeDoc top-level children are file modules
  if (json.children) {
    json.children.forEach(fileModule => {
      const source = fileModule.sources && fileModule.sources[0];
      if (!source) return;

      const rawFileName = source.fileName.replace(/\\/g, '/');
      const repoRoot = REPO_ROOT.replace(/\\/g, '/');
      let repoRel;

      if (rawFileName.startsWith(repoRoot)) {
        // Absolute path starting with repo root
        repoRel = rawFileName.slice(repoRoot.length + 1);
      } else if (/^[a-zA-Z]:\//.test(rawFileName)) {
        // Some other absolute path — skip
        return;
      } else if (rawFileName.startsWith(app.dir + '/')) {
        // Already repo-relative (e.g. "apps/web/lib/auth.ts")
        repoRel = rawFileName;
      } else if (source.url) {
        // Extract repo-relative path from GitHub URL:
        // https://github.com/org/repo/blob/<sha>/apps/web/app/layout.tsx#L1
        const urlMatch = source.url.match(/\/blob\/[^/]+\/(.+?)(?:#|$)/);
        if (urlMatch) {
          repoRel = urlMatch[1];
        } else {
          repoRel = `${app.dir}/${rawFileName}`;
        }
      } else {
        // Relative to app dir
        repoRel = `${app.dir}/${rawFileName}`;
      }

      if (repoRel.includes('node_modules') || repoRel.includes('.next') || repoRel.includes('.expo')) return;

      if (!fileNodes.has(repoRel)) {
        fileNodes.set(repoRel, { exports: [], imports: [], repoRelPath: repoRel });
      }

      const fileNode = fileNodes.get(repoRel);

      if (fileModule.children) {
        fileModule.children.forEach(child => {
          if (child.name && child.kindString) {
            const doc = extractJsdoc(child.comment);
            fileNode.exports.push({ name: child.name, doc });
          }
        });
      }
    });
  }

  // Now extract imports by reading the actual source files with TS compiler API
  for (const [repoRel, node] of fileNodes) {
    const absPath = path.join(REPO_ROOT, repoRel);
    if (!fs.existsSync(absPath)) continue;
    const imports = extractImports(absPath, repoRel, app.dir);
    node.imports = imports;
  }

  return fileNodes;
}

// ---------------------------------------------------------------------------
// TypeScript compiler API parsing (packages + import extraction)
// ---------------------------------------------------------------------------

function extractImports(absFilePath, repoRelPath, packageDir) {
  let src;
  try {
    src = fs.readFileSync(absFilePath, 'utf8');
  } catch {
    return [];
  }

  const sourceFile = ts.createSourceFile(
    absFilePath,
    src,
    ts.ScriptTarget.Latest,
    true
  );

  const imports = [];
  const appAbsDir = path.join(REPO_ROOT, packageDir);

  ts.forEachChild(sourceFile, node => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const spec = node.moduleSpecifier.text;

      if (spec.startsWith('@mcloud/')) {
        // Workspace import
        imports.push({ type: 'workspace', spec });
        // Register in reverse index
        const importeeRepoRel = resolveWorkspaceImport(spec);
        if (importeeRepoRel) reverseIndex.add(repoRelPath, importeeRepoRel);
      } else if (spec.startsWith('.')) {
        // Relative import — resolve to repo-relative path
        const absImportDir = path.dirname(absFilePath);
        const resolved = resolveRelativeImport(absImportDir, spec);
        if (resolved) {
          const importeeRepoRel = resolved.replace(/\\/g, '/').replace(REPO_ROOT.replace(/\\/g, '/') + '/', '');
          imports.push({ type: 'internal', spec: importeeRepoRel });
          reverseIndex.add(repoRelPath, importeeRepoRel);
        }
      } else {
        // External npm import
        imports.push({ type: 'external', spec });
      }
    }
  });

  return imports;
}

function resolveWorkspaceImport(spec) {
  // @mcloud/auth → packages/auth/src/index.ts (best guess)
  const pkg = [...APPS, ...PACKAGES].find(p => p.name === spec);
  if (!pkg) return null;
  // Try common entry points
  for (const entry of ['src/index.ts', 'index.ts', 'src/index.tsx']) {
    const abs = path.join(REPO_ROOT, pkg.dir, entry);
    if (fs.existsSync(abs)) return `${pkg.dir}/${entry}`;
  }
  return `${pkg.dir}/index.ts`;
}

function resolveRelativeImport(fromDir, spec) {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
  const base = path.resolve(fromDir, spec);
  // Already has extension
  if (fs.existsSync(base)) return base;
  for (const ext of extensions) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function parsePackage(pkg) {
  /** @type {Map<string, {exports: {name:string,doc:string}[], imports: any[], repoRelPath: string}>} */
  const fileNodes = new Map();

  const pkgAbsDir = path.join(REPO_ROOT, pkg.dir);
  const srcDir = fs.existsSync(path.join(pkgAbsDir, 'src')) ? path.join(pkgAbsDir, 'src') : pkgAbsDir;

  collectTsFiles(srcDir).forEach(absFile => {
    const repoRel = absFile.replace(/\\/g, '/').replace(REPO_ROOT.replace(/\\/g, '/') + '/', '');
    if (repoRel.includes('node_modules') || repoRel.includes('.d.ts')) return;

    let src;
    try { src = fs.readFileSync(absFile, 'utf8'); } catch { return; }

    const sourceFile = ts.createSourceFile(absFile, src, ts.ScriptTarget.Latest, true);
    const exports = [];
    const imports = extractImports(absFile, repoRel, pkg.dir);

    ts.forEachChild(sourceFile, node => {
      // Exported declarations
      if (!hasExportModifier(node)) return;

      const jsdoc = getJsDoc(sourceFile, node);

      if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
        const name = node.name ? node.name.text : 'default';
        exports.push({ name, doc: jsdoc });
      } else if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(d => {
          if (ts.isIdentifier(d.name)) exports.push({ name: d.name.text, doc: jsdoc });
        });
      } else if (
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)
      ) {
        const name = node.name ? node.name.text : 'default';
        exports.push({ name, doc: jsdoc });
      }
    });

    fileNodes.set(repoRel, { exports, imports, repoRelPath: repoRel });
  });

  return fileNodes;
}

function collectTsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
      results.push(...collectTsFiles(full));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

function hasExportModifier(node) {
  return (
    node.modifiers &&
    node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function getJsDoc(sourceFile, node) {
  const ranges = ts.getLeadingCommentRanges(sourceFile.text, node.pos);
  if (!ranges) return '';
  for (const range of ranges) {
    const comment = sourceFile.text.slice(range.pos, range.end);
    if (comment.startsWith('/**')) {
      return comment
        .replace(/^\/\*\*/, '')
        .replace(/\*\/$/, '')
        .split('\n')
        .map(l => l.replace(/^\s*\*\s?/, ''))
        .join(' ')
        .trim();
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// Markdown emitters
// ---------------------------------------------------------------------------

function emitIndex(allPackages, allApps) {
  const appLines = allApps.map(a =>
    `- ${wikilink(pkgNodePath(a.name))} — ${a.description}`
  ).join('\n');

  const pkgLines = allPackages.map(p =>
    `- ${wikilink(pkgNodePath(p.name))} — ${p.description}`
  ).join('\n');

  const depGraph = [...allApps, ...allPackages].map(p => {
    const deps = PACKAGE_DEPS[p.name] || [];
    return `${p.name} → ${deps.length ? deps.join(', ') : '(none)'}`;
  }).join('\n');

  const content = `# mcloud — Architecture Overview

## Apps
${appLines}

## Packages
${pkgLines}

## Dependency Graph
\`\`\`
${depGraph}
\`\`\`
`;

  write(vaultPath('_index.md'), content);
}

function emitPackageNode(pkg, fileNodes) {
  const deps = PACKAGE_DEPS[pkg.name] || [];
  const depLines = deps.map(d => `- ${wikilink(pkgNodePath(d))}`).join('\n') || '- (none)';

  const fileLines = [...fileNodes.keys()]
    .sort()
    .map(repoRel => `- ${wikilink(fileNodePath(repoRel))}`)
    .join('\n') || '- (no files found)';

  const content = `---
name: "${pkg.name}"
type: package
workspace: ${pkg.dir}
---

${pkg.description}

## Workspace Dependencies
${depLines}

## Files
${fileLines}
`;

  write(vaultPath(pkgNodePath(pkg.name)), content);
}

function emitFileNode(repoRel, node) {
  const { exports, imports, repoRelPath } = node;

  const exportLines = exports.length
    ? exports.map(e => `- \`${e.name}\`${e.doc ? ` — ${e.doc}` : ''}`).join('\n')
    : '- (no exports detected)';

  const internalImports = imports.filter(i => i.type === 'internal');
  const wsImports = imports.filter(i => i.type === 'workspace');
  const extImports = imports.filter(i => i.type === 'external');

  const depLines = [
    ...internalImports.map(i => `- ${wikilink(fileNodePath(i.spec))} (internal)`),
    ...wsImports.map(i => `- ${wikilink(pkgNodePath(i.spec))} (workspace)`),
    ...extImports.slice(0, 10).map(i => `- \`${i.spec}\` (external)`),
  ].join('\n') || '- (none)';

  const importedBy = reverseIndex.get(repoRelPath);
  const importedByLines = importedBy.length
    ? importedBy.map(r => `- ${wikilink(fileNodePath(r))}`).join('\n')
    : '- (none)';

  const content = `---
path: "${repoRelPath}"
type: file
---

## Exports
${exportLines}

## Dependencies
${depLines}

## Imported by
${importedByLines}
`;

  write(vaultPath(fileNodePath(repoRel)), content);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Cleaning vault...');
  if (fs.existsSync(VAULT_DIR)) fs.rmSync(VAULT_DIR, { recursive: true, force: true });
  fs.mkdirSync(VAULT_DIR, { recursive: true });

  const allFileNodesByPkg = new Map();

  // --- Parse apps via TypeDoc ---
  console.log('\nParsing apps via TypeDoc...');
  for (const app of APPS) {
    console.log(`\n[${app.name}]`);
    const json = runTypedoc(app);
    const fileNodes = json ? parseTypedocJson(json, app) : new Map();
    console.log(`  → ${fileNodes.size} file nodes`);
    allFileNodesByPkg.set(app.name, { pkg: app, fileNodes });
  }

  // --- Parse packages via TS compiler API ---
  console.log('\nParsing packages via TS compiler API...');
  for (const pkg of PACKAGES) {
    console.log(`\n[${pkg.name}]`);
    const fileNodes = parsePackage(pkg);
    console.log(`  → ${fileNodes.size} file nodes`);
    allFileNodesByPkg.set(pkg.name, { pkg, fileNodes });
  }

  // --- Emit vault ---
  console.log('\nEmitting vault...');

  emitIndex(PACKAGES, APPS);

  for (const [, { pkg, fileNodes }] of allFileNodesByPkg) {
    emitPackageNode(pkg, fileNodes);
    for (const [repoRel, node] of fileNodes) {
      emitFileNode(repoRel, node);
    }
  }

  // Count output
  let total = 0;
  function countFiles(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) countFiles(path.join(dir, e.name));
      else total++;
    }
  }
  countFiles(VAULT_DIR);

  console.log(`\nDone. ${total} files written to ${VAULT_DIR}`);
}

main().catch(e => { console.error(e); process.exit(1); });
