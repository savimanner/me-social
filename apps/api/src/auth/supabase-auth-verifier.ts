import { createRemoteJWKSet, jwtVerify } from "jose";
import { DevAuthVerifier, type AuthContext, type AuthVerifier } from "./auth-verifier.js";

export class SupabaseAuthVerifier implements AuthVerifier {
  private readonly jwks;
  private readonly fallback: DevAuthVerifier;

  constructor(
    jwksUrl: string,
    private readonly issuer: string | undefined,
    private readonly audience: string | undefined,
    fallbackUserId: string,
    fallbackEmail: string
  ) {
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
    this.fallback = new DevAuthVerifier(fallbackUserId, fallbackEmail);
  }

  async verify(authorizationHeader?: string): Promise<AuthContext> {
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return this.fallback.verify();
    }

    const token = authorizationHeader.replace("Bearer ", "").trim();
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer || undefined,
      audience: this.audience || undefined
    });

    const userId = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : undefined;

    if (!userId || !email) {
      throw new Error("Invalid auth token");
    }

    return {
      userId,
      email
    };
  }
}

