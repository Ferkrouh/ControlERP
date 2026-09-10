import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken, COOKIE_NAME } from '@/lib/auth';
import { RolUsuario } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Correo electrónico y contraseña requeridos.' },
        { status: 400 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    if (!user.activo) {
      return NextResponse.json(
        { error: 'Esta cuenta de usuario ha sido desactivada. Contacte al administrador.' },
        { status: 403 }
      );
    }

    if (user.tenant && !user.tenant.activo) {
      return NextResponse.json(
        { error: 'El acceso para esta empresa se encuentra suspendido.' },
        { status: 403 }
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    // Firmar Token de sesión
    const token = await signToken({
      id: user.id,
      email: user.email,
      rol: user.rol as RolUsuario,
      tenantId: user.tenantId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        tenantId: user.tenantId,
        tenant: user.tenant,
        almacenAsignadoId: user.almacenAsignadoId,
      },
    });

    // Guardar cookie HTTP-only segura
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return response;
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado al procesar el inicio de sesión.' },
      { status: 500 }
    );
  }
}
