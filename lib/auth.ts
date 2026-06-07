import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import type { AppUser, UserRole } from "@/lib/types";

const SESSION_COOKIE = "ko_session";
const SESSION_TTL_DAYS = 14;

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

export function ensureBootstrapOwner(): void {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (count.count > 0) return;

  const username = process.env.KO_OWNER_USERNAME;
  const password = process.env.KO_OWNER_PASSWORD;
  const displayName = process.env.KO_OWNER_DISPLAY_NAME ?? "KO Owner";

  if (!username || !password) {
    return;
  }

  db.prepare(
    "INSERT INTO users (username, display_name, role, password_hash) VALUES (?, ?, 'owner', ?)"
  ).run(username, displayName, hashPassword(password));
}

export function authenticateUser(username: string, password: string): AppUser | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, username, display_name, role, password_hash FROM users WHERE username = ?")
    .get(username) as
    | { id: number; username: string; display_name: string; role: UserRole; password_hash: string }
    | undefined;

  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;

  return toAppUser(row);
}

export function issueSession(userId: number): string {
  const db = getDb();
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);

  db.prepare("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)")
    .run(userId, tokenHash, expires.toISOString());

  return token;
}

export function clearSessionByToken(token: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
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

export function getUserFromSessionToken(token: string | null | undefined): AppUser | null {
  if (!token) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND datetime(s.expires_at) > datetime('now')`
    )
    .get(hashToken(token)) as
    | { id: number; username: string; display_name: string; role: UserRole }
    | undefined;

  return row ? toAppUser(row) : null;
}

export async function getOptionalPageUser(): Promise<AppUser | null> {
  ensureBootstrapOwner();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return getUserFromSessionToken(token);
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

export function getRequestUser(request: NextRequest): AppUser | null {
  ensureBootstrapOwner();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return getUserFromSessionToken(token);
}

export function requireRequestUser(request: NextRequest): AppUser {
  const user = getRequestUser(request);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export function requireOwnerRequestUser(request: NextRequest): AppUser {
  const user = requireRequestUser(request);
  if (user.role !== "owner") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function createUser(input: {
  username: string;
  displayName: string;
  role: UserRole;
  password: string;
}): AppUser {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO users (username, display_name, role, password_hash) VALUES (?, ?, ?, ?)")
    .run(input.username, input.displayName, input.role, hashPassword(input.password));

  const user = db
    .prepare("SELECT id, username, display_name, role FROM users WHERE id = ?")
    .get(result.lastInsertRowid) as { id: number; username: string; display_name: string; role: UserRole };

  return toAppUser(user);
}

export function listUsers(): AppUser[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, username, display_name, role FROM users ORDER BY role DESC, display_name ASC")
    .all() as { id: number; username: string; display_name: string; role: UserRole }[];

  return rows.map(toAppUser);
}

export function canAccessLead(user: AppUser, assignedRep: string | null): boolean {
  if (user.role === "owner") return true;
  return Boolean(assignedRep) && assignedRep === user.display_name;
}
