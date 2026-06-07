import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";
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
    const user = await requireRequestUser(req);
    const { id } = await params;
    const lead = await queryOne<Lead>("SELECT * FROM leads WHERE id = $1", [id]);
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
    const user = await requireRequestUser(request);
    const { id } = await params;
    const existingLead = await queryOne<Lead>("SELECT * FROM leads WHERE id = $1", [id]);
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

    const keys = Object.keys(updates);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => updates[k]);
    await execute(`UPDATE leads SET ${setClauses} WHERE id = $${keys.length + 1}`, [...values, id]);

    const lead = await queryOne<Lead>("SELECT * FROM leads WHERE id = $1", [id]);
    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: errStatus(err) });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireRequestUser(req);
    const { id } = await params;
    if (user.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const existing = await queryOne<{ id: number }>("SELECT id FROM leads WHERE id = $1", [id]);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await execute("DELETE FROM leads WHERE id = $1", [id]);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: errStatus(err) });
  }
}
