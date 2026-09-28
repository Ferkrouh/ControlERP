import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { RolUsuario, UserSession } from './types';

import { verifyToken, COOKIE_NAME } from './auth-token';
export { signToken, verifyToken, COOKIE_NAME } from './auth-token';
export type { TokenPayload } from './auth-token';

export function sanitizeTenantForSession<T extends Record<string, any> | null | undefined>(tenant: T): T {
  if (!tenant) return tenant;
  const {
    pacUsuario: _pacUsuario,
    pacPassword: _pacPassword,
    csdCertificadoBase64: _csdCertificadoBase64,
    csdLlaveBase64: _csdLlaveBase64,
    csdPassword: _csdPassword,
    ...safeTenant
  } = tenant;
  return safeTenant as T;
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
  if (!/^\$2[aby]\$\d{2}\$/.test(hash)) {
    return false;
  }
  return await bcrypt.compare(password, hash.replace(/^\$2y\$/, '$2b$'));
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
    if (user.tenant && (!user.tenant.activo || user.tenant.bloqueadoPorSuscripcion)) {
      return null;
    }

    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol as RolUsuario,
      tenantId: user.tenantId,
      tenant: sanitizeTenantForSession(user.tenant) as any,
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
