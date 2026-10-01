export const STAGES = ["new", "qualified", "proposal", "won"] as const;
export const SOURCES = ["Website", "Telegram", "Referral", "API"] as const;

export type Stage = (typeof STAGES)[number];
export type Source = (typeof SOURCES)[number];

export type Lead = {
  id: string;
  name: string;
  company: string;
  source: Source;
  value: number;
  score: number;
  stage: Stage;
  nextAction: string;
};

export type NewLead = { name: string; company: string; source: Source; value: number };

export type ValidationResult =
  | { ok: true; value: NewLead }
  | { ok: false; errors: string[] };

const SOURCE_WEIGHT: Record<Source, number> = { Referral: 25, Website: 15, Telegram: 12, API: 8 };
const STAGE_WEIGHT: Record<Stage, number> = { new: 0, qualified: 15, proposal: 30, won: 40 };
const NEXT_ACTION: Record<Stage, string> = {
  new: "Qualify the lead within 24h",
  qualified: "Send a tailored proposal",
  proposal: "Follow up on the proposal",
  won: "Hand over to onboarding"
};

/** Deterministic lead score in 0..100 from deal size, source quality and pipeline stage. */
export function scoreLead(input: Pick<Lead, "value" | "source" | "stage">): number {
  const sizePoints = Math.min(30, Math.round(Math.log10(Math.max(input.value, 1)) * 7));
  const raw = 5 + sizePoints + SOURCE_WEIGHT[input.source] + STAGE_WEIGHT[input.stage];
  return Math.max(0, Math.min(100, raw));
}

export function nextActionFor(stage: Stage): string {
  return NEXT_ACTION[stage];
}

export function buildLead(id: string, stage: Stage, input: NewLead): Lead {
  return {
    id,
    stage,
    ...input,
    score: scoreLead({ value: input.value, source: input.source, stage }),
    nextAction: nextActionFor(stage)
  };
}

export function createLead(input: NewLead, id: string): Lead {
  return buildLead(id, "new", input);
}

export const SEED_LEADS: Lead[] = [
  buildLead("l_001", "proposal", { name: "Alex Morgan", company: "Northstar", source: "Referral", value: 7500 }),
  buildLead("l_002", "qualified", { name: "Marta Kowalska", company: "Brightwave", source: "Website", value: 3200 }),
  buildLead("l_003", "new", { name: "Игорь Соколов", company: "Волга Логистик", source: "Telegram", value: 5400 }),
  buildLead("l_004", "qualified", { name: "Daniel Okafor", company: "Lagos Fintech", source: "API", value: 12000 }),
  buildLead("l_005", "new", { name: "Елена Миронова", company: "Студия «Контур»", source: "Website", value: 1800 }),
  buildLead("l_006", "won", { name: "Sofia Rossi", company: "Verde Studio", source: "Referral", value: 9600 }),
  buildLead("l_007", "new", { name: "Tom Becker", company: "Becker & Sons", source: "Telegram", value: 800 })
];

export function validateCreateLead(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: ["Body must be a JSON object"] };
  }
  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const company = typeof data.company === "string" ? data.company.trim() : "";
  if (!name) errors.push("name is required");
  if (!company) errors.push("company is required");
  if (name.length > 120) errors.push("name is too long (max 120)");
  if (company.length > 120) errors.push("company is too long (max 120)");

  let source: Source = "API";
  if (data.source !== undefined) {
    if ((SOURCES as readonly unknown[]).includes(data.source)) source = data.source as Source;
    else errors.push(`source must be one of: ${SOURCES.join(", ")}`);
  }

  let value = 0;
  if (data.value !== undefined) {
    if (typeof data.value === "number" && Number.isFinite(data.value) && data.value >= 0) value = data.value;
    else errors.push("value must be a non-negative number");
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: { name, company, source, value } };
}

export type PipelineStats = {
  totalLeads: number;
  openValue: number;
  wonValue: number;
  avgScore: number;
  winRate: number;
  byStage: Record<Stage, number>;
};

export function computeStats(leads: Lead[]): PipelineStats {
  const byStage: Record<Stage, number> = { new: 0, qualified: 0, proposal: 0, won: 0 };
  let openValue = 0;
  let wonValue = 0;
  let scoreSum = 0;
  for (const lead of leads) {
    byStage[lead.stage] += 1;
    scoreSum += lead.score;
    if (lead.stage === "won") wonValue += lead.value;
    else openValue += lead.value;
  }
  const total = leads.length;
  return {
    totalLeads: total,
    openValue,
    wonValue,
    avgScore: total ? Math.round(scoreSum / total) : 0,
    winRate: total ? Math.round((byStage.won / total) * 100) : 0,
    byStage
  };
}

/** Rule-based sales brief. Deterministic on purpose: an LLM adapter can replace it later behind the same signature. */
export function salesBrief(leads: Lead[]): string {
  const open = leads.filter((l) => l.stage !== "won");
  if (open.length === 0) return "No open leads. Capture new leads to rebuild the pipeline.";
  const hottest = [...open].sort((a, b) => b.score - a.score || b.value - a.value)[0];
  const unqualified = open.filter((l) => l.stage === "new").length;
  const parts = [`Focus on ${hottest.name} (${hottest.company}) — score ${hottest.score}: ${hottest.nextAction.toLowerCase()}.`];
  if (unqualified > 0) parts.push(`${unqualified} lead${unqualified === 1 ? " is" : "s are"} still unqualified.`);
  return parts.join(" ");
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
