import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// R-05: Pronóstico de Ventas (Forecasting)
// Calcula ingresos esperados ponderados del pipeline CRM activo.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const whereTenant = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    // Oportunidades activas (excluyendo ganadas y perdidas)
    const activas = await prisma.oportunidadCRM.findMany({
      where: {
        ...whereTenant,
        etapa: { notIn: ['GANADA', 'PERDIDA'] },
      },
      orderBy: { probabilidadPct: 'desc' },
    });

    // Historial del año actual — oportunidades ganadas
    const anioActual = new Date().getFullYear();
    const ganadas = await prisma.oportunidadCRM.findMany({
      where: {
        ...whereTenant,
        etapa: 'GANADA',
        updatedAt: { gte: new Date(`${anioActual}-01-01`) },
      },
    });

    // Métricas de forecast
    let forecastTotal = 0;
    let comprometido = 0;  // prob >= 80%
    let enRiesgo = 0;       // prob < 50%
    let pipeline = 0;       // prob 50-79%

    activas.forEach((op) => {
      const ponderado = op.valorEstimado * (op.probabilidadPct / 100);
      forecastTotal += ponderado;
      if (op.probabilidadPct >= 80) comprometido += ponderado;
      else if (op.probabilidadPct < 50) enRiesgo += ponderado;
      else pipeline += ponderado;
    });

    // Agrupación por etapa
    const porEtapa: Record<string, { etapa: string; count: number; valorBruto: number; valorPonderado: number }> = {};
    activas.forEach((op) => {
      if (!porEtapa[op.etapa]) {
        porEtapa[op.etapa] = { etapa: op.etapa, count: 0, valorBruto: 0, valorPonderado: 0 };
      }
      porEtapa[op.etapa].count += 1;
      porEtapa[op.etapa].valorBruto += op.valorEstimado;
      porEtapa[op.etapa].valorPonderado += op.valorEstimado * (op.probabilidadPct / 100);
    });

    // Agrupación por asesor
    const porAsesor: Record<string, { asesor: string; count: number; forecastPonderado: number }> = {};
    activas.forEach((op) => {
      const asesor = op.usuarioAsignado || 'Sin Asignar';
      if (!porAsesor[asesor]) porAsesor[asesor] = { asesor, count: 0, forecastPonderado: 0 };
      porAsesor[asesor].count += 1;
      porAsesor[asesor].forecastPonderado += op.valorEstimado * (op.probabilidadPct / 100);
    });

    // Top 10 oportunidades por valor ponderado
    const top10 = [...activas]
      .sort((a, b) => (b.valorEstimado * b.probabilidadPct) - (a.valorEstimado * a.probabilidadPct))
      .slice(0, 10)
      .map((op) => ({
        id: op.id,
        nombre: op.nombre,
        contacto: op.contactoNombre,
        etapa: op.etapa,
        valorEstimado: op.valorEstimado,
        probabilidadPct: op.probabilidadPct,
        valorPonderado: op.valorEstimado * (op.probabilidadPct / 100),
        asesor: op.usuarioAsignado || '—',
        fechaCierrePrev: op.fechaCierrePrev?.toISOString().slice(0, 10) || null,
      }));

    return NextResponse.json({
      kpis: {
        forecastTotal,
        comprometido,
        pipeline,
        enRiesgo,
        totalOportunidades: activas.length,
        ganadasAnio: ganadas.length,
        valorGanadasAnio: ganadas.reduce((s, o) => s + o.valorEstimado, 0),
      },
      porEtapa: Object.values(porEtapa),
      porAsesor: Object.values(porAsesor).sort((a, b) => b.forecastPonderado - a.forecastPonderado),
      top10,
    });
  } catch (error) {
    console.error('Error forecasting:', error);
    return NextResponse.json({ error: 'Error al calcular forecast de ventas' }, { status: 500 });
  }
}
