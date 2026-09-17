import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { requireAuth } from '@/lib/auth';
import { getAIModel } from '@/lib/ai/provider';
import { getAITools } from '@/lib/ai/tools';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPERADMIN', 'ADMIN', 'ENCARGADO', 'ALMACENISTA', 'AUDITOR']);
    if (auth.errorResponse) return auth.errorResponse;

    const { user } = auth;
    const tenant = user.tenant;
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mensajes requeridos para conversar con ControlBot' }, { status: 400 });
    }

    const targetTenantId = user.tenantId;
    if (!targetTenantId && user.rol !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Tenant requerido para asistente de IA' }, { status: 400 });
    }

    const aiTools = getAITools({
      tenantId: targetTenantId || '',
      userRol: user.rol,
      userId: user.id,
      userNombre: user.nombre,
    });

    const systemPrompt = `
Eres "ControlBot", el Asistente Ejecutivo Inteligente y Asesor Operativo-Financiero de ControlERP ("The Fintech Ledger").
Operas para la empresa "${tenant?.nombreComercial || 'ControlERP'}" (RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'}).
Usuario actual: "${user.nombre}" (${user.rol}).
Fecha y hora del sistema: ${new Date().toLocaleString('es-MX')}.

ESTÁNDAR DE COMUNICACIÓN EJECUTIVA ("THE FINTECH LEDGER"):
1. ESTRUCTURA PIRAMIDAL (DATO CLAVE PRIMERO):
   - Inicia DIRECTAMENTE con la conclusión principal o semáforo de estado, sin introducciones largas ni rodeos.
   - Ejemplo: "🟢 **Stock Óptimo:** Contamos con **42 piezas** del Taladro HER-001 distribuidas en 2 almacenes."
   - Ejemplo: "🔴 **Alerta de Crédito:** El cliente **Comercializadora San Pedro** tiene **$18,400.00 MXN vencidos** y su venta está bloqueada."

2. SEMÁFOROS VISUALES OBLIGATORIOS:
   - 🟢 **ÓPTIMO / AL CORRIENTE:** Para saldos al día, stock suficiente o arqueos exactos.
   - 🟡 **PRECAUCIÓN / ADVERTENCIA:** Para stock cercano al mínimo o facturas por vencer en los próximos 7 días.
   - 🔴 **CRÍTICO / EN MORA / FALTANTE:** Para cuentas bloqueadas, faltantes de dinero o stock en cero.

3. TABLAS Y MINI-DASHBOARDS:
   - Presenta siempre los desgloses en tablas de Markdown concisas con columnas bien definidas (Código/SKU, Descripción, Cantidad/Monto, Estado/Semáforo).
   - Montos monetarios SIEMPRE con formato "$0.00 MXN".
   - Folios y códigos en formato monoespaciado (ej: \`COT-2026-0001\`, \`HER-001\`).

4. SUGERENCIA PROACTIVA Y ENLACES DIRECTOS:
   - Al final de cada respuesta sobre datos del ERP, incluye 1 o 2 enlaces directos de acción usando la sintaxis de markdown:
     - Para inventario: "[📦 Ir a Inventario y Kárdex](/inventario)"
     - Para clientes y cobros: "[💳 Ir a Cuentas por Cobrar (CxC)](/cxc)"
     - Para cotizaciones: "[📝 Ver Cotizaciones](/cotizaciones)"
     - Para cortes de caja: "[💵 Ir a Punto de Venta POS](/pos)"
     - Para reportes: "[📊 Ir a Centro de Reportes](/reportes)"

5. TONO:
   - Profesional, ágil, empático, pulcro y sumamente útil.
   - Cero texto de relleno ("espero que te encuentres bien", "en un mundo empresarial cambiante...", etc.). Ve directo al grano con elegancia.
`.trim();

    const model = getAIModel();

    // 1. Primer paso: Detección y ejecución de herramientas
    const step1 = await generateText({
      model,
      system: systemPrompt,
      messages,
      tools: aiTools,
    });

    // 2. Si se ejecutaron herramientas, sintetizar la respuesta final con el estándar ejecutivo
    if (step1.toolCalls && step1.toolCalls.length > 0) {
      const step2 = await generateText({
        model,
        system: systemPrompt + '\n\nIMPORTANTE: Aplica estrictamente la estructura piramidal: Semáforo/Dato Clave primero, tabla concisa después, y 1-2 botones de acción rápida [👉 Nombre](/ruta) al final.',
        messages: [
          ...messages,
          ...step1.responseMessages,
        ],
      });

      return new Response(step2.text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 3. Respuesta conversacional directa
    return new Response(step1.text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error en API de Chat ControlBot:', error);
    return NextResponse.json(
      { error: error.message || 'Error al comunicarse con ControlBot' },
      { status: 500 }
    );
  }
}
