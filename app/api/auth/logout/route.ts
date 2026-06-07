import { NextRequest, NextResponse } from "next/server";
import { clearSessionByToken, clearSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ko_session")?.value;
  if (token) clearSessionByToken(token);

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
