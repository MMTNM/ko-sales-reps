import { NextRequest, NextResponse } from "next/server";
import { queryOne, queryRows } from "@/lib/db";
import { createContact, createJob } from "@/lib/jobnimbus";
import type { Lead } from "@/lib/types";
import { requireRequestUser } from "@/lib/auth";

function errStatus(err: unknown): number {
  if (err instanceof Error && err.message === "UNAUTHORIZED") return 401;
  if (err instanceof Error && err.message === "FORBIDDEN") return 403;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const leads = user.role === "owner"
      ? (status
          ? await queryRows<Lead>("SELECT * FROM leads WHERE status = $1 ORDER BY created_at DESC", [status])
          : await queryRows<Lead>("SELECT * FROM leads ORDER BY created_at DESC"))
      : (status
          ? await queryRows<Lead>("SELECT * FROM leads WHERE assigned_rep = $1 AND status = $2 ORDER BY created_at DESC", [user.display_name, status])
          : await queryRows<Lead>("SELECT * FROM leads WHERE assigned_rep = $1 ORDER BY created_at DESC", [user.display_name]));
    return NextResponse.json(leads);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: errStatus(err) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser(request);
    const body = await request.json();
    const {
      first_name, last_name, email, phone, address, city, state, zip,
      roof_type, damage_type, notes, status = "new", assigned_rep,
      latitude, longitude, territory,
    } = body;

    if (!first_name || !last_name) {
      return NextResponse.json({ error: "first_name and last_name are required" }, { status: 400 });
    }

    let jobnimbus_contact_id: string | null = null;
    let jobnimbus_job_id: string | null = null;

    if (process.env.JOBNIMBUS_API_KEY) {
      try {
        const jnContact = await createContact({
          first_name, last_name, email, phone,
          address_line1: address, city, state_text: state, zip,
          tags: ["Sales App Lead"],
        });
        jobnimbus_contact_id = jnContact.jnid ?? null;
        if (jobnimbus_contact_id) {
          const jnJob = await createJob({
            name: `${first_name} ${last_name} – ${roof_type ?? "Roof"}`,
            primary: jobnimbus_contact_id,
            description: notes ?? "",
            tags: ["Sales App"],
            work_type: roof_type ?? undefined,
          });
          jobnimbus_job_id = jnJob.jnid ?? null;
        }
      } catch (jnErr) {
        console.error("JobNimbus sync error:", jnErr);
      }
    }

    const lead = await queryOne<Lead>(
      `INSERT INTO leads
         (first_name, last_name, email, phone, address, city, state, zip,
          roof_type, damage_type, notes, status, jobnimbus_contact_id,
          jobnimbus_job_id, assigned_rep, latitude, longitude, territory)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        first_name,
        last_name,
        email ?? null,
        phone ?? null,
        address ?? null,
        city ?? null,
        state ?? null,
        zip ?? null,
        roof_type ?? null,
        damage_type ?? null,
        notes ?? null,
        status,
        jobnimbus_contact_id,
        jobnimbus_job_id,
        user.role === "owner" ? (assigned_rep ?? null) : user.display_name,
        latitude ?? null,
        longitude ?? null,
        territory ?? null,
      ]
    );

    if (!lead) {
      throw new Error("Failed to create lead");
    }
    return NextResponse.json(lead, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: errStatus(err) });
  }
}
