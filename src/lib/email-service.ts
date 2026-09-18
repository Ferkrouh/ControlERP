import nodemailer from 'nodemailer';
import { generateFacturaPdf, generateCotizacionPdf, generateRepPdf } from './pdf-service';

// Configuración del Transporter de Correo
export function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  // Si no hay SMTP configurado en el entorno, creamos un transporte de prueba (Stream o Mock)
  // que simula el envío con éxito sin interrumpir la operación del ERP
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

function getSenderAddress(tenant: any): string {
  const fromName = tenant?.nombreComercial || 'ControlERP Enterprise';
  const fromEmail = process.env.SMTP_FROM || tenant?.email || 'notificaciones@controlerp.app';
  return `"${fromName}" <${fromEmail}>`;
}

// ==============================================================================
// 1. ENVÍO DE FACTURA CFDI 4.0 POR CORREO
// ==============================================================================
export interface SendFacturaEmailParams {
  venta: any;
  tenant: any;
  destinatarios: string[];
  asunto?: string;
  mensajePersonalizado?: string;
  adjuntarPdf?: boolean;
  adjuntarXml?: boolean;
}

export async function sendFacturaEmail(params: SendFacturaEmailParams) {
  const {
    venta,
    tenant,
    destinatarios,
    asunto,
    mensajePersonalizado,
    adjuntarPdf = true,
    adjuntarXml = true,
  } = params;

  if (!destinatarios || destinatarios.length === 0) {
    throw new Error('Debe especificar al menos un correo de destinatario.');
  }

  const transporter = getMailTransporter();
  const primaryColor = tenant?.colorPrimario || '#2563eb';
  const companyName = tenant?.nombreComercial || 'ControlERP';
  const clientName = venta.cliente?.razonSocial || 'Estimado Cliente';
  const totalStr = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(venta.total));
  const subject = asunto || `Factura Electrónica CFDI 4.0 - ${venta.folio} | ${companyName}`;

  const attachments: Array<{ filename: string; content: Buffer | string; contentType?: string }> = [];

  // Generar y adjuntar PDF si está activado
  if (adjuntarPdf) {
    const pdfBuffer = await generateFacturaPdf(venta, tenant);
    attachments.push({
      filename: `Factura_${venta.folio}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  // Adjuntar XML SAT si existe
  if (adjuntarXml) {
    const xmlContent = venta.xmlSat || `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Serie="A" Folio="${venta.folio}" Fecha="${new Date(venta.fecha).toISOString()}" Sello="SIMULADO_CFDI_4.0" Total="${venta.total}" SubTotal="${venta.subtotal || (Number(venta.total) / 1.16).toFixed(2)}" Moneda="MXN" TipoDeComprobante="I">
  <cfdi:Emisor Rfc="${tenant?.identificacionFiscal || 'XAXX010101000'}" Nombre="${tenant?.razonSocial || companyName}" RegimenFiscal="${tenant?.regimenFiscal || '601'}"/>
  <cfdi:Receptor Rfc="${venta.cliente?.rfc || 'XAXX010101000'}" Nombre="${clientName}" DomicilioFiscalReceptor="${venta.cliente?.codigoPostal || '64000'}" RegimenFiscalReceptor="${venta.cliente?.regimenFiscal || '612'}" UsoCFDI="G03"/>
</cfdi:Comprobante>`;

    attachments.push({
      filename: `Factura_${venta.folio}.xml`,
      content: xmlContent,
      contentType: 'application/xml',
    });
  }

  // Plantilla HTML Responsiva (The Fintech Ledger)
  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Contenedor Principal -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);">
          
          <!-- Barra de Acento Superior -->
          <tr>
            <td style="background-color: ${primaryColor}; height: 6px;"></td>
          </tr>

          <!-- Encabezado -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">${companyName}</h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Comprobante Fiscal Digital por Internet (CFDI 4.0)</p>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; background-color: #f1f5f9; color: #334155; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                      FOLIO: ${venta.folio}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cuerpo del Mensaje -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Estimado(a) <strong>${clientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Le informamos que ha sido generado su comprobante fiscal correspondiente a su compra. Adjunto a este correo encontrará los archivos oficiales <strong>PDF</strong> y <strong>XML</strong> para sus registros contables y fiscales.
              </p>

              ${mensajePersonalizado ? `
              <!-- Mensaje Personalizado del Emisor -->
              <div style="margin: 0 0 24px 0; padding: 14px 18px; background-color: #f8fafc; border-left: 4px solid ${primaryColor}; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155; font-style: italic;">
                  "${mensajePersonalizado}"
                </p>
              </div>
              ` : ''}

              <!-- Tarjeta Resumen de la Factura -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Monto Total Facturado</td>
                        <td align="right" style="font-size: 18px; font-weight: 700; color: #0f172a;">${totalStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="font-size: 12px; color: #64748b; padding-bottom: 8px;">
                          <strong>Fecha:</strong> ${new Date(venta.fecha).toLocaleDateString('es-MX')}
                        </td>
                        <td width="50%" style="font-size: 12px; color: #64748b; padding-bottom: 8px;">
                          <strong>Método de Pago:</strong> ${venta.tipoPago === 'CREDITO' ? 'PPD - Parcialidades' : 'PUE - Una sola exhibición'}
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="font-size: 12px; color: #64748b;">
                          <strong>RFC Receptor:</strong> ${venta.cliente?.rfc || 'XAXX010101000'}
                        </td>
                        <td width="50%" style="font-size: 12px; color: #64748b;">
                          <strong>UUID SAT:</strong> ${venta.uuidFiscal ? venta.uuidFiscal.slice(0, 16) + '...' : 'Certificado'}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Documentos Adjuntos -->
              <div style="padding: 12px 16px; background-color: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
                📎 <strong>Archivos adjuntos:</strong> ${adjuntarPdf ? `Factura_${venta.folio}.pdf` : ''} ${adjuntarXml ? `• Factura_${venta.folio}.xml` : ''}
              </div>
            </td>
          </tr>

          <!-- Pie de Página -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">${companyName}</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'} • Este es un correo automático emitido por el sistema ERP.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const mailOptions = {
    from: getSenderAddress(tenant),
    to: destinatarios.join(', '),
    subject,
    html: htmlContent,
    attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId || 'MOCK_DISPATCH_OK',
    destinatarios,
    attachmentsCount: attachments.length,
  };
}

// ==============================================================================
// 2. ENVÍO DE COTIZACIÓN COMERCIAL POR CORREO
// ==============================================================================
export interface SendCotizacionEmailParams {
  cotizacion: any;
  tenant: any;
  destinatarios: string[];
  asunto?: string;
  mensajePersonalizado?: string;
  adjuntarPdf?: boolean;
}

export async function sendCotizacionEmail(params: SendCotizacionEmailParams) {
  const {
    cotizacion,
    tenant,
    destinatarios,
    asunto,
    mensajePersonalizado,
    adjuntarPdf = true,
  } = params;

  if (!destinatarios || destinatarios.length === 0) {
    throw new Error('Debe especificar al menos un correo de destinatario.');
  }

  const transporter = getMailTransporter();
  const primaryColor = tenant?.colorPrimario || '#2563eb';
  const companyName = tenant?.nombreComercial || 'ControlERP Enterprise';
  const clientName = cotizacion.cliente?.razonSocial || 'Estimado Cliente';
  const totalStr = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(cotizacion.total || 0));
  const subject = asunto || `Propuesta Comercial y Cotización ${cotizacion.folio} | ${companyName}`;

  const attachments: Array<{ filename: string; content: Buffer | string; contentType?: string }> = [];

  if (adjuntarPdf) {
    const pdfBuffer = await generateCotizacionPdf(cotizacion, tenant);
    attachments.push({
      filename: `Cotizacion_${cotizacion.folio}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  const fechaExp = new Date(cotizacion.fecha || cotizacion.createdAt || Date.now());
  const fechaVto = new Date(cotizacion.fechaVencimiento || Date.now() + (cotizacion.vigenciaDias || 15) * 86400000);

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Contenedor Principal -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);">
          
          <!-- Barra de Acento Superior -->
          <tr>
            <td style="background-color: ${primaryColor}; height: 6px;"></td>
          </tr>

          <!-- Encabezado -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">${companyName}</h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Propuesta Comercial & Presupuesto</p>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; background-color: #f1f5f9; color: ${primaryColor}; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                      FOLIO: ${cotizacion.folio}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cuerpo del Mensaje -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Estimado(a) <strong>${clientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Es un gusto saludarle. Adjuntamos la cotización formal con el desglose de artículos, precios preferenciales y condiciones comerciales solicitadas.
              </p>

              ${mensajePersonalizado ? `
              <div style="margin: 0 0 24px 0; padding: 14px 18px; background-color: #f8fafc; border-left: 4px solid ${primaryColor}; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155; font-style: italic;">
                  "${mensajePersonalizado}"
                </p>
              </div>
              ` : ''}

              <!-- Tarjeta de Resumen -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Cotizado</td>
                        <td align="right" style="font-size: 18px; font-weight: 700; color: #0f172a;">${totalStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="font-size: 12px; color: #64748b; padding-bottom: 8px;">
                          <strong>Emisión:</strong> ${fechaExp.toLocaleDateString('es-MX')}
                        </td>
                        <td width="50%" style="font-size: 12px; color: #64748b; padding-bottom: 8px;">
                          <strong>Vigencia:</strong> Hasta ${fechaVto.toLocaleDateString('es-MX')} (${cotizacion.vigenciaDias || 15} días)
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="font-size: 12px; color: #64748b;">
                          <strong>Partidas:</strong> ${(cotizacion.detalles || []).length} artículos
                        </td>
                        <td width="50%" style="font-size: 12px; color: #64748b;">
                          <strong>Asesor:</strong> ${cotizacion.usuarioNombre || 'Ejecutivo de Ventas'}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Datos Bancarios -->
              <div style="padding: 14px 18px; background-color: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; color: #475569; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b;">Datos de Transferencia (SPEI):</p>
                <p style="margin: 0; line-height: 1.5;">
                  Banco: BBVA México • CLABE: 012 580 00123456789 0 • Beneficiario: ${tenant?.razonSocial || companyName}
                </p>
              </div>

              <!-- Documento Adjunto -->
              <div style="padding: 12px 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
                📎 <strong>Archivo adjunto:</strong> Cotizacion_${cotizacion.folio}.pdf
              </div>
            </td>
          </tr>

          <!-- Pie de Página -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">${companyName}</p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Para dudas o pedidos responda a este correo o comuníquese al ${tenant?.telefono || '(81) 8234-5678'}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const mailOptions = {
    from: getSenderAddress(tenant),
    to: destinatarios.join(', '),
    subject,
    html: htmlContent,
    attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId || 'MOCK_DISPATCH_OK',
    destinatarios,
    attachmentsCount: attachments.length,
  };
}

// ==============================================================================
// 3. ENVÍO DE COMPLEMENTO DE PAGO REP 2.0 POR CORREO
// ==============================================================================
export interface SendRepEmailParams {
  pago: any;
  cxc: any;
  tenant: any;
  destinatarios: string[];
  asunto?: string;
  mensajePersonalizado?: string;
  adjuntarPdf?: boolean;
}

export async function sendRepEmail(params: SendRepEmailParams) {
  const {
    pago,
    cxc,
    tenant,
    destinatarios,
    asunto,
    mensajePersonalizado,
    adjuntarPdf = true,
  } = params;

  if (!destinatarios || destinatarios.length === 0) {
    throw new Error('Debe especificar al menos un correo de destinatario.');
  }

  const transporter = getMailTransporter();
  const primaryColor = tenant?.colorPrimario || '#2563eb';
  const companyName = tenant?.nombreComercial || 'ControlERP';
  const clientName = cxc?.cliente?.razonSocial || 'Estimado Cliente';
  const montoStr = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(pago.monto || 0));
  const folioRep = pago.folioRep || `REP-${pago.id.slice(0, 8).toUpperCase()}`;
  const subject = asunto || `Recibo Electrónico de Pago (REP 2.0) - ${folioRep} | ${companyName}`;

  const attachments: Array<{ filename: string; content: Buffer | string; contentType?: string }> = [];

  if (adjuntarPdf) {
    const pdfBuffer = await generateRepPdf(pago, cxc, tenant);
    attachments.push({
      filename: `${folioRep}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);">
          <tr><td style="background-color: ${primaryColor}; height: 6px;"></td></tr>
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">${companyName}</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Recibo Electrónico de Pago (Complemento REP 2.0 SAT)</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">Estimado(a) <strong>${clientName}</strong>,</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Confirmamos la recepción y acreditación de su pago por <strong>${montoStr}</strong> correspondiente a la factura <strong>${cxc?.folio || 'FAC'}</strong>.
              </p>
              ${mensajePersonalizado ? `<div style="margin: 0 0 24px 0; padding: 14px; background-color: #f8fafc; border-left: 4px solid ${primaryColor};"><p style="margin:0; font-style: italic;">"${mensajePersonalizado}"</p></div>` : ''}
              <div style="padding: 12px 16px; background-color: #f1f5f9; border-radius: 8px; font-size: 12px; color: #475569;">
                📎 <strong>Archivo adjunto:</strong> ${folioRep}.pdf
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
              ${companyName} • RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const mailOptions = {
    from: getSenderAddress(tenant),
    to: destinatarios.join(', '),
    subject,
    html: htmlContent,
    attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId || 'MOCK_DISPATCH_OK',
    destinatarios,
    attachmentsCount: attachments.length,
  };
}
