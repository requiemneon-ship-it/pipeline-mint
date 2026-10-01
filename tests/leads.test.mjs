import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SEED_LEADS, computeStats, createLead, salesBrief, scoreLead, validateCreateLead
} from "../src/lib/leads.ts";

test("scoreLead stays within 0..100 and rewards later stages", () => {
  const early = scoreLead({ value: 5000, source: "Website", stage: "new" });
  const late = scoreLead({ value: 5000, source: "Website", stage: "proposal" });
  assert.ok(late > early);
  assert.ok(scoreLead({ value: 1e12, source: "Referral", stage: "won" }) <= 100);
  assert.ok(scoreLead({ value: 0, source: "API", stage: "new" }) >= 0);
});

test("validateCreateLead accepts minimal valid input with defaults", () => {
  const r = validateCreateLead({ name: "  Alex ", company: "Northstar" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { name: "Alex", company: "Northstar", source: "API", value: 0 });
});

test("validateCreateLead reports every problem", () => {
  const r = validateCreateLead({ name: "", company: " ", source: "Fax", value: -5 });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 4);
});

test("validateCreateLead rejects non-objects", () => {
  for (const bad of [null, [], "x", 42]) assert.equal(validateCreateLead(bad).ok, false);
});

test("createLead starts in 'new' with derived score and next action", () => {
  const lead = createLead({ name: "A", company: "B", source: "Referral", value: 1000 }, "l_x");
  assert.equal(lead.stage, "new");
  assert.equal(lead.id, "l_x");
  assert.ok(lead.score > 0);
  assert.match(lead.nextAction, /Qualify/);
});

test("computeStats aggregates the seed dataset", () => {
  const s = computeStats(SEED_LEADS);
  assert.equal(s.totalLeads, SEED_LEADS.length);
  assert.equal(Object.values(s.byStage).reduce((a, b) => a + b, 0), SEED_LEADS.length);
  assert.equal(s.wonValue, 9600);
  assert.equal(computeStats([]).winRate, 0);
});

test("salesBrief handles empty and populated pipelines", () => {
  assert.match(salesBrief([]), /No open leads/);
  assert.match(salesBrief(SEED_LEADS), /Focus on/);
});
