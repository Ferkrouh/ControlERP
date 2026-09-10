import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, hashPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Solo el SUPERADMIN de plataforma puede listar y gestionar tenants globalmente
    const auth = await requireAuth(req, ['SUPERADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const tenants = await prisma.tenant.findMany({
      include: {
        usuarios: {
          select: { id: true, nombre: true, email: true, rol: true, activo: true },
        },
        almacenes: true,
        _count: {
          select: {
            clientes: true,
            productos: true,
            traspasos: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json({ error: 'Error al obtener negocios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();

    if (!body.nombreComercial || !body.identificacionFiscal) {
      return NextResponse.json({ error: 'Nombre comercial e identificación fiscal son requeridos' }, { status: 400 });
    }

    const defaultPasswordHash = await hashPassword(body.adminPassword || 'admin123');

    const result = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          nombreComercial: body.nombreComercial.trim(),
          razonSocial: (body.razonSocial || body.nombreComercial).trim(),
          identificacionFiscal: body.identificacionFiscal.toUpperCase().trim(),
          giro: body.giro || 'DISTRIBUCION_MAYOREO',
          moneda: body.moneda || 'MXN',
          colorPrimario: body.colorPrimario || '#1e40af',
          moduloMultiAlmacen: body.moduloMultiAlmacen ?? true,
          moduloTraspasos: body.moduloTraspasos ?? true,
          moduloCredito: body.moduloCredito ?? true,
          moduloCxC: body.moduloCxC ?? true,
          moduloProveedores: body.moduloProveedores ?? true,
          moduloCxP: body.moduloCxP ?? true,
          moduloReportes: body.moduloReportes ?? true,
        },
      });

      // Crear almacén principal por defecto
      await tx.almacen.create({
        data: {
          tenantId: newTenant.id,
          codigo: 'ALM-01',
          nombre: 'Almacén Principal',
          ubicacion: 'Matriz',
          esPrincipal: true,
        },
      });

      // Crear usuario Admin por defecto
      if (body.adminEmail) {
        await tx.usuario.create({
          data: {
            tenantId: newTenant.id,
            nombre: body.adminNombre || 'Administrador',
            email: body.adminEmail.toLowerCase().trim(),
            passwordHash: defaultPasswordHash,
            rol: 'ADMIN',
          },
        });
      }

      return newTenant;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json({ error: 'Error al crear negocio' }, { status: 500 });
  }
}
