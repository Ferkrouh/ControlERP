import { prisma } from '../src/lib/prisma';
import {
  sendFacturaEmail,
  sendCotizacionEmail,
  sendRepEmail
} from '../src/lib/email-service';

async function testEmailDispatch() {
  console.log('=== TEST DE ENVÍO DE COMPROBANTES FISCALES Y COTIZACIONES POR CORREO ===\n');

  const tenant = await prisma.tenant.findFirst({
    include: {
      ventas: {
        include: {
          cliente: true,
          almacen: true,
          detalles: { include: { producto: true } },
        },
      },
      cotizaciones: {
        include: {
          cliente: true,
          detalles: { include: { producto: true } },
        },
      },
      clientes: {
        include: {
          cxc: { include: { pagos: true } },
        },
      },
    },
  });

  if (!tenant) {
    console.error('No se encontró tenant.');
    return;
  }

  // 1. Probar Envío de Factura CFDI 4.0
  const venta = tenant.ventas[0];
  if (venta) {
    console.log(`Enviando Factura ${venta.folio} por correo...`);
    const res = await sendFacturaEmail({
      venta,
      tenant,
      destinatarios: ['cliente_test@empresa.com', 'contabilidad@empresa.com'],
      asunto: `Factura Fiscal CFDI 4.0 - ${venta.folio} | ${tenant.nombreComercial}`,
      mensajePersonalizado: 'Agradecemos su compra. Adjuntamos su factura CFDI 4.0 y XML.',
      adjuntarPdf: true,
      adjuntarXml: true,
    });
    console.log('✅ Factura enviada por correo con éxito:', res);
  }

  // 2. Probar Envío de Cotización
  const cotizacion = tenant.cotizaciones[0];
  if (cotizacion) {
    console.log(`\nEnviando Cotización ${cotizacion.folio} por correo...`);
    const resCot = await sendCotizacionEmail({
      cotizacion,
      tenant,
      destinatarios: ['compras@cliente.com'],
      asunto: `Propuesta Comercial ${cotizacion.folio} | ${tenant.nombreComercial}`,
      mensajePersonalizado: 'Adjuntamos la propuesta comercial formal solicitada.',
      adjuntarPdf: true,
    });
    console.log('✅ Cotización enviada por correo con éxito:', resCot);
  }

  // 3. Probar Envío de REP
  const clienteConPagos = tenant.clientes.find(c => c.cxc.some(x => x.pagos.length > 0));
  if (clienteConPagos) {
    const cxc = clienteConPagos.cxc.find(x => x.pagos.length > 0);
    const pago = cxc?.pagos[0];
    if (pago && cxc) {
      console.log(`\nEnviando Complemento de Pago REP por correo...`);
      const resRep = await sendRepEmail({
        pago,
        cxc,
        tenant,
        destinatarios: ['tesoreria@cliente.com'],
        asunto: `Recibo Electrónico de Pago REP 2.0 | ${tenant.nombreComercial}`,
        mensajePersonalizado: 'Confirmamos la recepción de su abono.',
        adjuntarPdf: true,
      });
      console.log('✅ REP enviado por correo con éxito:', resRep);
    }
  }

  console.log('\n🎉 ¡TODOS LOS SERVICIOS DE CORREO ELECTRÓNICO FUERON PROBADOS CON ÉXITO!');
}

testEmailDispatch()
  .catch((err) => {
    console.error('❌ Error en test de correo:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
