import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { signSession } from "../lib/jwt.js";
import { COOKIE_NAME, initials } from "../lib/auth.js";
import { zValidator, getValid } from "../lib/zod-validator.js";
import { LoginBodySchema } from "../schemas/index.js";

export const authRoutes = new Hono();

// POST /login — body validado por LoginBodySchema (username/password obrigatorios)
authRoutes.post("/login", zValidator("json", LoginBodySchema), async (c) => {
  const body = getValid<typeof LoginBodySchema>(c, "json");
  const username = body.username.trim();

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
