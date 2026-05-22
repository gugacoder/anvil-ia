import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { signSession } from "../lib/jwt.js";
import { COOKIE_NAME, initials } from "../lib/auth.js";

export const authRoutes = new Hono();

// POST /login — qualquer user/senha sao aceitos (prototipo)
authRoutes.post("/login", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  const username = (body.username ?? "").trim();
  const password = (body.password ?? "").trim();

  if (!username || !password) {
    return c.json({ error: "missing_credentials" }, 400);
  }

  const name = username
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
  const token = await signSession({
    sub: username,
    name,
    avatar: initials(name),
  });

  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return c.json({ ok: true, user: { sub: username, name, avatar: initials(name) } });
});

authRoutes.post("/logout", (c) => {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
  return c.json({ ok: true });
});
