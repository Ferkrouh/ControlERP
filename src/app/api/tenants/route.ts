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
        almacenes: {
          select: { id: true, codigo: true, nombre: true, esPrincipal: true },
        },
        _count: {
          select: {
            usuarios: true,
            almacenes: true,
            clientes: true,
            productos: true,
            traspasos: true,
            ventas: true,
            compras: true,
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

    if (body.adminEmail && (!body.adminPassword || String(body.adminPassword).length < 12)) {
      return NextResponse.json({ error: 'La contraseña inicial del administrador debe tener al menos 12 caracteres.' }, { status: 400 });
    }

    const adminPasswordHash = body.adminEmail ? await hashPassword(body.adminPassword) : null;

    // Calcular fecha de vencimiento por defecto si no viene dada (ej. 30 días o según plan)
    let fechaVenc: Date | null = null;
    if (body.fechaVencimientoPlan) {
      fechaVenc = new Date(body.fechaVencimientoPlan);
    } else {
      const hoy = new Date();
      fechaVenc = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días de periodo inicial
    }

    const result = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          nombreComercial: body.nombreComercial.trim(),
          razonSocial: (body.razonSocial || body.nombreComercial).trim(),
          identificacionFiscal: body.identificacionFiscal.toUpperCase().trim(),
          giro: body.giro || 'DISTRIBUCION_MAYOREO',
          moneda: body.moneda || 'MXN',
          colorPrimario: body.colorPrimario || '#1e40af',
          textoEncabezadoDoc: body.textoEncabezadoDoc || null,
          diasGraciaCredito: body.diasGraciaCredito ? parseInt(body.diasGraciaCredito) : 0,
          alertaVencimientoDias: body.alertaVencimientoDias ? parseInt(body.alertaVencimientoDias) : 5,
          politicaBloqueoCredito: body.politicaBloqueoCredito || 'ESTRICTO',

          // Control de Suscripción SaaS
          planSuscripcion: body.planSuscripcion || 'PROFESIONAL',
          fechaInicioPlan: body.fechaInicioPlan ? new Date(body.fechaInicioPlan) : new Date(),
          fechaVencimientoPlan: fechaVenc,
          diasGraciaSuscripcion: body.diasGraciaSuscripcion ? parseInt(body.diasGraciaSuscripcion) : 3,
          bloqueadoPorSuscripcion: body.bloqueadoPorSuscripcion ?? false,
          limiteUsuarios: body.limiteUsuarios ? parseInt(body.limiteUsuarios) : 10,
          limiteAlmacenes: body.limiteAlmacenes ? parseInt(body.limiteAlmacenes) : 5,
          notasSuperadmin: body.notasSuperadmin || null,

          // Módulos autorizados
          moduloCredito: body.moduloCredito ?? true,
          moduloCxC: body.moduloCxC ?? true,
          moduloProveedores: body.moduloProveedores ?? true,
          moduloCxP: body.moduloCxP ?? true,
          moduloMultiAlmacen: body.moduloMultiAlmacen ?? true,
          moduloTraspasos: body.moduloTraspasos ?? true,
          moduloReportes: body.moduloReportes ?? true,
          moduloFacturacionSAT: body.moduloFacturacionSAT ?? false,
          moduloTesoreria: body.moduloTesoreria ?? true,
          moduloManufactura: body.moduloManufactura ?? true,
          moduloCrm: body.moduloCrm ?? true,
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
            passwordHash: adminPasswordHash!,
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
