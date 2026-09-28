const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_RESET !== 'true') {
  console.error('Seed demo bloqueado: borra y reconstruye datos. Para uso local, establezca ALLOW_DEMO_RESET=true.');
  process.exit(1);
}

async function main() {
  console.log('--- Limpiando base de datos para sembrado inicial ---');
  await prisma.registroAuditoria.deleteMany({});
  await prisma.pagoCxC.deleteMany({});
  await prisma.cuentaPorCobrar.deleteMany({});
  await prisma.pagoCxP.deleteMany({});
  await prisma.cuentaPorPagar.deleteMany({});
  await prisma.movimientoKardex.deleteMany({});
  await prisma.traspasoItem.deleteMany({});
  await prisma.traspaso.deleteMany({});
  await prisma.existencia.deleteMany({});
  await prisma.producto.deleteMany({});
  await prisma.almacen.deleteMany({});
  await prisma.proveedor.deleteMany({});
  await prisma.cliente.deleteMany({});
  await prisma.usuario.deleteMany({});
  await prisma.tenant.deleteMany({});

  const hashAdmin = await bcrypt.hash('admin123', 10);
  const hashEncargado = await bcrypt.hash('encargado123', 10);
  const hashAlmacen = await bcrypt.hash('almacen123', 10);
  const hashAuditor = await bcrypt.hash('auditor123', 10);

  console.log('--- Creando Superadmin Global de Plataforma ---');
  const superadmin = await prisma.usuario.create({
    data: {
      nombre: 'Super Administrador',
      email: 'superadmin@controlerp.com',
      passwordHash: hashAdmin,
      rol: 'SUPERADMIN',
      activo: true,
      tenantId: null,
    }
  });

  console.log('--- Creando Tenant 1: Distribuidora Mayorista ---');
  const tenantMayorista = await prisma.tenant.create({
    data: {
      nombreComercial: 'Distribuidora Mayorista del Norte',
      razonSocial: 'Distribuidora Mayorista del Norte S.A. de C.V.',
      identificacionFiscal: 'DMN180524ABC',
      regimenFiscal: '601',
      codigoPostal: '64000',
      giro: 'DISTRIBUCION_MAYOREO',
      moneda: 'MXN',
      colorPrimario: '#1e40af', // Azul corporativo
      textoEncabezadoDoc: 'Líderes en mayoreo industrial y suministros',
      diasGraciaCredito: 3,
      alertaVencimientoDias: 5,
      politicaBloqueoCredito: 'ESTRICTO',
      moduloCredito: true,
      moduloCxC: true,
      moduloProveedores: true,
      moduloCxP: true,
      moduloMultiAlmacen: true,
      moduloTraspasos: true,
      moduloReportes: true,
      moduloFacturacionSAT: true,
    }
  });

  // Usuarios Tenant 1
  const adminMayorista = await prisma.usuario.create({
    data: {
      nombre: 'Carlos Vega (Admin Negocio)',
      email: 'admin@distribuidora.com',
      passwordHash: hashAdmin,
      rol: 'ADMIN',
      tenantId: tenantMayorista.id,
    }
  });

  const encargadoMayorista = await prisma.usuario.create({
    data: {
      nombre: 'Lucía Morales (Encargada Sucursal)',
      email: 'encargado@distribuidora.com',
      passwordHash: hashEncargado,
      rol: 'ENCARGADO',
      tenantId: tenantMayorista.id,
    }
  });

  const almacenistaMayorista = await prisma.usuario.create({
    data: {
      nombre: 'Mateo Rivas (Almacenista Central)',
      email: 'almacenista@distribuidora.com',
      passwordHash: hashAlmacen,
      rol: 'ALMACENISTA',
      tenantId: tenantMayorista.id,
    }
  });

  const auditorMayorista = await prisma.usuario.create({
    data: {
      nombre: 'Lic. Roberto Peña (Auditor Fiscal)',
      email: 'auditor@distribuidora.com',
      passwordHash: hashAuditor,
      rol: 'AUDITOR',
      tenantId: tenantMayorista.id,
    }
  });

  // Almacenes
  const almCentral = await prisma.almacen.create({
    data: {
      tenantId: tenantMayorista.id,
      codigo: 'ALM-01',
      nombre: 'CEDIS Central Monterrey',
      ubicacion: 'Parque Industrial Mitras, Nave 4',
      esPrincipal: true,
    }
  });

  const almGuadalajara = await prisma.almacen.create({
    data: {
      tenantId: tenantMayorista.id,
      codigo: 'ALM-02',
      nombre: 'Sucursal Guadalajara',
      ubicacion: 'Calzada González Gallo #1420',
      esPrincipal: false,
    }
  });

  // Productos
  const p1 = await prisma.producto.create({
    data: {
      tenantId: tenantMayorista.id,
      sku: 'HER-001',
      codigoBarras: '7501234567890',
      nombre: 'Rotomartillo Industrial 1/2 pulg 850W',
      categoria: 'Herramientas Eléctricas',
      unidadMedida: 'PZA',
      costoPromedio: 1450.00,
      precioVenta: 2390.00,
      stockMinimo: 10,
      stockMaximo: 100,
    }
  });

  const p2 = await prisma.producto.create({
    data: {
      tenantId: tenantMayorista.id,
      sku: 'HER-002',
      codigoBarras: '7501234567891',
      nombre: 'Compresor de Aire 50 Litros 2.5 HP',
      categoria: 'Maquinaria Ligera',
      unidadMedida: 'PZA',
      costoPromedio: 3200.00,
      precioVenta: 4999.00,
      stockMinimo: 5,
      stockMaximo: 40,
    }
  });

  const p3 = await prisma.producto.create({
    data: {
      tenantId: tenantMayorista.id,
      sku: 'SEG-101',
      codigoBarras: '7501234567892',
      nombre: 'Casco de Seguridad Dielectrico C/Barboquejo',
      categoria: 'Seguridad Industrial',
      unidadMedida: 'PZA',
      costoPromedio: 120.00,
      precioVenta: 245.00,
      stockMinimo: 25,
      stockMaximo: 300,
    }
  });

  // Existencias por Almacén
  await prisma.existencia.createMany({
    data: [
      { almacenId: almCentral.id, productoId: p1.id, cantidad: 45 },
      { almacenId: almGuadalajara.id, productoId: p1.id, cantidad: 12 },
      { almacenId: almCentral.id, productoId: p2.id, cantidad: 18 },
      { almacenId: almGuadalajara.id, productoId: p2.id, cantidad: 4 }, // Bajo mínimo!
      { almacenId: almCentral.id, productoId: p3.id, cantidad: 180 },
      { almacenId: almGuadalajara.id, productoId: p3.id, cantidad: 60 },
    ]
  });

  // Kárdex Inicial
  await prisma.movimientoKardex.createMany({
    data: [
      {
        tenantId: tenantMayorista.id,
        almacenId: almCentral.id,
        productoId: p1.id,
        tipoMovimiento: 'ENTRADA_COMPRA',
        cantidad: 45,
        costoUnitario: 1450.00,
        saldoResultante: 45,
        folioReferencia: 'FAC-PROV-901',
        motivo: 'Compra inicial a proveedor Aceros y Herramientas',
      },
      {
        tenantId: tenantMayorista.id,
        almacenId: almCentral.id,
        productoId: p2.id,
        tipoMovimiento: 'ENTRADA_COMPRA',
        cantidad: 18,
        costoUnitario: 3200.00,
        saldoResultante: 18,
        folioReferencia: 'FAC-PROV-901',
        motivo: 'Compra inicial',
      }
    ]
  });

  // Clientes y Límites de Crédito
  const cli1 = await prisma.cliente.create({
    data: {
      tenantId: tenantMayorista.id,
      codigo: 'CLI-001',
      razonSocial: 'Constructora del Bajío S.A. de C.V.',
      rfc: 'CBA120304XY1',
      email: 'compras@constructorabajio.mx',
      telefono: '477-555-0199',
      direccion: 'Blvd. Aeropuerto #402, León, Gto.',
      diasCredito: 30,
      limiteCredito: 150000.00,
      saldoActual: 45000.00, // Disponible: 105,000
      estadoCredito: 'ACTIVO',
    }
  });

  const cli2 = await prisma.cliente.create({
    data: {
      tenantId: tenantMayorista.id,
      codigo: 'CLI-002',
      razonSocial: 'Comercializadora San Pedro S. de R.L.',
      rfc: 'CSP190812KM8',
      email: 'pagos@sanpedrocom.com',
      telefono: '818-555-8822',
      direccion: 'Av. Vasconcelos #900, San Pedro Garza García, N.L.',
      diasCredito: 15,
      limiteCredito: 50000.00,
      saldoActual: 50000.00, // Saturado 100%!
      estadoCredito: 'BLOQUEADO',
    }
  });

  const cli3 = await prisma.cliente.create({
    data: {
      tenantId: tenantMayorista.id,
      codigo: 'CLI-003',
      razonSocial: 'Ferreterías Unidas del Norte',
      rfc: 'FUN150101RT3',
      email: 'cuentas@ferreunidas.com',
      telefono: '844-555-3410',
      direccion: 'Periférico Echeverría #1120, Saltillo, Coah.',
      diasCredito: 45,
      limiteCredito: 80000.00,
      saldoActual: 12500.00,
      estadoCredito: 'ACTIVO',
    }
  });

  // Cuentas por Cobrar (CxC)
  await prisma.cuentaPorCobrar.createMany({
    data: [
      {
        tenantId: tenantMayorista.id,
        clienteId: cli1.id,
        folio: 'F-2026-089',
        montoTotal: 45000.00,
        saldoPendiente: 45000.00,
        fechaEmision: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Hace 10 días
        fechaVencimiento: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // Vence en 20 días
        estado: 'PENDIENTE',
      },
      {
        tenantId: tenantMayorista.id,
        clienteId: cli2.id,
        folio: 'F-2026-042',
        montoTotal: 50000.00,
        saldoPendiente: 50000.00,
        fechaEmision: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // Hace 40 días
        fechaVencimiento: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // VENCIDA hace 25 días!
        estado: 'VENCIDA',
      },
      {
        tenantId: tenantMayorista.id,
        clienteId: cli3.id,
        folio: 'F-2026-104',
        montoTotal: 12500.00,
        saldoPendiente: 12500.00,
        fechaEmision: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        fechaVencimiento: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        estado: 'PENDIENTE',
      }
    ]
  });

  // Proveedores y CxP
  const prov1 = await prisma.proveedor.create({
    data: {
      tenantId: tenantMayorista.id,
      codigo: 'PRV-001',
      razonSocial: 'Aceros y Herramientas Nacionales S.A.',
      rfc: 'AHN920415AA1',
      contacto: 'Ing. Fernando Treviño',
      telefono: '555-880-9900',
      email: 'ventas@acerosnacionales.com.mx',
      diasCredito: 30,
      saldoPendiente: 65250.00,
    }
  });

  await prisma.cuentaPorPagar.create({
    data: {
      tenantId: tenantMayorista.id,
      proveedorId: prov1.id,
      folioFactura: 'FAC-AHN-901',
      montoTotal: 65250.00,
      saldoPendiente: 65250.00,
      fechaEmision: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      fechaVencimiento: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      estado: 'PENDIENTE',
    }
  });

  // Traspaso entre almacenes de muestra
  const traspaso = await prisma.traspaso.create({
    data: {
      tenantId: tenantMayorista.id,
      folio: 'TRASP-2026-001',
      almacenOrigenId: almCentral.id,
      almacenDestinoId: almGuadalajara.id,
      estado: 'DESPACHADO',
      fechaSolicitud: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      fechaEnvio: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      observaciones: 'Reabastecimiento urgente de compresores para sucursal GDL',
    }
  });

  await prisma.traspasoItem.create({
    data: {
      traspasoId: traspaso.id,
      productoId: p2.id,
      cantidadEnviada: 5,
      cantidadRecibida: null,
    }
  });

  console.log('--- Creando Tenant 2: Servicios Integrales (Módulos restringidos) ---');
  const tenantServicios = await prisma.tenant.create({
    data: {
      nombreComercial: 'Consultoría & Servicios Integrales',
      razonSocial: 'Consultoría & Servicios Integrales S.C.',
      identificacionFiscal: 'CSI200115XX9',
      regimenFiscal: '601',
      codigoPostal: '03100',
      giro: 'SERVICIOS',
      moneda: 'MXN',
      colorPrimario: '#0f766e', // Verde azulado
      textoEncabezadoDoc: 'Soluciones empresariales y auditoría contable',
      diasGraciaCredito: 5,
      alertaVencimientoDias: 7,
      politicaBloqueoCredito: 'ADVERTENCIA',
      moduloCredito: true,
      moduloCxC: true,
      moduloProveedores: true,
      moduloCxP: true,
      moduloMultiAlmacen: false, // Desactivado por Superadmin
      moduloTraspasos: false,    // Desactivado por Superadmin
      moduloReportes: true,
      moduloFacturacionSAT: true,
    }
  });

  await prisma.usuario.create({
    data: {
      nombre: 'Elena Domínguez (Admin Servicios)',
      email: 'admin@servicios.com',
      passwordHash: hashAdmin,
      rol: 'ADMIN',
      tenantId: tenantServicios.id,
    }
  });

  console.log('=== Base de datos sembrada con éxito ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
