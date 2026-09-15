import { prisma } from '@/lib/prisma';

export interface PartidaInput {
  cuentaCodigo: string;
  cargo: number;
  abono: number;
  concepto?: string;
  referenciaFolio?: string;
  uuidFiscalSAT?: string;
}

export const STANDARD_SAT_ACCOUNTS = [
  // ACTIVO
  { codigo: '101.01', nombre: 'Caja y Efectivo', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 1, codigoAgrupadorSAT: '101.01' },
  { codigo: '102.01', nombre: 'Bancos Nacionales', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 1, codigoAgrupadorSAT: '102.01' },
  { codigo: '105.01', nombre: 'Clientes Nacionales', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 1, codigoAgrupadorSAT: '105.01' },
  { codigo: '115.01', nombre: 'Inventario de Mercancías', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 1, codigoAgrupadorSAT: '115.01' },
  { codigo: '118.01', nombre: 'IVA Acreditable Pagado', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 1, codigoAgrupadorSAT: '118.01' },
  { codigo: '119.01', nombre: 'IVA Acreditable por Pagar / Pendiente', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 1, codigoAgrupadorSAT: '119.01' },
  // PASIVO
  { codigo: '201.01', nombre: 'Proveedores Nacionales', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 1, codigoAgrupadorSAT: '201.01' },
  { codigo: '208.01', nombre: 'IVA Trasladado Cobrado', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 1, codigoAgrupadorSAT: '208.01' },
  { codigo: '209.01', nombre: 'IVA Trasladado No Cobrado / Pendiente', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 1, codigoAgrupadorSAT: '209.01' },
  { codigo: '210.01', nombre: 'Retenciones de ISR por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 1, codigoAgrupadorSAT: '210.01' },
  { codigo: '211.01', nombre: 'Cuotas Obreras IMSS por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 1, codigoAgrupadorSAT: '211.01' },
  { codigo: '212.01', nombre: 'Sueldos y Salarios por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 1, codigoAgrupadorSAT: '212.01' },
  // CAPITAL
  { codigo: '301.01', nombre: 'Capital Social', tipo: 'CAPITAL', naturaleza: 'ACREEDORA', nivel: 1, codigoAgrupadorSAT: '301.01' },
  { codigo: '305.01', nombre: 'Resultado de Ejercicios Anteriores', tipo: 'CAPITAL', naturaleza: 'ACREEDORA', nivel: 1, codigoAgrupadorSAT: '305.01' },
  // INGRESOS
  { codigo: '401.01', nombre: 'Ventas Gravadas Tasa General 16%', tipo: 'RESULTADOS_ACREEDORA', naturaleza: 'ACREEDORA', nivel: 1, codigoAgrupadorSAT: '401.01' },
  // COSTOS Y GASTOS
  { codigo: '501.01', nombre: 'Costo de Ventas y Mercancías', tipo: 'RESULTADOS_DEUDORA', naturaleza: 'DEUDORA', nivel: 1, codigoAgrupadorSAT: '501.01' },
  { codigo: '601.01', nombre: 'Sueldos y Salarios Ordinarios', tipo: 'RESULTADOS_DEUDORA', naturaleza: 'DEUDORA', nivel: 1, codigoAgrupadorSAT: '601.01' },
  { codigo: '601.02', nombre: 'Cargas Sociales e IMSS Patronal', tipo: 'RESULTADOS_DEUDORA', naturaleza: 'DEUDORA', nivel: 1, codigoAgrupadorSAT: '601.02' },
  { codigo: '601.03', nombre: 'Gastos de Operación y Administración', tipo: 'RESULTADOS_DEUDORA', naturaleza: 'DEUDORA', nivel: 1, codigoAgrupadorSAT: '601.03' },
];

/**
 * Asegura que el tenant cuente con el catálogo base de cuentas contables agrupadas por el SAT.
 */
export async function ensureStandardChartOfAccounts(tenantId: string) {
  const count = await prisma.cuentaContable.count({ where: { tenantId } });
  if (count > 0) return;

  for (const acc of STANDARD_SAT_ACCOUNTS) {
    await prisma.cuentaContable.create({
      data: {
        tenantId,
        codigo: acc.codigo,
        nombre: acc.nombre,
        tipo: acc.tipo,
        naturaleza: acc.naturaleza,
        nivel: acc.nivel,
        codigoAgrupadorSAT: acc.codigoAgrupadorSAT,
        saldoInicial: 0,
        saldoActual: 0,
      },
    });
  }
}

/**
 * Registra una póliza contable con validación estricta de partida doble y actualización de saldos.
 */
export async function registrarPoliza(params: {
  tenantId: string;
  tipo: 'INGRESO' | 'EGRESO' | 'DIARIO';
  concepto: string;
  fecha?: Date;
  origenModulo?: string;
  origenReferenciaId?: string;
  usuarioId: string;
  usuarioNombre: string;
  partidas: PartidaInput[];
}) {
  await ensureStandardChartOfAccounts(params.tenantId);

  const totalDebe = Math.round(params.partidas.reduce((sum, p) => sum + p.cargo, 0) * 100) / 100;
  const totalHaber = Math.round(params.partidas.reduce((sum, p) => sum + p.abono, 0) * 100) / 100;

  const diferencia = Math.abs(totalDebe - totalHaber);
  if (diferencia > 0.05) {
    throw new Error(
      `Póliza descuadrada: Total Debe ($${totalDebe}) != Total Haber ($${totalHaber}). Diferencia: $${diferencia.toFixed(2)}`
    );
  }

  // Folio consecutivo
  const prefix = params.tipo === 'INGRESO' ? 'POL-ING' : params.tipo === 'EGRESO' ? 'POL-EGR' : 'POL-DIA';
  const year = new Date().getFullYear();
  const count = await prisma.polizaContable.count({
    where: { tenantId: params.tenantId, tipo: params.tipo },
  });
  const seq = (count + 1).toString().padStart(4, '0');
  const folio = `${prefix}-${year}-${seq}`;

  // Cuentas involucradas
  const cuentas = await prisma.cuentaContable.findMany({
    where: {
      tenantId: params.tenantId,
      codigo: { in: params.partidas.map((p) => p.cuentaCodigo) },
    },
  });
  const cuentaMap = new Map(cuentas.map((c) => [c.codigo, c]));

  return await prisma.$transaction(async (tx) => {
    const poliza = await tx.polizaContable.create({
      data: {
        tenantId: params.tenantId,
        folio,
        tipo: params.tipo,
        fecha: params.fecha || new Date(),
        concepto: params.concepto,
        totalDebe,
        totalHaber,
        cuadrada: true,
        origenModulo: params.origenModulo,
        origenReferenciaId: params.origenReferenciaId,
        usuarioId: params.usuarioId,
        usuarioNombre: params.usuarioNombre,
      },
    });

    for (const p of params.partidas) {
      const cuenta = cuentaMap.get(p.cuentaCodigo);
      if (!cuenta) continue;

      await tx.partidaPoliza.create({
        data: {
          polizaId: poliza.id,
          cuentaContableId: cuenta.id,
          cargo: p.cargo,
          abono: p.abono,
          concepto: p.concepto || params.concepto,
          referenciaFolio: p.referenciaFolio,
          uuidFiscalSAT: p.uuidFiscalSAT,
        },
      });

      // Impacto en saldo de la cuenta:
      // Si naturaleza DEUDORA: saldo = saldo + cargo - abono
      // Si naturaleza ACREEDORA: saldo = saldo + abono - cargo
      const delta = cuenta.naturaleza === 'DEUDORA' ? p.cargo - p.abono : p.abono - p.cargo;

      await tx.cuentaContable.update({
        where: { id: cuenta.id },
        data: { saldoActual: { increment: delta } },
      });
    }

    return poliza;
  });
}

/**
 * Genera automáticamente la póliza para una Venta registrada.
 */
export async function crearPolizaVenta(ventaId: string, tenantId: string, usuario: { id: string; nombre: string }) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { detalles: { include: { producto: true } }, cliente: true },
  });
  if (!venta) throw new Error('Venta no encontrada');

  const subtotal = venta.subtotal;
  const iva = venta.impuestos;
  const total = venta.total;

  const partidas: PartidaInput[] = [];

  if (venta.tipoPago === 'CREDITO') {
    // Cargo a Clientes
    partidas.push({ cuentaCodigo: '105.01', cargo: total, abono: 0, concepto: `Venta a crédito folio ${venta.folio}`, referenciaFolio: venta.folio, uuidFiscalSAT: venta.uuidFiscal || undefined });
    // Abono a Ventas
    partidas.push({ cuentaCodigo: '401.01', cargo: 0, abono: subtotal, concepto: `Ingreso por venta ${venta.folio}` });
    // Abono a IVA Trasladado Pendiente
    if (iva > 0) {
      partidas.push({ cuentaCodigo: '209.01', cargo: 0, abono: iva, concepto: `IVA por trasladar venta ${venta.folio}` });
    }
  } else {
    // Cargo a Caja/Bancos
    const cuentaCobro = venta.tipoPago === 'EFECTIVO' ? '101.01' : '102.01';
    partidas.push({ cuentaCodigo: cuentaCobro, cargo: total, abono: 0, concepto: `Venta contado ${venta.folio}`, referenciaFolio: venta.folio, uuidFiscalSAT: venta.uuidFiscal || undefined });
    // Abono a Ventas
    partidas.push({ cuentaCodigo: '401.01', cargo: 0, abono: subtotal, concepto: `Ingreso por venta ${venta.folio}` });
    // Abono a IVA Trasladado Cobrado
    if (iva > 0) {
      partidas.push({ cuentaCodigo: '208.01', cargo: 0, abono: iva, concepto: `IVA trasladado cobrado venta ${venta.folio}` });
    }
  }

  // Costo de Ventas
  let costoTotalVenta = 0;
  for (const det of venta.detalles) {
    const costo = det.producto?.costoPromedio || det.precioUnitario * 0.7;
    costoTotalVenta += costo * det.cantidad;
  }
  costoTotalVenta = Math.round(costoTotalVenta * 100) / 100;

  if (costoTotalVenta > 0) {
    partidas.push({ cuentaCodigo: '501.01', cargo: costoTotalVenta, abono: 0, concepto: `Costo de ventas ${venta.folio}` });
    partidas.push({ cuentaCodigo: '115.01', cargo: 0, abono: costoTotalVenta, concepto: `Salida de almacén venta ${venta.folio}` });
  }

  const nombreCliente = venta.cliente?.razonSocial || 'General';

  return await registrarPoliza({
    tenantId,
    tipo: venta.tipoPago === 'CREDITO' ? 'DIARIO' : 'INGRESO',
    concepto: `Registro contable venta ${venta.folio} - Cliente: ${nombreCliente}`,
    fecha: venta.fecha,
    origenModulo: 'VENTAS',
    origenReferenciaId: venta.id,
    usuarioId: usuario.id,
    usuarioNombre: usuario.nombre,
    partidas,
  });
}

/**
 * Genera la Balanza de Comprobación con saldos iniciales, debe, haber y saldos finales.
 */
export async function obtenerBalanzaComprobacion(tenantId: string) {
  await ensureStandardChartOfAccounts(tenantId);

  const cuentas = await prisma.cuentaContable.findMany({
    where: { tenantId, activa: true },
    include: { partidas: true },
    orderBy: { codigo: 'asc' },
  });

  return cuentas.map((c) => {
    const totalDebe = c.partidas.reduce((sum, p) => sum + p.cargo, 0);
    const totalHaber = c.partidas.reduce((sum, p) => sum + p.abono, 0);
    const movimientosNetos = c.naturaleza === 'DEUDORA' ? totalDebe - totalHaber : totalHaber - totalDebe;
    const saldoFinal = c.saldoInicial + movimientosNetos;

    return {
      id: c.id,
      codigo: c.codigo,
      nombre: c.nombre,
      tipo: c.tipo,
      naturaleza: c.naturaleza,
      nivel: c.nivel,
      codigoAgrupadorSAT: c.codigoAgrupadorSAT,
      saldoInicial: c.saldoInicial,
      totalDebe: Math.round(totalDebe * 100) / 100,
      totalHaber: Math.round(totalHaber * 100) / 100,
      saldoFinal: Math.round(saldoFinal * 100) / 100,
    };
  });
}

/**
 * Generador oficial de Catálogo de Cuentas XML para el Buzón Tributario del SAT (Anexo 24).
 */
export async function exportarCatalogoXML(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const balanza = await obtenerBalanzaComprobacion(tenantId);

  const rfc = tenant?.identificacionFiscal || 'XAXX010101000';
  const fecha = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<catalogocuentas:Catalogo xmlns:catalogocuentas="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas"\n`;
  xml += `  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
  xml += `  xsi:schemaLocation="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas/CatalogoCuentas_1_3.xsd"\n`;
  xml += `  Version="1.3" RFC="${rfc}" Mes="${new Date().getMonth() + 1}" Anio="${new Date().getFullYear()}">\n`;

  for (const c of balanza) {
    const nat = c.naturaleza === 'DEUDORA' ? 'D' : 'A';
    xml += `  <catalogocuentas:Ctas CodAgrup="${c.codigoAgrupadorSAT}" NumCta="${c.codigo}" Desc="${c.nombre}" Nivel="${c.nivel}" Natur="${nat}"/>\n`;
  }

  xml += `</catalogocuentas:Catalogo>`;
  return xml;
}

/**
 * Generador oficial de Balanza de Comprobación XML para el SAT (Anexo 24).
 */
export async function exportarBalanzaXML(tenantId: string, mes?: number, anio?: number): Promise<string> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const balanza = await obtenerBalanzaComprobacion(tenantId);

  const rfc = tenant?.identificacionFiscal || 'XAXX010101000';
  const m = mes || (new Date().getMonth() + 1);
  const y = anio || new Date().getFullYear();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<BCE:Balanza xmlns:BCE="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion"\n`;
  xml += `  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
  xml += `  xsi:schemaLocation="http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion/BalanzaComprobacion_1_3.xsd"\n`;
  xml += `  Version="1.3" RFC="${rfc}" Mes="${m.toString().padStart(2, '0')}" Anio="${y}" TipoEnvio="N">\n`;

  for (const c of balanza) {
    xml += `  <BCE:Ctas NumCta="${c.codigo}" SaldoIni="${c.saldoInicial.toFixed(2)}" Debe="${c.totalDebe.toFixed(2)}" Haber="${c.totalHaber.toFixed(2)}" SaldoFin="${c.saldoFinal.toFixed(2)}"/>\n`;
  }

  xml += `</BCE:Balanza>`;
  return xml;
}
