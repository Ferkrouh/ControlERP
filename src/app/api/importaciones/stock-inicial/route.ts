import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { previsualizarStockInicial } from '@/lib/importaciones';
import { VentaError } from '@/lib/ventas';
import { writePlatformAudit } from '@/lib/platform-audit';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN','SUPERADMIN']);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const form = await req.formData(); const file = form.get('archivo');
    if (!(file instanceof File)) throw new VentaError('Seleccione un archivo CSV o XLSX');
    const tenantId = auth.user.rol === 'SUPERADMIN' ? String(form.get('tenantId') || auth.user.tenantId || '') : auth.user.tenantId || '';
    return NextResponse.json(await previsualizarStockInicial(file, tenantId, auth.user));
  } catch (e) {
    await writePlatformAudit({
      tenantId: auth.user.tenantId,
      usuarioId: auth.user.id,
      usuarioEmail: auth.user.email,
      categoria: 'INVENTARIO',
      accion: 'PREVISUALIZACION_STOCK_FALLIDA',
      resultado: e instanceof VentaError && e.status < 500 ? 'DENEGADO' : 'ERROR',
      detalles: 'No se pudo completar la previsualización del corte inicial',
      metadata: { status: e instanceof VentaError ? e.status : 400 },
    });
    if (e instanceof VentaError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('Previsualización de stock inicial:',e);
    return NextResponse.json({ error:'No se pudo analizar el archivo de stock' },{status:400});
  }
}
