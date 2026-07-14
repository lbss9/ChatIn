export type AuthTokenPayload = { sub: string; email: string };

export abstract class TokenService {
  public abstract signAccessToken(payload: AuthTokenPayload): Promise<string>;
  public abstract signRefreshToken(payload: AuthTokenPayload): Promise<string>;
  public abstract verifyAccessToken(token: string): Promise<AuthTokenPayload>;
  public abstract verifyRefreshToken(token: string): Promise<AuthTokenPayload>;
}
