import { NextResponse } from "next/server";
import { SEED_LEADS, createLead, validateCreateLead } from "../../../lib/leads";

// Milestone 1 is intentionally non-persistent: POST validates input and returns the created lead.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: SEED_LEADS });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errors: ["Body must be valid JSON"] }, { status: 400 });
  }

  const result = validateCreateLead(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });

  const lead = createLead(result.value, `l_${crypto.randomUUID().slice(0, 8)}`);
  return NextResponse.json({ data: lead }, { status: 201 });
}
