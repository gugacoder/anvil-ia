import { Hono } from "hono";
import { getUser } from "../lib/auth.js";

export const meRoute = new Hono();

meRoute.get("/", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ user: null }, 200);
  return c.json({ user });
});
