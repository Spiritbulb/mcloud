#!/usr/bin/env node
// Migration runner for migrations/*.sql.
//
// Connects straight to the Supabase Postgres database and applies the migration files in
// filename order, so nothing has to be pasted into the SQL editor. It records each applied file
// in ops.schema_migrations, so a file runs once. Each file runs in its own transaction: if any
// statement fails, that whole file is rolled back and the run stops.
//
// Usage (from the repo root):
//   npm run db:status                         list applied and pending files
//   npm run db:migrate                        apply every pending file (asks first)
//   npm run db:migrate -- --only <file>       apply one pending file
//   npm run db:migrate -- --dry-run           show what would run, change nothing
//   npm run db:migrate -- --yes               skip the confirmation (for CI)
//   node scripts/migrate.mjs baseline [--skip a.sql,b.sql]
//                                             record files as already applied WITHOUT running
//                                             them (one-time setup for files applied by hand)
//
// Connection: DATABASE_URL, read from the environment or from a .env file in the repo root.
//   Supabase dashboard > Connect > "Session pooler" URI (port 5432), with the database password.
//   Optional DATABASE_CA_CERT = path to Supabase's CA certificate (Database settings > SSL) to
//   verify the server certificate; without it the connection is encrypted but not verified.
//
// A file that cannot run inside a transaction (e.g. CREATE INDEX CONCURRENTLY) can opt out with
// this line near the top. Keep such a file to one statement: Postgres still wraps several
// statements sent together in one implicit transaction.
//   -- migrate:no-transaction

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import os from "node:os";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "migrations");
const LOCK_ID = 727_100_105; // arbitrary constant: one runner at a time

// ---------------------------------------------------------------------------------------------
// Arguments and environment

const [command = "status", ...rest] = process.argv.slice(2);
const flags = parseFlags(rest);

function parseFlags(args) {
  const out = { yes: false, dryRun: false, only: null, skip: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--yes" || a === "-y") out.yes = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--only") out.only = args[++i];
    else if (a === "--skip")
      out.skip = (args[++i] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    else fail(`Unknown option: ${a}`);
  }
  return out;
}

function loadEnv() {
  const envFile = join(ROOT, ".env");
  if (!process.env.DATABASE_URL && existsSync(envFile)) {
    try {
      process.loadEnvFile(envFile);
    } catch (e) {
      fail(`Could not read .env: ${e.message}`);
    }
  }
  if (!process.env.DATABASE_URL) {
    fail(
      "DATABASE_URL is not set. Add it to .env in the repo root (see the top of scripts/migrate.mjs).",
    );
  }
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// Files

function migrationFiles() {
  if (!existsSync(MIGRATIONS_DIR))
    fail(`No migrations folder at ${MIGRATIONS_DIR}`);
  // Plain code-unit sort, not localeCompare: 20261023_x must run before 20261023b_y.
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
      return {
        name,
        sql,
        checksum: createHash("sha256")
          .update(sql.replace(/\r\n/g, "\n"))
          .digest("hex"),
        noTransaction: /^\s*--\s*migrate:no-transaction\b/im.test(sql),
      };
    });
}

// ---------------------------------------------------------------------------------------------
// Database

function connect() {
  const url = new URL(process.env.DATABASE_URL);
  // pg lets sslmode in the URL override the ssl option below, so drop it and set ssl here.
  url.searchParams.delete("sslmode");
  const ca = process.env.DATABASE_CA_CERT;
  const local =
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
    url.hostname.startsWith("/");
  const ssl =
    local && !ca
      ? false
      : ca
        ? { ca: readFileSync(ca, "utf8") }
        : { rejectUnauthorized: false };
  return new pg.Client({
    connectionString: url.toString(),
    ssl,
    application_name: "mcloud-migrate",
  });
}

function describeTarget() {
  const url = new URL(process.env.DATABASE_URL);
  // Supabase pooler users look like postgres.<project-ref>; direct hosts like db.<ref>.supabase.co.
  const ref =
    url.username.split(".")[1] ??
    url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1];
  return ref
    ? `Supabase project ${ref} (${url.hostname})`
    : `${url.hostname}${url.pathname}`;
}

async function ensureTable(client) {
  await client.query(`
    create schema if not exists ops;
    create table if not exists ops.schema_migrations (
      filename     text primary key,
      checksum     text not null,
      applied_at   timestamptz not null default now(),
      applied_by   text,
      execution_ms integer,
      baseline     boolean not null default false
    );
    revoke all on schema ops from public;
    revoke all on all tables in schema ops from public;
  `);
  // Supabase roles; absent on a plain Postgres, so ignore if missing.
  await client.query(`
    do $$ begin
      revoke all on schema ops from anon, authenticated;
      revoke all on all tables in schema ops from anon, authenticated;
    exception when undefined_object then null; end $$;
  `);
}

async function appliedMap(client) {
  const { rows } = await client.query(
    "select filename, checksum, applied_at, baseline from ops.schema_migrations",
  );
  return new Map(rows.map((r) => [r.filename, r]));
}

// ---------------------------------------------------------------------------------------------
// Commands

async function status(client, files) {
  const applied = await appliedMap(client);
  let pending = 0;
  console.log(`\nTarget: ${describeTarget()}\n`);
  for (const f of files) {
    const row = applied.get(f.name);
    if (!row) {
      pending++;
      console.log(`  pending   ${f.name}`);
      continue;
    }
    const how = row.baseline ? "baseline" : "applied ";
    const changed =
      row.checksum !== f.checksum
        ? "   ⚠ file changed since it was applied"
        : "";
    console.log(`  ${how}  ${f.name}${changed}`);
  }
  for (const name of applied.keys()) {
    if (!files.some((f) => f.name === name))
      console.log(
        `  missing   ${name}   ⚠ recorded as applied, file not found`,
      );
  }
  console.log(`\n${files.length - pending} applied, ${pending} pending.\n`);
}

async function up(client, files) {
  const applied = await appliedMap(client);
  let todo = files.filter((f) => !applied.has(f.name));
  if (flags.only) {
    const match = todo.find(
      (f) => f.name === flags.only || f.name === `${flags.only}.sql`,
    );
    if (!match)
      fail(
        `${flags.only} is not a pending migration (run "npm run db:status").`,
      );
    todo = [match];
  }

  for (const f of files) {
    const row = applied.get(f.name);
    if (row && row.checksum !== f.checksum)
      console.warn(`⚠ ${f.name} changed since it was applied (not re-run).`);
  }

  if (todo.length === 0) {
    console.log("\nNothing to apply. The database is up to date.\n");
    return;
  }

  console.log(`\nTarget: ${describeTarget()}`);
  console.log(
    `${flags.dryRun ? "Would apply" : "Will apply"} ${todo.length} migration(s), in this order:\n`,
  );
  for (const f of todo)
    console.log(`  ${f.name}${f.noTransaction ? "   (no transaction)" : ""}`);
  console.log("");
  if (flags.dryRun) return;
  if (!flags.yes && !(await confirm("Apply them now? (y/N) "))) {
    console.log("Cancelled. Nothing changed.\n");
    return;
  }

  for (const f of todo) {
    const started = Date.now();
    process.stdout.write(`→ ${f.name} ... `);
    try {
      if (!f.noTransaction) await client.query("begin");
      await client.query(f.sql);
      await client.query(
        "insert into ops.schema_migrations (filename, checksum, applied_by, execution_ms) values ($1, $2, $3, $4)",
        [f.name, f.checksum, os.userInfo().username, Date.now() - started],
      );
      if (!f.noTransaction) await client.query("commit");
      console.log(`done (${Date.now() - started} ms)`);
    } catch (e) {
      if (!f.noTransaction) await client.query("rollback").catch(() => {});
      console.log("FAILED");
      const where = e.position
        ? ` at line ${lineOf(f.sql, Number(e.position))}`
        : "";
      fail(
        `${f.name}${where}: ${e.message}` +
          (f.noTransaction
            ? "\n  This file ran without a transaction; statements before the error may have applied."
            : "\n  This file was rolled back; nothing from it was applied.") +
          "\n  Later migrations were not run.",
      );
    }
  }
  console.log(`\n✔ Applied ${todo.length} migration(s).\n`);
}

async function baseline(client, files) {
  const applied = await appliedMap(client);
  for (const s of flags.skip) {
    if (!files.some((f) => f.name === s || f.name === `${s}.sql`))
      fail(`--skip ${s}: no such file in migrations/`);
  }
  const skip = new Set(
    flags.skip.map((s) => (s.endsWith(".sql") ? s : `${s}.sql`)),
  );
  const todo = files.filter((f) => !applied.has(f.name) && !skip.has(f.name));
  if (todo.length === 0) {
    console.log("\nNothing to record.\n");
    return;
  }

  console.log(`\nTarget: ${describeTarget()}`);
  console.log(
    `Will record ${todo.length} file(s) as ALREADY APPLIED. Their SQL will NOT run:\n`,
  );
  for (const f of todo) console.log(`  ${f.name}`);
  if (skip.size)
    console.log(
      `\nLeft pending (will run on the next migrate): ${[...skip].join(", ")}`,
    );
  console.log("");
  if (flags.dryRun) return;
  if (!flags.yes && !(await confirm("Record them as applied? (y/N) "))) {
    console.log("Cancelled. Nothing changed.\n");
    return;
  }

  await client.query("begin");
  for (const f of todo) {
    await client.query(
      "insert into ops.schema_migrations (filename, checksum, applied_by, baseline) values ($1, $2, $3, true)",
      [f.name, f.checksum, os.userInfo().username],
    );
  }
  await client.query("commit");
  console.log(`✔ Recorded ${todo.length} file(s) as applied.\n`);
}

// ---------------------------------------------------------------------------------------------
// Helpers

function lineOf(sql, position) {
  return sql.slice(0, Math.max(0, position - 1)).split("\n").length;
}

async function confirm(question) {
  if (!process.stdin.isTTY)
    fail(
      "No terminal to confirm in. Re-run with --yes to apply without asking.",
    );
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

// ---------------------------------------------------------------------------------------------

const commands = { status, up, migrate: up, baseline };
if (!commands[command])
  fail(`Unknown command "${command}". Use: status, up, baseline.`);

loadEnv();
const files = migrationFiles();
const client = connect();
try {
  await client.connect();
} catch (e) {
  fail(`Could not connect to the database: ${e.message}`);
}
try {
  await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
  await ensureTable(client);
  await commands[command](client, files);
} finally {
  await client
    .query("select pg_advisory_unlock($1)", [LOCK_ID])
    .catch(() => {});
  await client.end();
}
