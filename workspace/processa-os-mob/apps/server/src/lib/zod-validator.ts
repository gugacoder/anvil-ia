// =============================================================================
// zValidator — middleware Hono pra validar request body com zod.
// Implementado direto aqui porque @hono/zod-validator hoje (v0.4) so casa com
// zod 3 e usamos zod 4 cross-stack.
//
// Uso:
//   .post("/login", zValidator("json", LoginBodySchema), async (c) => {
//     const body = c.req.valid("json"); // tipo inferido do schema
//     ...
//   });
//
// Erro retorna 400 com JSON { ok: false, error: "validation", issues }.
// =============================================================================

import type { Context, MiddlewareHandler } from "hono";
import type { z, ZodType } from "zod";

type ValidTarget = "json" | "query" | "param";

interface ValidationStore {
  json?: unknown;
  query?: unknown;
  param?: unknown;
}

function getStore(c: Context): ValidationStore {
  const existing = (c as unknown as { __zv?: ValidationStore }).__zv;
  if (existing) return existing;
  const store: ValidationStore = {};
  (c as unknown as { __zv?: ValidationStore }).__zv = store;
  return store;
}

export function zValidator<S extends ZodType>(
  target: ValidTarget,
  schema: S,
): MiddlewareHandler {
  return async (c, next) => {
    let raw: unknown;
    try {
      if (target === "json") raw = await c.req.json();
      else if (target === "query") raw = Object.fromEntries(new URL(c.req.url).searchParams);
      else raw = c.req.param();
    } catch {
      return c.json({ ok: false, error: "invalid-body", issues: ["JSON malformado"] }, 400);
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        { ok: false, error: "validation", issues: parsed.error.issues },
        400,
      );
    }
    getStore(c)[target] = parsed.data;
    await next();
  };
}

/** Recupera dado validado pelo middleware. Tipo inferido pelo schema correspondente. */
export function getValid<S extends ZodType>(c: Context, target: ValidTarget): z.infer<S> {
  const store = getStore(c);
  return store[target] as z.infer<S>;
}
