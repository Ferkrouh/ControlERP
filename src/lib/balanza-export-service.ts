/**
 * Servicio de exportación de reportes internos de balanza
 * Reporte comercial interno. No certifica cifras ni constituye una declaración fiscal.
 */
import { construirCsv } from '@/lib/csv-seguro';

export interface BalanzaExportData {
  tenant: {
    nombreComercial?: string;
    razonSocial?: string;
    identificacionFiscal?: string;
    regimenFiscal?: string;
    codigoPostal?: string;
    colorPrimario?: string;
    logoUrl?: string;
  };
  periodo: {
    mesNombre: string;
    mesNumero: string;
    anio: string;
  };
  kpis: {
    totalVendido: number;
    ventasCount: number;
    totalComprado: number;
    comprasCount: number;
    cobranzaMes: number;
    pagosProveedoresMes: number;
    totalPorCobrar: number;
    totalVencido: number;
    totalPorPagar: number;
    valuacionTotal: number;
  };
  antiguedad: {
    vigente: number;
    dias1a30: number;
    dias31a60: number;
    dias61a90?: number;
    mas90: number;
  };
  valuacionPorAlmacen: Record<string, { total: number; piezas: number }>;
  balanzaClientes?: Array<{
    codigo: string;
    razonSocial: string;
    cargos: number;
    abonos: number;
    saldoFinal: number;
    cuentas: number;
  }>;
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const html = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

/**
 * Genera el documento HTML ejecutivo de la Balanza listo para impresión/PDF en alta resolución.
 */
export function generarDictamenBalanzaHtml(data: BalanzaExportData): string {
  const { tenant, periodo, kpis, antiguedad, valuacionPorAlmacen, balanzaClientes = [] } = data;
  const primaryColor = /^#[0-9a-fA-F]{6}$/.test(tenant.colorPrimario || '') ? tenant.colorPrimario! : '#0f172a';
  const fechaEmision = new Date().toLocaleString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalActivoCirculante = (kpis.totalPorCobrar || 0) + (kpis.valuacionTotal || 0);
  const ratioLiquidez = kpis.totalPorPagar > 0 ? (totalActivoCirculante / kpis.totalPorPagar).toFixed(2) : 'N/A';
  const pctMora = kpis.totalPorCobrar > 0 ? ((kpis.totalVencido / kpis.totalPorCobrar) * 100).toFixed(1) : '0.0';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte interno de balanza - ${html(periodo.mesNombre)} ${html(periodo.anio)}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 11px;
      line-height: 1.4;
    }
    .font-mono {
      font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    .header-bar {
      border-top: 4px solid ${primaryColor};
      padding-top: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin: 0 0 2px 0;
    }
    .company-sub {
      font-size: 9.5px;
      color: #475569;
      margin: 0;
    }
    .doc-badge-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 14px;
      text-align: right;
    }
    .doc-type {
      font-size: 9px;
      font-weight: 800;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-periodo {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin: 2px 0;
    }
    .doc-meta {
      font-size: 8.5px;
      color: #64748b;
    }
    
    /* Grid de KPIs */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      border-left: 3px solid ${primaryColor};
    }
    .kpi-label {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .kpi-desc {
      font-size: 8px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Secciones */
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e293b;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 3px;
      margin: 14px 0 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-badge {
      font-size: 8px;
      font-weight: 600;
      background: #e2e8f0;
      color: #334155;
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* Tablas Financieras */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9.5px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8px;
      letter-spacing: 0.5px;
      padding: 6px 8px;
      text-align: left;
    }
    th.text-right, td.text-right {
      text-align: right;
    }
    th.text-center, td.text-center {
      text-align: center;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    tfoot td {
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      border-top: 1.5px solid #0f172a;
    }

    /* Dos Columnas para Aging e Inventarios */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .box-panel {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      background: #ffffff;
    }

    /* Badges de Riesgo */
    .badge-ok { color: #047857; font-weight: 700; }
    .badge-warn { color: #b45309; font-weight: 700; }
    .badge-danger { color: #b91c1c; font-weight: 700; }

    /* Firmas de Auditoría */
    .signatures-box {
      margin-top: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      page-break-inside: avoid;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      padding-top: 6px;
      text-align: center;
      font-size: 8.5px;
    }
    .sig-name {
      font-weight: 800;
      color: #0f172a;
    }
    .sig-role {
      color: #64748b;
      font-size: 7.5px;
    }

    /* Footer Legal */
    .footer-legal {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 7.5px;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <!-- Encabezado Corporativo -->
  <div class="header-bar">
    <div>
      <h1 class="company-title">${html(tenant.nombreComercial || 'CONTROL ERP')}</h1>
      ${tenant.razonSocial ? `<p class="company-sub"><strong>Razón Social:</strong> ${html(tenant.razonSocial)}</p>` : ''}
      ${tenant.identificacionFiscal ? `<p class="company-sub"><strong>RFC:</strong> ${html(tenant.identificacionFiscal)}${tenant.regimenFiscal ? ` | <strong>Régimen:</strong> ${html(tenant.regimenFiscal)}` : ''}</p>` : ''}
      ${tenant.codigoPostal ? `<p class="company-sub"><strong>C.P.:</strong> ${html(tenant.codigoPostal)} • ` : '<p class="company-sub">'}Moneda: Pesos Mexicanos (MXN)</p>
    </div>
    <div class="doc-badge-box">
      <div class="doc-type">Reporte interno de saldos comerciales</div>
      <div class="doc-periodo">${html(periodo.mesNombre)} ${html(periodo.anio)}</div>
      <div class="doc-meta">Emisión: ${html(fechaEmision)}</div>
      <div class="doc-meta font-mono">Folio interno: BAL-${html(periodo.anio)}-${html(periodo.mesNumero)}</div>
    </div>
  </div>

  <!-- 4 KPIs de Alto Impacto -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Ventas Totales Emitidas</div>
      <div class="kpi-value font-mono">$${fmt(kpis.totalVendido)}</div>
      <div class="kpi-desc">${kpis.ventasCount} operaciones comerciales</div>
    </div>
    <div class="kpi-card" style="border-left-color: #10b981;">
      <div class="kpi-label">Cobranza Real Recaudada</div>
      <div class="kpi-value font-mono" style="color: #047857;">$${fmt(kpis.cobranzaMes)}</div>
      <div class="kpi-desc">Abonos aplicados a cartera</div>
    </div>
    <div class="kpi-card" style="border-left-color: #6366f1;">
      <div class="kpi-label">Compras & Abastecimiento</div>
      <div class="kpi-value font-mono">$${fmt(kpis.totalComprado)}</div>
      <div class="kpi-desc">${kpis.comprasCount} recepciones de proveedores</div>
    </div>
    <div class="kpi-card" style="border-left-color: #f59e0b;">
      <div class="kpi-label">Valuación de Existencias</div>
      <div class="kpi-value font-mono">$${fmt(kpis.valuacionTotal)}</div>
      <div class="kpi-desc">Costo promedio registrado</div>
    </div>
  </div>

  <!-- Dos Bloques: Aging de Cartera y Valuación Multialmacén -->
  <div class="two-col">
    <!-- Panel 1: Antigüedad de Saldos CxC -->
    <div class="box-panel">
      <div class="section-title" style="margin-top: 0;">
        <span>Segmentación de Cartera (CxC)</span>
        <span class="section-badge font-mono">Total: $${fmt(kpis.totalPorCobrar)}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Rango de Mora</th>
            <th class="text-right">Importe ($)</th>
            <th class="text-right">% Cartera</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong class="badge-ok">● Al Corriente (Vigente)</strong></td>
            <td class="text-right font-mono">$${fmt(antiguedad.vigente)}</td>
            <td class="text-right font-mono">${kpis.totalPorCobrar > 0 ? ((antiguedad.vigente / kpis.totalPorCobrar) * 100).toFixed(1) : 0}%</td>
          </tr>
          <tr>
            <td><strong class="badge-warn">● 1 a 30 Días de Mora</strong></td>
            <td class="text-right font-mono">$${fmt(antiguedad.dias1a30)}</td>
            <td class="text-right font-mono">${kpis.totalPorCobrar > 0 ? ((antiguedad.dias1a30 / kpis.totalPorCobrar) * 100).toFixed(1) : 0}%</td>
          </tr>
          <tr>
            <td><strong style="color: #ea580c;">● 31 a 60 Días de Mora</strong></td>
            <td class="text-right font-mono">$${fmt(antiguedad.dias31a60)}</td>
            <td class="text-right font-mono">${kpis.totalPorCobrar > 0 ? ((antiguedad.dias31a60 / kpis.totalPorCobrar) * 100).toFixed(1) : 0}%</td>
          </tr>
          <tr>
            <td><strong class="badge-danger">● +90 Días (Incobrables)</strong></td>
            <td class="text-right font-mono">$${fmt(antiguedad.mas90)}</td>
            <td class="text-right font-mono">${kpis.totalPorCobrar > 0 ? ((antiguedad.mas90 / kpis.totalPorCobrar) * 100).toFixed(1) : 0}%</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>MORA TOTAL VENCIDA</td>
            <td class="text-right font-mono" style="color: #fca5a5;">$${fmt(kpis.totalVencido)}</td>
            <td class="text-right font-mono">${pctMora}%</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Panel 2: Valuación de Existencias por Almacén -->
    <div class="box-panel">
      <div class="section-title" style="margin-top: 0;">
        <span>Valuación de inventario</span>
        <span class="section-badge font-mono">Activo: $${fmt(kpis.valuacionTotal)}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Almacén / Sucursal</th>
            <th class="text-center">Piezas</th>
            <th class="text-right">Valuación ($)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(valuacionPorAlmacen).map(([almNombre, val]) => `
            <tr>
              <td><strong>${html(almNombre)}</strong></td>
              <td class="text-center font-mono">${val.piezas.toLocaleString()} pzas</td>
              <td class="text-right font-mono">$${fmt(val.total)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL VALUADO ART. 28</td>
            <td class="text-center font-mono">${Object.values(valuacionPorAlmacen).reduce((a, b) => a + b.piezas, 0).toLocaleString()} pzas</td>
            <td class="text-right font-mono">$${fmt(kpis.valuacionTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  <!-- Balanza de Clientes Detallada (si aplica) -->
  ${balanzaClientes.length > 0 ? `
    <div class="section-title">
      <span>Balanza de Comprobación de Cuentas por Cobrar (Clientes)</span>
      <span class="section-badge">${balanzaClientes.length} Clientes Auditados</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Cliente / Razón Social</th>
          <th class="text-right">Cargos ($)</th>
          <th class="text-right">Abonos ($)</th>
          <th class="text-right">Saldo Insoluto ($)</th>
          <th class="text-center">Docs</th>
        </tr>
      </thead>
      <tbody>
        ${balanzaClientes.slice(0, 15).map(c => `
          <tr>
            <td class="font-mono" style="color: #64748b;">${html(c.codigo)}</td>
            <td><strong>${html(c.razonSocial)}</strong></td>
            <td class="text-right font-mono">$${fmt(c.cargos)}</td>
            <td class="text-right font-mono" style="color: #047857;">$${fmt(c.abonos)}</td>
            <td class="text-right font-mono font-bold" style="${c.saldoFinal > 0 ? 'color: #b91c1c;' : 'color: #64748b;'}">$${fmt(c.saldoFinal)}</td>
            <td class="text-center font-mono">${c.cuentas}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2">TOTAL CONSOLIDADO CARTERA</td>
          <td class="text-right font-mono">$${fmt(balanzaClientes.reduce((s, r) => s + r.cargos, 0))}</td>
          <td class="text-right font-mono" style="color: #86efac;">$${fmt(balanzaClientes.reduce((s, r) => s + r.abonos, 0))}</td>
          <td class="text-right font-mono" style="color: #fca5a5;">$${fmt(balanzaClientes.reduce((s, r) => s + r.saldoFinal, 0))}</td>
          <td class="text-center font-mono">${balanzaClientes.reduce((s, r) => s + r.cuentas, 0)}</td>
        </tr>
      </tfoot>
    </table>
  ` : ''}

  <!-- Indicadores operativos -->
  <div class="box-panel" style="margin-top: 10px; background: #f8fafc; border-left: 3px solid #0ea5e9;">
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px;">
      <div>
        <strong>Razón de Liquidez Circulante:</strong> <span class="font-mono font-bold" style="color: #0284c7;">${ratioLiquidez}x</span> (Activo Circulante / Pasivo Corto Plazo)
      </div>
      <div>
        <strong>Pasivo con Proveedores (CxP):</strong> <span class="font-mono font-bold">$${fmt(kpis.totalPorPagar)}</span>
      </div>
      <div>
        <strong>Alcance:</strong> <span>Reporte operativo interno; requiere revisión contable antes de uso fiscal.</span>
      </div>
    </div>
  </div>

  <div class="box-panel" style="margin-top: 12px;">Reporte interno de control. No es un dictamen, no está certificado y requiere revisión contable antes de uso fiscal.</div>

  <!-- Footer -->
  <div class="footer-legal">
    <div>ControlERP · Reporte interno</div>
    <div>Generado para consulta y conciliación operativa</div>
    <div>Página 1 de 1</div>
  </div>

</body>
</html>
  `;
}

/**
 * Imprime el documento de alta fidelidad utilizando un iframe invisible para evitar bloqueadores de popups.
 */
export function imprimirDictamenBalanza(data: BalanzaExportData): void {
  const html = generarDictamenBalanzaHtml(data);

  if (typeof window === 'undefined') return;

  // Crear o reutilizar un iframe invisible dedicado para la impresión
  let iframe = document.getElementById('balanza-print-frame') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'balanza-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.bottom = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    // Esperar a que los estilos se apliquen y disparar impresión
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Error al imprimir mediante iframe:', err);
        // Fallback popup
        const printWindow = window.open('', '_blank', 'width=950,height=800');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 300);
        }
      }
    }, 300);
  }
}

/**
 * Genera y descarga un archivo CSV estructurado y enriquecido con formato formal de auditoría.
 */
export function exportarBalanzaCsvEnriquecido(data: BalanzaExportData): void {
  const { tenant, periodo, kpis, antiguedad, valuacionPorAlmacen, balanzaClientes = [] } = data;

  const filas: Array<Array<string | number | null | undefined>> = [
    ['REPORTE INTERNO DE SALDOS COMERCIALES'],
    ['Empresa', tenant.razonSocial || tenant.nombreComercial || 'Sin nombre registrado'],
    ...(tenant.identificacionFiscal ? [['RFC', tenant.identificacionFiscal]] : []),
    ...(tenant.regimenFiscal ? [['Régimen fiscal', tenant.regimenFiscal]] : []),
    ['Periodo', `${periodo.mesNombre} ${periodo.anio}`], ['Emitido', new Date().toLocaleString('es-MX')], [],
    ['Resumen', 'Monto MXN', 'Detalle'],
    ['Ventas registradas', kpis.totalVendido, `${kpis.ventasCount} operaciones comerciales`],
    ['Cobranza recibida', kpis.cobranzaMes, 'Abonos aplicados a clientes'],
    ['Compras a proveedores', kpis.totalComprado, `${kpis.comprasCount} recepciones registradas`],
    ['Pagos a proveedores', kpis.pagosProveedoresMes, 'Pagos del periodo'],
    ['Cartera por cobrar', kpis.totalPorCobrar, 'Saldo pendiente de clientes'],
    ['Cartera vencida', kpis.totalVencido, 'Saldo vencido de clientes'],
    ['Saldo por pagar', kpis.totalPorPagar, 'Obligaciones pendientes con proveedores'],
    ['Valor de inventario', kpis.valuacionTotal, 'Según costo promedio registrado'], [],
    ['Antigüedad', 'Importe MXN', 'Porcentaje de cartera'],
    ['Vigente', antiguedad.vigente, `${kpis.totalPorCobrar > 0 ? ((antiguedad.vigente / kpis.totalPorCobrar) * 100).toFixed(2) : 0}%`],
    ['1 a 30 días', antiguedad.dias1a30, `${kpis.totalPorCobrar > 0 ? ((antiguedad.dias1a30 / kpis.totalPorCobrar) * 100).toFixed(2) : 0}%`],
    ['31 a 60 días', antiguedad.dias31a60, `${kpis.totalPorCobrar > 0 ? ((antiguedad.dias31a60 / kpis.totalPorCobrar) * 100).toFixed(2) : 0}%`],
    ['Más de 90 días', antiguedad.mas90, `${kpis.totalPorCobrar > 0 ? ((antiguedad.mas90 / kpis.totalPorCobrar) * 100).toFixed(2) : 0}%`], [],
    ['Existencias por almacén', 'Piezas', 'Valor MXN', 'Método'],
    ...Object.entries(valuacionPorAlmacen).map(([alm, val]) => [alm, val.piezas, val.total, 'Costo promedio registrado']),
  ];
  if (balanzaClientes.length) {
    filas.push([], ['Cartera de clientes', 'Código', 'Cliente', 'Cargos', 'Abonos', 'Saldo', 'Documentos pendientes']);
    for (const c of balanzaClientes) filas.push(['', c.codigo, c.razonSocial, c.cargos, c.abonos, c.saldoFinal, c.cuentas]);
  }
  filas.push([], ['Documento interno de control. Requiere revisión contable antes de cualquier uso fiscal.']);

  const csv = construirCsv(filas, ['sep=,']);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Reporte_Saldos_${periodo.anio}_${periodo.mesNumero}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
