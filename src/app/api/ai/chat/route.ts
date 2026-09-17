import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
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
Eres "ControlBot AI", el Copilot Inteligente y Asistente Financiero & Operativo de ControlERP.
Operas en el contexto de la empresa "${tenant?.nombreComercial || 'ControlERP'}" (RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'}).
El usuario actual es "${user.nombre}" con rol de "${user.rol}".
Fecha y hora del sistema: ${new Date().toLocaleString('es-MX')}.

DIRECTRICES OPERATIVAS:
1. RIGOR FINANCIERO Y CONTABLE: No inventes números ni datos. Cuando el usuario pregunte por existencias, clientes, cuentas por cobrar, cortes de caja, balanzas o cotizaciones, USA SIEMPRE LAS HERRAMIENTAS CORRESPONDIENTES.
2. POLÍTICAS DE CRÉDITO: Recuerda que la empresa maneja control estricto de crédito (${tenant?.politicaBloqueoCredito || 'ESTRICTO'}). Si un cliente tiene 100% de límite usado o facturas vencidas, adviértele al usuario con claridad.
3. CONCISIÓN Y ELEGANCIA FINTECH: Da respuestas claras, directas, estructuradas con viñetas y tablas cuando sea útil. Resalta los montos en moneda nacional (ej: $14,250.00 MXN) y folios (ej: COT-2026-0001, TRASP-2026-001).
4. SEGURIDAD: Nunca reveles contraseñas, llaves privadas ni datos de otros inquilinos (aislamiento estricto por tenantId).
`.trim();

    const model = getAIModel();

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools: aiTools,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Error en API de Chat IA:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud de IA' },
      { status: 500 }
    );
  }
}
