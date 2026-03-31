export interface AuthContext {
  userId: string;
  email: string;
}

export interface AuthVerifier {
  verify(authorizationHeader?: string): Promise<AuthContext>;
}

export class DevAuthVerifier implements AuthVerifier {
  constructor(
    private readonly userId: string,
    private readonly email: string
  ) {}

  async verify(): Promise<AuthContext> {
    return {
      userId: this.userId,
      email: this.email
    };
  }
}

