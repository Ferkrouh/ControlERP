import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession, COOKIE_NAME, signToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RolUsuario } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);

    if (!session) {
      return NextResponse.json({ currentUser: null, users: [] }, { status: 200 });
    }

    // Para entornos de desarrollo/demo local, permitimos listar usuarios disponibles del tenant o globales si es superadmin
    const usersWhere = session.rol === 'SUPERADMIN' 
      ? {} 
      : { tenantId: session.tenantId };

    const tenantUsers = await prisma.usuario.findMany({
      where: usersWhere,
      include: { tenant: true },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json({
      currentUser: session,
      users: tenantUsers.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol as RolUsuario,
        tenantId: u.tenantId,
        tenant: u.tenant,
      })),
    });
  } catch (error) {
    console.error('Error al resolver sesión en /api/auth/session:', error);
    return NextResponse.json({ error: 'Error al consultar sesión' }, { status: 500 });
  }
}

/**
 * Permite cambiar de usuario rápidamente en ambiente de desarrollo o testing
 * regenerando de forma legítima la cookie de sesión cifrada.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const targetUser = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { tenant: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Validación de seguridad: si no es SUPERADMIN, solo puede cambiar a usuarios dentro de su propio tenant
    if (session && session.rol !== 'SUPERADMIN' && targetUser.tenantId !== session.tenantId) {
      return NextResponse.json(
        { error: 'No autorizado para cambiar a un usuario de otra empresa.' },
        { status: 403 }
      );
    }

    const token = await signToken({
      id: targetUser.id,
      email: targetUser.email,
      rol: targetUser.rol as RolUsuario,
      tenantId: targetUser.tenantId,
    });

    const response = NextResponse.json({
      currentUser: {
        id: targetUser.id,
        nombre: targetUser.nombre,
        email: targetUser.email,
        rol: targetUser.rol,
        tenantId: targetUser.tenantId,
        tenant: targetUser.tenant,
        almacenAsignadoId: targetUser.almacenAsignadoId,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Error al cambiar usuario en /api/auth/session:', error);
    return NextResponse.json({ error: 'Error al actualizar sesión' }, { status: 500 });
  }
}
