export type AuthTokenPayload = { sub: string; email: string };

export abstract class TokenService {
  abstract signAccessToken(payload: AuthTokenPayload): Promise<string>;
  abstract signRefreshToken(payload: AuthTokenPayload): Promise<string>;
  abstract verifyAccessToken(token: string): Promise<AuthTokenPayload>;
  abstract verifyRefreshToken(token: string): Promise<AuthTokenPayload>;
}
