import { Response } from 'express';

const ACCESS_COOKIE = 'chatin_access_token';
const REFRESH_COOKIE = 'chatin_refresh_token';

type AuthCookieOptions = {
  production: boolean;
};

function baseCookieOptions({ production }: AuthCookieOptions) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function setAuthCookies(response: Response, tokens: { accessToken: string; refreshToken: string }, options: AuthCookieOptions) {
  response.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(options),
    maxAge: 15 * 60 * 1000,
  });
  response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(options),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(response: Response, options: AuthCookieOptions) {
  response.clearCookie(ACCESS_COOKIE, baseCookieOptions(options));
  response.clearCookie(REFRESH_COOKIE, baseCookieOptions(options));
}

export function readCookie(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function readAccessCookie(cookieHeader: string | undefined) {
  return readCookie(cookieHeader, ACCESS_COOKIE);
}

export function readRefreshCookie(cookieHeader: string | undefined) {
  return readCookie(cookieHeader, REFRESH_COOKIE);
}
