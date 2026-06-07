import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne, queryRows } from "@/lib/db";
import type { AppUser, UserRole } from "@/lib/types";

const SESSION_COOKIE = "ko_session";
const SESSION_TTL_DAYS = 14;

function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(storedHash, "hex"));
}

function createSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function toAppUser(row: {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
}): AppUser {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
  };
}

export async function ensureBootstrapOwner(): Promise<void> {
  if (!hasDatabaseUrl()) return;
  const username = process.env.KO_OWNER_USERNAME;
  const password = process.env.KO_OWNER_PASSWORD;
  const displayName = process.env.KO_OWNER_DISPLAY_NAME ?? "KO Owner";

  if (!username || !password) {
    return;
  }

  await execute(
    `INSERT INTO users (username, display_name, role, password_hash)
     VALUES ($1, $2, 'owner', $3)
     ON CONFLICT (username)
     DO UPDATE SET
       display_name = EXCLUDED.display_name,
       role = 'owner',
       password_hash = EXCLUDED.password_hash`,
    [username, displayName, hashPassword(password)]
  );
}

export async function authenticateUser(username: string, password: string): Promise<AppUser | null> {
  if (!hasDatabaseUrl()) return null;
  const row = await queryOne<{
    id: number;
    username: string;
    display_name: string;
    role: UserRole;
    password_hash: string;
  }>(
    "SELECT id, username, display_name, role, password_hash FROM users WHERE username = $1",
    [username]
  );

  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;

  return toAppUser(row);
}

export async function issueSession(userId: number): Promise<string> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is required");
  }
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);

  await execute("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
    userId,
    tokenHash,
    expires.toISOString(),
  ]);

  return token;
}

export async function clearSessionByToken(token: string): Promise<void> {
  if (!hasDatabaseUrl()) return;
  await execute("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getUserFromSessionToken(token: string | null | undefined): Promise<AppUser | null> {
  if (!token || !hasDatabaseUrl()) return null;

  const row = await queryOne<{ id: number; username: string; display_name: string; role: UserRole }>(
    `SELECT u.id, u.username, u.display_name, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(token)]
  );

  return row ? toAppUser(row) : null;
}

export async function getOptionalPageUser(): Promise<AppUser | null> {
  await ensureBootstrapOwner();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return await getUserFromSessionToken(token);
}

export async function requirePageUser(): Promise<AppUser> {
  const user = await getOptionalPageUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOwnerPageUser(): Promise<AppUser> {
  const user = await requirePageUser();
  if (user.role !== "owner") redirect("/");
  return user;
}

export async function getRequestUser(request: NextRequest): Promise<AppUser | null> {
  await ensureBootstrapOwner();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return await getUserFromSessionToken(token);
}

export async function requireRequestUser(request: NextRequest): Promise<AppUser> {
  const user = await getRequestUser(request);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireOwnerRequestUser(request: NextRequest): Promise<AppUser> {
  const user = await requireRequestUser(request);
  if (user.role !== "owner") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function createUser(input: {
  username: string;
  displayName: string;
  role: UserRole;
  password: string;
}): Promise<AppUser> {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is required");
  }
  const user = await queryOne<{ id: number; username: string; display_name: string; role: UserRole }>(
    `INSERT INTO users (username, display_name, role, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, display_name, role`,
    [input.username, input.displayName, input.role, hashPassword(input.password)]
  );

  if (!user) {
    throw new Error("Unable to create user");
  }

  return toAppUser(user);
}

export async function listUsers(): Promise<AppUser[]> {
  if (!hasDatabaseUrl()) return [];
  const rows = await queryRows<{ id: number; username: string; display_name: string; role: UserRole }>(
    "SELECT id, username, display_name, role FROM users ORDER BY role DESC, display_name ASC"
  );

  return rows.map(toAppUser);
}

export function canAccessLead(user: AppUser, assignedRep: string | null): boolean {
  if (user.role === "owner") return true;
  return Boolean(assignedRep) && assignedRep === user.display_name;
}
