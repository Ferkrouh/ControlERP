import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const effectiveTenantId = user.rol === 'SUPERADMIN' ? (tenantParam || undefined) : user.tenantId;

    if (!effectiveTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    const where = effectiveTenantId ? { tenantId: effectiveTenantId } : {};

    const traspasos = await prisma.traspaso.findMany({
      where,
      include: {
        items: {
          include: { producto: true },
        },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });

    const almacenes = await prisma.almacen.findMany({
      where: effectiveTenantId ? { tenantId: effectiveTenantId } : {},
    });
    const mapAlm = new Map(almacenes.map((a) => [a.id, a.nombre]));

    const result = traspasos.map((t) => ({
      ...t,
      almacenOrigenNombre: mapAlm.get(t.almacenOrigenId) || 'Almacén Origen',
      almacenDestinoNombre: mapAlm.get(t.almacenDestinoId) || 'Almacén Destino',
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching traspasos:', error);
    return NextResponse.json({ error: 'Error al obtener traspasos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const body = await req.json();
    const { 
      almacenOrigenId, 
      almacenDestinoId, 
      items, 
      observaciones,
      requiereCartaPorte = false,
      distanciaKm = 0,
      vehiculoPlacas,
      vehiculoModelo,
      operadorNombre,
      operadorRfc,
      operadorLicencia
    } = body;

    const targetTenantId = user.rol === 'SUPERADMIN' ? (body.tenantId || user.tenantId) : user.tenantId;
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant no especificado' }, { status: 400 });
    }

    if (almacenOrigenId === almacenDestinoId) {
      return NextResponse.json({ error: 'El almacén de origen y destino no pueden ser el mismo' }, { status: 400 });
    }

    // Validar que ambos almacenes pertenezcan al tenant
    const almacenes = await prisma.almacen.findMany({
      where: {
        id: { in: [almacenOrigenId, almacenDestinoId] },
        tenantId: targetTenantId,
      },
    });

    if (almacenes.length !== 2) {
      return NextResponse.json({ error: 'Almacenes no válidos o no pertenecen a su empresa' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: targetTenantId },
    });

    const count = await prisma.traspaso.count({ where: { tenantId: targetTenantId } });
    const folio = `TRASP-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    let cpFiscalData: any = {
      requiereCartaPorte: !!requiereCartaPorte,
      estadoCartaPorte: requiereCartaPorte ? 'PENDIENTE' : 'NO_APLICA',
      distanciaKm: Number(distanciaKm) || 0,
      vehiculoPlacas: vehiculoPlacas || null,
      vehiculoModelo: vehiculoModelo || null,
      operadorNombre: operadorNombre || null,
      operadorRfc: operadorRfc || null,
      operadorLicencia: operadorLicencia || null,
    };

    // Si requiere Carta Porte 3.1, ejecutar timbrado fiscal SAT
    if (requiereCartaPorte && tenant) {
      const { fiscalService } = await import('@/lib/fiscal-adapter');
      const almOrigen = almacenes.find((a) => a.id === almacenOrigenId)!;
      const almDestino = almacenes.find((a) => a.id === almacenDestinoId)!;

      const cpRes = await fiscalService.timbrarCartaPorte({
        folioInterno: folio,
        distanciaTotalKm: Number(distanciaKm) || 15,
        emisor: {
          rfc: tenant.identificacionFiscal,
          razonSocial: tenant.razonSocial,
          regimenFiscal: tenant.regimenFiscal || '601',
          codigoPostal: tenant.codigoPostal || '64000',
        },
        receptor: {
          rfc: tenant.identificacionFiscal,
          razonSocial: tenant.razonSocial,
          regimenFiscal: tenant.regimenFiscal || '601',
          codigoPostal: tenant.codigoPostal || '64000',
          usoCfdi: 'S01',
        },
        ubicaciones: [
          {
            tipoUbicacion: 'Origen',
            rfcRemitenteDestinatario: tenant.identificacionFiscal,
            nombreRemitenteDestinatario: almOrigen.nombre,
            fechaHoraSalidaLlegada: new Date(),
            distanciaRecorrida: 0,
            codigoPostal: tenant.codigoPostal || '64000',
          },
          {
            tipoUbicacion: 'Destino',
            rfcRemitenteDestinatario: tenant.identificacionFiscal,
            nombreRemitenteDestinatario: almDestino.nombre,
            fechaHoraSalidaLlegada: new Date(Date.now() + 3600000 * 3), // +3 horas estimadas
            distanciaRecorrida: Number(distanciaKm) || 15,
            codigoPostal: tenant.codigoPostal || '64000',
          }
        ],
        mercancias: items.map((it: any) => ({
          bienesTransp: '24102100', // Materiales y artículos comerciales
          descripcion: it.nombre || 'Mercancía de traspaso multialmacén',
          cantidad: Number(it.cantidadEnviada),
          claveUnidad: 'H87',
          pesoEnKg: Number(it.cantidadEnviada) * 1.5,
        })),
        autotransporte: {
          permSCT: 'TPAF01',
          numPermisoSCT: 'SCT-PERM-2026-X',
          configVehicular: 'C2',
          placaVM: vehiculoPlacas || 'P-102-MX',
          anioModeloVM: Number(vehiculoModelo) || 2024,
          aseguraRespCivil: 'SEGUROS GNP',
          polizaRespCivil: 'POL-GNP-99482',
        },
        operador: {
          rfc: operadorRfc || 'OPME850101XYZ',
          nombre: operadorNombre || 'Operador de Logística Interna',
          numLicencia: operadorLicencia || 'LIC-FED-884920',
        }
      });

      if (cpRes.success) {
        cpFiscalData.estadoCartaPorte = 'TIMBRADA';
        cpFiscalData.uuidCartaPorte = cpRes.uuid;
        cpFiscalData.fechaTimbradoCP = cpRes.fechaTimbrado;
        cpFiscalData.xmlCartaPorte = cpRes.xmlTimbrado;
      }
    }

    const traspaso = await prisma.traspaso.create({
      data: {
        tenantId: targetTenantId,
        folio,
        almacenOrigenId,
        almacenDestinoId,
        estado: 'SOLICITADO',
        observaciones,
        ...cpFiscalData,
        items: {
          create: items.map((it: any) => ({
            productoId: it.productoId,
            cantidadEnviada: Number(it.cantidadEnviada),
          })),
        },
      },
      include: {
        items: { include: { producto: true } },
      },
    });

    return NextResponse.json(traspaso, { status: 201 });
  } catch (error) {
    console.error('Error creating traspaso:', error);
    return NextResponse.json({ error: 'Error al solicitar traspaso' }, { status: 500 });
  }
}
