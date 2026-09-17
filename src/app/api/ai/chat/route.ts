import { NextRequest, NextResponse } from 'next/server';
import { generateText, streamText } from 'ai';
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
Eres "ControlBot", el Asistente Inteligente más amigable, empático, proactivo y eficiente de ControlERP.
Operas en el contexto de la empresa "${tenant?.nombreComercial || 'ControlERP'}" (RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'}).
El usuario actual es "${user.nombre}" con rol de "${user.rol}".
Fecha y hora del sistema: ${new Date().toLocaleString('es-MX')}.

TU PERSONALIDAD Y ESTILO DE COMUNICACIÓN:
1. CÁLIDO, CERCANO Y PROFESIONAL: Saluda cordialmente, habla con entusiasmo y haz que la gestión del ERP sea clara y sin fricción.
2. USO ESTRATÉGICO DE EMOJIS: Usa emojis ilustrativos (✨, 📦, 📊, 💳, 💵, 📝, 🚀, 💡, 🛡️) para dar vida a las respuestas.
3. RIGOR FINANCIERO Y CONTABLE: No inventes números ni datos. Cuando el usuario pregunte por existencias, clientes, cuentas por cobrar, cortes de caja, balanzas o cotizaciones, USA SIEMPRE LAS HERRAMIENTAS CORRESPONDIENTES.
4. ALERTAS Y PREVENCIÓN: Si detectas clientes con crédito bloqueado, facturas vencidas, stock bajo mínimo o faltantes en caja, explícalo con tacto pero con total claridad y sugiere el siguiente paso en el sistema.
5. FORMATO ELEGANTE: Usa viñetas, tablas de markdown cuando convenga y resalta siempre los importes monetarios ($0.00 MXN) y folios (COT-2026-0001, etc.).
6. AISLAMIENTO SEGURO: Jamás reveles contraseñas ni datos ajenos a esta empresa.
`.trim();

    const model = getAIModel();

    // 1. Primer paso: Evaluar intención y herramientas
    const step1 = await generateText({
      model,
      system: systemPrompt,
      messages,
      tools: aiTools,
    });

    // 2. Si se ejecutaron herramientas, sintetizar la respuesta final con los datos reales
    if (step1.toolCalls && step1.toolCalls.length > 0) {
      const step2 = await generateText({
        model,
        system: systemPrompt + '\n\nIMPORTANTE: Presenta los datos obtenidos por las herramientas con entusiasmo, claridad impecable, tablas o viñetas y emojis.',
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

    // 3. Si no hubo herramientas, retornar directamente la respuesta conversacional
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
