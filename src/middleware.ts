import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from './lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/session'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir assets estáticos y Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Permitir rutas públicas explícitas
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Verificar existencia y validez de la cookie de sesión
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    // Si intenta acceder a una API privada sin token, responde 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autenticado. Por favor inicie sesión.' },
        { status: 401 }
      );
    }

    // Redireccionar al login si intenta acceder a páginas web protegidas
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Control de acceso por Rol para rutas exclusivas de Superadmin
  if (pathname.startsWith('/negocios') && payload.rol !== 'SUPERADMIN') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
