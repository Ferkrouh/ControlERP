import nodemailer from 'nodemailer';
import { generateCotizacionPdf } from './pdf-service';

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

  throw new Error('SMTP no configurado; el correo no fue enviado');
}

function getSenderAddress(tenant: any): string {
  const fromName = tenant?.nombreComercial || 'ControlERP Enterprise';
  const fromEmail = process.env.SMTP_FROM || tenant?.email || 'notificaciones@controlerp.app';
  return `"${fromName}" <${fromEmail}>`;
}

// Compatibilidad con scripts antiguos: la emisión fiscal no existe en el piloto.
export async function sendFacturaEmail(_params: unknown): Promise<never> {
  throw new Error('Envío fiscal de factura no disponible sin PAC');
}

export async function sendRepEmail(_params: unknown): Promise<never> {
  throw new Error('Envío fiscal de REP no disponible sin PAC');
}

// ==============================================================================
// Envío de cotización comercial por correo
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
    messageId: info.messageId || null,
    destinatarios,
    attachmentsCount: attachments.length,
  };
}
