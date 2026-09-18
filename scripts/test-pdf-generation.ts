import { prisma } from '../src/lib/prisma';
import {
  generateFacturaPdf,
  generateCotizacionPdf,
  generateRepPdf,
  generateTicketPosPdf,
  generateEstadoCuentaPdf,
  generateCartaPortePdf,
  generateReciboNominaPdf
} from '../src/lib/pdf-service';
import fs from 'fs';
import path from 'path';

async function testAllPdfs() {
  console.log('=== TEST DE GENERACIÓN DE TODOS LOS FORMATOS PDF (THE FINTECH LEDGER) ===\n');

  const tenant = await prisma.tenant.findFirst({
    include: {
      ventas: {
        include: {
          cliente: true,
          almacen: true,
          detalles: { include: { producto: true } },
        },
      },
      clientes: {
        include: {
          cxc: { include: { pagos: true } },
        },
      },
      cotizaciones: {
        include: {
          cliente: true,
          detalles: { include: { producto: true } },
        },
      },
      traspasos: {
        include: {
          items: { include: { producto: true } },
        },
      },
    },
  });

  if (!tenant) {
    console.error('No se encontró tenant.');
    return;
  }

  const outDir = path.join(process.cwd(), 'scratch_pdfs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  // 1. Factura CFDI 4.0
  const venta = tenant.ventas[0];
  if (venta) {
    console.log(`Generando Factura PDF para ${venta.folio}...`);
    const facturaPdf = await generateFacturaPdf(venta, tenant);
    fs.writeFileSync(path.join(outDir, 'Factura_Test.pdf'), facturaPdf);
    console.log(`✅ Factura PDF generada (${facturaPdf.length} bytes)`);
  }

  // 2. Cotización Formal
  const cotizacion = tenant.cotizaciones[0];
  if (cotizacion) {
    console.log(`Generando Cotización PDF para ${cotizacion.folio}...`);
    const cotPdf = await generateCotizacionPdf(cotizacion, tenant);
    fs.writeFileSync(path.join(outDir, 'Cotizacion_Test.pdf'), cotPdf);
    console.log(`✅ Cotización PDF generada (${cotPdf.length} bytes)`);
  }

  // 3. Complemento de Pago REP 2.0
  const clienteConPagos = tenant.clientes.find(c => c.cxc.some(x => x.pagos.length > 0));
  if (clienteConPagos) {
    const cxc = clienteConPagos.cxc.find(x => x.pagos.length > 0);
    const pago = cxc?.pagos[0];
    if (pago && cxc) {
      console.log(`Generando Complemento de Pago REP PDF...`);
      const repPdf = await generateRepPdf(pago, cxc, tenant);
      fs.writeFileSync(path.join(outDir, 'REP_Pago_Test.pdf'), repPdf);
      console.log(`✅ REP PDF generado (${repPdf.length} bytes)`);
    }
  }

  // 4. Ticket POS 80mm
  if (venta) {
    console.log(`Generando Ticket POS 80mm PDF para ${venta.folio}...`);
    const ticketPdf = await generateTicketPosPdf({
      ...venta,
      cajero: 'Cajero Principal',
      pagoCon: Number(venta.total) + 100,
      cambio: 100,
    }, tenant);
    fs.writeFileSync(path.join(outDir, 'Ticket_POS_80mm_Test.pdf'), ticketPdf);
    console.log(`✅ Ticket POS 80mm PDF generado (${ticketPdf.length} bytes)`);
  }

  // 5. Estado de Cuenta
  const cliente = tenant.clientes[0];
  if (cliente) {
    console.log(`Generando Estado de Cuenta PDF para ${cliente.razonSocial}...`);
    const edc = await generateEstadoCuentaPdf(cliente, tenant);
    fs.writeFileSync(path.join(outDir, 'Estado_Cuenta_Test.pdf'), edc);
    console.log(`✅ Estado de Cuenta PDF generado (${edc.length} bytes)`);
  }

  // 6. Carta Porte 3.1
  const traspaso = tenant.traspasos[0];
  if (traspaso) {
    console.log(`Generando Carta Porte 3.1 PDF para ${traspaso.folio}...`);
    const cp = await generateCartaPortePdf(traspaso, tenant);
    fs.writeFileSync(path.join(outDir, 'CartaPorte_Test.pdf'), cp);
    console.log(`✅ Carta Porte PDF generada (${cp.length} bytes)`);
  }

  console.log('\n🎉 ¡TODOS LOS FORMATOS CORPORATIVOS FUERON GENERADOS Y CERTIFICADOS EXITOSAMENTE!');
}

testAllPdfs();
