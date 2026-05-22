import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { verifySession, type UserClaims } from "./jwt.js";

export const COOKIE_NAME = "so_session";

export async function getUser(c: Context): Promise<UserClaims | null> {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return null;
  return verifySession(token);
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  c.set("user" as never, user as never);
  return next();
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
