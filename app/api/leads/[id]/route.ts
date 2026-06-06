import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import type { Lead } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const lead = getDb().prepare("SELECT * FROM leads WHERE id = ?").get(id) as Lead | undefined;
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(lead);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const db = getDb();
    if (!db.prepare("SELECT id FROM leads WHERE id = ?").get(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const allowed = [
      "first_name", "last_name", "email", "phone", "address",
      "city", "state", "zip", "roof_type", "damage_type", "notes",
      "status", "jobnimbus_contact_id", "jobnimbus_job_id", "assigned_rep",
      "doors_knocked", "latitude", "longitude", "territory",
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const setClauses = Object.keys(updates).map((k) => `${k} = @${k}`).join(", ");
    db.prepare(`UPDATE leads SET ${setClauses} WHERE id = @id`).run({ ...updates, id });

    const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as Lead;
    return NextResponse.json(lead);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const db = getDb();
    if (!db.prepare("SELECT id FROM leads WHERE id = ?").get(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    db.prepare("DELETE FROM leads WHERE id = ?").run(id);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
