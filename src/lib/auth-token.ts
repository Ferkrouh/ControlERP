// Usado también por el middleware Edge: no importar Prisma, bcrypt ni módulos de Node.
import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import type { RolUsuario } from './types';

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('Configure JWT_SECRET en el entorno antes de iniciar ControlERP.');
if (process.env.NODE_ENV === 'production' && new TextEncoder().encode(secret).byteLength < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 bytes en producción.');
}
const key = new TextEncoder().encode(secret);
export const COOKIE_NAME = 'controlerp_session';
export interface TokenPayload {
  id: string; email: string; rol: RolUsuario; tenantId: string | null;
  [key: string]: unknown;
}
export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuer('controlerp')
    .setAudience('controlerp-app').setIssuedAt().setExpirationTime('7d').sign(key);
}
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'], issuer: 'controlerp', audience: 'controlerp-app' });
    return payload as unknown as TokenPayload;
  } catch { return null; }
}
