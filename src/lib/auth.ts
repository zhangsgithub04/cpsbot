import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { ObjectId, WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const scrypt = promisify(scryptCallback);

const SESSION_COOKIE = "clarifybot_session";
const SESSION_DAYS = 7;

export type PublicUser = {
  id: string;
  email: string;
  createdAt: string;
};

type UserDoc = {
  email: string;
  passwordHash: string;
  createdAt: Date;
};

type UserRecord = WithId<UserDoc>;

type SessionRecord = {
  _id?: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const db = await getDb();
  return db.collection<UserDoc>("users").findOne({ email: normalizeEmail(email) });
}

export async function createUser(email: string, password: string): Promise<UserRecord> {
  const db = await getDb();
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const newUser: UserDoc = {
    email: normalizeEmail(email),
    passwordHash,
    createdAt: now,
  };

  const insertResult = await db.collection<UserDoc>("users").insertOne(newUser);

  return {
    _id: insertResult.insertedId,
    email: normalizeEmail(email),
    passwordHash,
    createdAt: now,
  };
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user._id.toHexString(),
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function createSession(userId: ObjectId): Promise<string> {
  const db = await getDb();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  const session: SessionRecord = {
    userId,
    tokenHash,
    createdAt,
    expiresAt,
  };

  await db.collection<SessionRecord>("sessions").insertOne(session);
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const db = await getDb();
  await db.collection<SessionRecord>("sessions").deleteOne({ tokenHash: hashSessionToken(token) });
}

export async function getAuthedUser(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const now = new Date();

  const session = await db.collection<SessionRecord>("sessions").findOne({
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: now },
  });

  if (!session) return null;

  const user = await db.collection<UserDoc>("users").findOne({ _id: session.userId });
  return user;
}
