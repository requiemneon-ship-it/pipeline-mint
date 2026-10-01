// Applies supabase/migrations/0001_init.sql to a real PostgreSQL (PGlite, in-process WASM)
// and checks the tenant isolation and role rules enforced by RLS.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const A = "00000000-0000-0000-0000-00000000000a"; // workspace A
const B = "00000000-0000-0000-0000-00000000000b"; // workspace B
const ALICE = "10000000-0000-0000-0000-000000000001"; // admin of A
const MARK = "10000000-0000-0000-0000-000000000002"; // manager of A
const MIA = "10000000-0000-0000-0000-000000000003"; // member of A
const BOB = "10000000-0000-0000-0000-000000000004"; // admin of B

const migration = readFileSync(new URL("../supabase/migrations/0001_init.sql", import.meta.url), "utf8");
let db;

/** Run a callback as an authenticated user: RLS applies because the role is not the table owner. */
async function as(user, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}

before(async () => {
  db = new PGlite();
  // Minimal stand-in for Supabase's auth schema and roles.
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role authenticated;
  `);
  await db.exec(migration);
  await db.exec(`
    grant usage on schema auth, public to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    grant execute on all functions in schema public to authenticated;
    insert into auth.users (id) values ('${ALICE}'), ('${MARK}'), ('${MIA}'), ('${BOB}');
    insert into workspaces (id, name) values ('${A}', 'Acme'), ('${B}', 'Beta');
    insert into workspace_members (workspace_id, user_id, role) values
      ('${A}', '${ALICE}', 'admin'), ('${A}', '${MARK}', 'manager'),
      ('${A}', '${MIA}', 'member'),  ('${B}', '${BOB}', 'admin');
    insert into leads (workspace_id, name, company) values
      ('${A}', 'Lead A1', 'Acme Co'), ('${B}', 'Lead B1', 'Beta Co');
    insert into activities (workspace_id, kind) values ('${A}', 'lead.created');
    insert into webhook_endpoints (workspace_id, url, secret_hash) values ('${A}', 'https://example.com/hook', 'hash');
  `);
});

test("migration creates all tables with RLS enabled", async () => {
  const { rows } = await db.query(
    `select relname from pg_class where relkind = 'r' and relnamespace = 'public'::regnamespace and relrowsecurity order by relname`
  );
  assert.deepEqual(rows.map((r) => r.relname), [
    "activities", "leads", "tasks", "webhook_endpoints", "workspace_members", "workspaces"
  ]);
});

test("users only see leads of their own workspace", async () => {
  const alice = await as(ALICE, () => db.query("select name from leads"));
  assert.deepEqual(alice.rows.map((r) => r.name), ["Lead A1"]);
  const bob = await as(BOB, () => db.query("select name from leads"));
  assert.deepEqual(bob.rows.map((r) => r.name), ["Lead B1"]);
});

test("a user cannot insert a lead into another workspace", async () => {
  await assert.rejects(
    as(BOB, () => db.query(`insert into leads (workspace_id, name, company) values ('${A}', 'Intruder', 'X')`)),
    /row-level security/
  );
});

test("members can insert leads in their workspace", async () => {
  const r = await as(MIA, () => db.query(`insert into leads (workspace_id, name, company) values ('${A}', 'By member', 'X') returning id`));
  assert.equal(r.rows.length, 1);
});

test("only admin/manager can update leads; members update nothing", async () => {
  const member = await as(MIA, () => db.query(`update leads set stage = 'qualified' where workspace_id = '${A}'`));
  assert.equal(member.affectedRows, 0);
  const manager = await as(MARK, () => db.query(`update leads set stage = 'qualified' where name = 'Lead A1'`));
  assert.equal(manager.affectedRows, 1);
  const outsider = await as(BOB, () => db.query(`update leads set stage = 'won' where workspace_id = '${A}'`));
  assert.equal(outsider.affectedRows, 0);
});

test("only admins can delete leads", async () => {
  const manager = await as(MARK, () => db.query(`delete from leads where name = 'By member'`));
  assert.equal(manager.affectedRows, 0);
  const admin = await as(ALICE, () => db.query(`delete from leads where name = 'By member'`));
  assert.equal(admin.affectedRows, 1);
});

test("activities are append-only", async () => {
  await as(ALICE, () => db.query(`insert into activities (workspace_id, kind) values ('${A}', 'lead.updated')`));
  const upd = await as(ALICE, () => db.query(`update activities set kind = 'tampered'`));
  const del = await as(ALICE, () => db.query(`delete from activities`));
  assert.equal(upd.affectedRows, 0);
  assert.equal(del.affectedRows, 0);
});

test("webhook endpoints are visible to admins only", async () => {
  const admin = await as(ALICE, () => db.query("select id from webhook_endpoints"));
  const manager = await as(MARK, () => db.query("select id from webhook_endpoints"));
  const outsider = await as(BOB, () => db.query("select id from webhook_endpoints"));
  assert.equal(admin.rows.length, 1);
  assert.equal(manager.rows.length, 0);
  assert.equal(outsider.rows.length, 0);
});

test("anonymous users (no auth.uid) see nothing", async () => {
  await db.exec("set role authenticated; select set_config('request.jwt.claim.sub', '', false);");
  const r = await db.query("select count(*)::int as n from leads");
  await db.exec("reset role");
  assert.equal(r.rows[0].n, 0);
});

test("score and value constraints are enforced by the database", async () => {
  await assert.rejects(db.query(`insert into leads (workspace_id, name, company, score) values ('${A}', 'x', 'y', 101)`), /check/i);
  await assert.rejects(db.query(`insert into leads (workspace_id, name, company, value) values ('${A}', 'x', 'y', -1)`), /check/i);
});
