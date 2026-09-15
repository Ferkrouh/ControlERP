import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || user.tenantId) : user.tenantId;

    if (!effectiveTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const empleados = await prisma.empleado.findMany({
      where: { tenantId: effectiveTenantId },
      include: {
        _count: { select: { recibosNomina: true, incidencias: true } },
      },
      orderBy: { numeroEmpleado: 'asc' },
    });

    return NextResponse.json(empleados);
  } catch (error: any) {
    console.error('Error fetching empleados:', error);
    return NextResponse.json({ error: 'Error al consultar empleados' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const {
      numeroEmpleado,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      rfc,
      curp,
      nss,
      puesto,
      departamento,
      salarioDiario,
      salarioDiarioIntegrado,
      bancoNombre,
      cuentaClabe,
      periodicidadPago = 'QUINCENAL',
    } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (!numeroEmpleado || !nombre || !apellidoPaterno || !rfc || !curp || !puesto || !departamento || !salarioDiario) {
      return NextResponse.json({ error: 'Faltan campos obligatorios para el empleado' }, { status: 400 });
    }

    const sd = Number(salarioDiario);
    const sdi = Number(salarioDiarioIntegrado) || Math.round(sd * 1.0452 * 100) / 100;

    const empleado = await prisma.empleado.create({
      data: {
        tenantId: targetTenantId,
        numeroEmpleado,
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        rfc: rfc.toUpperCase().trim(),
        curp: curp.toUpperCase().trim(),
        nss,
        puesto,
        departamento,
        fechaIngreso: body.fechaIngreso ? new Date(body.fechaIngreso) : new Date(),
        salarioDiario: sd,
        salarioDiarioIntegrado: sdi,
        salarioBaseCotizacion: sdi,
        periodicidadPago,
        bancoNombre,
        cuentaClabe,
        estado: 'ACTIVO',
      },
    });

    return NextResponse.json(empleado, { status: 201 });
  } catch (error: any) {
    console.error('Error creating empleado:', error);
    return NextResponse.json({ error: error.message || 'Error al registrar colaborador' }, { status: 500 });
  }
}
