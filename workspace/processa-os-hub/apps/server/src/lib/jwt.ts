import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-processa-os",
);

export interface UserClaims {
  sub: string; // username
  name: string;
  avatar: string; // initials
}

export async function signSession(claims: UserClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setSubject(claims.sub)
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifySession(
  token: string,
): Promise<UserClaims | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      sub: String(payload.sub),
      name: String(payload.name ?? payload.sub),
      avatar: String(payload.avatar ?? ""),
    };
  } catch {
    return null;
  }
}
