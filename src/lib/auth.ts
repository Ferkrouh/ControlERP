import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { RolUsuario, UserSession } from './types';

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'controlerp-super-secret-key-prod-2026-secure-jwt';
const key = new TextEncoder().encode(JWT_SECRET_KEY);
export const COOKIE_NAME = 'controlerp_session';

export interface TokenPayload {
  id: string;
  email: string;
  rol: RolUsuario;
  tenantId: string | null;
  [key: string]: any;
}

/**
 * Genera el hash seguro de una contraseña usando bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Compara una contraseña en texto plano contra un hash bcrypt.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  // Soporte de compatibilidad inicial si existiera un hash plano temporal
  if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$')) {
    return password === hash;
  }
  return await bcrypt.compare(password, hash);
}

/**
 * Crea un token firmado JWT con duración de 7 días.
 */
export async function signToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

/**
 * Verifica un token JWT y devuelve su payload.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Obtiene la sesión autenticada validada en el servidor a partir de la cookie HTTP-only.
 * Si se pasa `req`, revisa tanto la cookie del request como la del store de cookies.
 */
export async function getAuthSession(req?: NextRequest): Promise<UserSession | null> {
  try {
    let token: string | undefined;

    if (req) {
      token = req.cookies.get(COOKIE_NAME)?.value;
    }

    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    }

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return null;
    }

    // Buscamos el usuario en BD para asegurar que sigue activo y obtener datos frescos del tenant
    const user = await prisma.usuario.findUnique({
      where: { id: payload.id },
      include: { tenant: true },
    });

    if (!user || !user.activo) {
      return null;
    }

    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol as RolUsuario,
      tenantId: user.tenantId,
      tenant: user.tenant as any,
      almacenAsignadoId: user.almacenAsignadoId,
    };
  } catch (error) {
    console.error('Error al resolver la sesión en getAuthSession:', error);
    return null;
  }
}

export const getSession = getAuthSession;

/**
 * Helper para validar permisos server-side y resolver el tenantId seguro.
 * Devuelve error estructurado si el usuario no está autenticado o no tiene permisos.
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: RolUsuario[]
): Promise<{ user: UserSession; tenantId: string | null; errorResponse?: never } | { user?: never; tenantId?: never; errorResponse: Response }> {
  const session = await getAuthSession(req);

  if (!session) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'No autenticado. Inicie sesión para continuar.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.rol)) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Acceso denegado. Permisos insuficientes para este recurso.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return {
    user: session,
    tenantId: session.tenantId,
  };
}
