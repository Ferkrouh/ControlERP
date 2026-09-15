import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { exportarCatalogoXML, exportarBalanzaXML } from '@/lib/accounting-engine';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo'); // 'catalogo' o 'balanza'
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || user.tenantId) : user.tenantId;

    if (!effectiveTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (tipo === 'catalogo') {
      const xml = await exportarCatalogoXML(effectiveTenantId);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="CatalogoCuentas_SAT.xml"`,
        },
      });
    } else if (tipo === 'balanza') {
      const xml = await exportarBalanzaXML(effectiveTenantId);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="BalanzaComprobacion_SAT.xml"`,
        },
      });
    } else {
      return NextResponse.json({ error: 'Tipo inválido. Use "catalogo" o "balanza"' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error exporting SAT XML:', error);
    return NextResponse.json({ error: 'Error al exportar XML del SAT' }, { status: 500 });
  }
}
