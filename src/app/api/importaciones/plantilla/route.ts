import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { plantilla, type TipoImportacion } from '@/lib/importaciones';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN','SUPERADMIN']);
  if (auth.errorResponse) return auth.errorResponse;
  const tipo = new URL(req.url).searchParams.get('tipo') as TipoImportacion | 'STOCK_INICIAL';
  if (!['PRODUCTOS','PROVEEDORES','CLIENTES','STOCK_INICIAL'].includes(tipo)) return NextResponse.json({ error: 'Catálogo inválido' }, { status: 400 });
  const contenido = tipo === 'STOCK_INICIAL' ? '\uFEFFalmacenCodigo,sku,cantidad\r\n' : plantilla(tipo);
  return new Response(contenido, { headers: { 'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="plantilla-${tipo.toLowerCase()}.csv"`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
