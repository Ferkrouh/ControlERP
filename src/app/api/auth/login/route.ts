import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken, COOKIE_NAME, sanitizeTenantForSession } from '@/lib/auth';
import { RolUsuario } from '@/lib/types';
import { writePlatformAudit } from '@/lib/platform-audit';
import { clearLoginFailures, isLoginRateLimited, recordLoginFailure } from '@/lib/login-rate-limit';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Correo electrónico y contraseña requeridos.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `${ipAddress}:${normalizedEmail}`;
    const ipRateLimitKey = `ip:${ipAddress}`;
    if (isLoginRateLimited(rateLimitKey) || isLoginRateLimited(ipRateLimitKey, 100)) {
      await writePlatformAudit({ categoria: 'AUTENTICACION', accion: 'LOGIN_RATE_LIMIT', resultado: 'DENEGADO', detalles: 'Intento de acceso bloqueado por exceso de intentos', usuarioEmail: normalizedEmail, ipAddress });
      return NextResponse.json({ error: 'Demasiados intentos. Espere 15 minutos antes de volver a intentar.' }, { status: 429 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: normalizedEmail },
      include: { tenant: true },
    });

    if (!user) {
      recordLoginFailure(rateLimitKey);
      recordLoginFailure(ipRateLimitKey);
      await writePlatformAudit({ categoria: 'AUTENTICACION', accion: 'LOGIN', resultado: 'DENEGADO', detalles: 'Intento de acceso con credenciales no válidas', usuarioEmail: String(email).toLowerCase().trim(), ipAddress });
      return NextResponse.json(
        { error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    if (!user.activo) {
      await writePlatformAudit({ categoria: 'AUTENTICACION', accion: 'LOGIN', resultado: 'DENEGADO', detalles: 'Intento de acceso a cuenta desactivada', usuarioId: user.id, usuarioEmail: user.email, tenantId: user.tenantId, ipAddress });
      return NextResponse.json(
        { error: 'Esta cuenta de usuario ha sido desactivada. Contacte al administrador.' },
        { status: 403 }
      );
    }

    if (user.tenant) {
      if (!user.tenant.activo) {
        await writePlatformAudit({ categoria: 'AUTENTICACION', accion: 'LOGIN', resultado: 'DENEGADO', detalles: 'Intento de acceso a tenant desactivado', usuarioId: user.id, usuarioEmail: user.email, tenantId: user.tenantId, ipAddress });
        return NextResponse.json(
          { error: 'El acceso para esta empresa se encuentra suspendido. Contacte al administrador de plataforma.' },
          { status: 403 }
        );
      }

      // Bloqueo explícito administrativo por Superadmin (Modo Flexible con Facturación Externa)
      if (user.rol !== 'SUPERADMIN' && user.tenant.bloqueadoPorSuscripcion) {
        await writePlatformAudit({ categoria: 'AUTENTICACION', accion: 'LOGIN', resultado: 'DENEGADO', detalles: 'Intento de acceso a tenant bloqueado por suscripción', usuarioId: user.id, usuarioEmail: user.email, tenantId: user.tenantId, ipAddress });
        const fechaVenc = user.tenant.fechaVencimientoPlan 
          ? new Date(user.tenant.fechaVencimientoPlan).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'indefinida';
        return NextResponse.json(
          { 
            error: `El acceso para la empresa ${user.tenant.nombreComercial} ha sido suspendido por corte administrativo de suscripción (${fechaVenc}). Comuníquese con el Superadmin para reactivar su servicio.`,
            suscripcionExpirada: true 
          },
          { status: 403 }
        );
      }
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      recordLoginFailure(rateLimitKey);
      recordLoginFailure(ipRateLimitKey);
      await writePlatformAudit({ categoria: 'AUTENTICACION', accion: 'LOGIN', resultado: 'DENEGADO', detalles: 'Contraseña incorrecta', usuarioId: user.id, usuarioEmail: user.email, tenantId: user.tenantId, ipAddress });
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
    clearLoginFailures(rateLimitKey);
    clearLoginFailures(ipRateLimitKey);

    await writePlatformAudit({ categoria: 'AUTENTICACION', accion: 'LOGIN', resultado: 'OK', detalles: 'Inicio de sesión correcto', usuarioId: user.id, usuarioEmail: user.email, tenantId: user.tenantId, ipAddress });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        tenantId: user.tenantId,
        tenant: sanitizeTenantForSession(user.tenant),
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
