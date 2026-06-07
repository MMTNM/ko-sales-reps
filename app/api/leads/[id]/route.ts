import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import type { Lead } from "@/lib/types";
import { canAccessLead, requireRequestUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function errStatus(err: unknown): number {
  if (err instanceof Error && err.message === "UNAUTHORIZED") return 401;
  if (err instanceof Error && err.message === "FORBIDDEN") return 403;
  return 500;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = requireRequestUser(req);
    const { id } = await params;
    const lead = getDb().prepare("SELECT * FROM leads WHERE id = ?").get(id) as Lead | undefined;
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccessLead(user, lead.assigned_rep)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(lead);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: errStatus(err) });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = requireRequestUser(request);
    const { id } = await params;
    const db = getDb();
    const existingLead = db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as Lead | undefined;
    if (!existingLead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccessLead(user, existingLead.assigned_rep)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    if (user.role !== "owner") {
      updates.assigned_rep = user.display_name;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const setClauses = Object.keys(updates).map((k) => `${k} = @${k}`).join(", ");
    db.prepare(`UPDATE leads SET ${setClauses} WHERE id = @id`).run({ ...updates, id });

    const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as Lead;
    return NextResponse.json(lead);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: errStatus(err) });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = requireRequestUser(req);
    const { id } = await params;
    if (user.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const db = getDb();
    if (!db.prepare("SELECT id FROM leads WHERE id = ?").get(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    db.prepare("DELETE FROM leads WHERE id = ?").run(id);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: errStatus(err) });
  }
}
