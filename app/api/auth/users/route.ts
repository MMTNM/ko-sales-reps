import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers, requireOwnerRequestUser } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

function errStatus(err: unknown): number {
  if (err instanceof Error && err.message === "UNAUTHORIZED") return 401;
  if (err instanceof Error && err.message === "FORBIDDEN") return 403;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    requireOwnerRequestUser(request);
    return NextResponse.json(listUsers());
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: errStatus(err) });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireOwnerRequestUser(request);
    const body = await request.json();

    const username = String(body?.username ?? "").trim();
    const displayName = String(body?.display_name ?? "").trim();
    const password = String(body?.password ?? "");
    const role = (String(body?.role ?? "rep").trim() as UserRole);

    if (!username || !displayName || !password) {
      return NextResponse.json({ error: "username, display_name, and password are required" }, { status: 400 });
    }
    if (!["owner", "rep"].includes(role)) {
      return NextResponse.json({ error: "role must be owner or rep" }, { status: 400 });
    }

    const user = createUser({ username, displayName, password, role });
    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "That username already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: errStatus(err) });
  }
}
