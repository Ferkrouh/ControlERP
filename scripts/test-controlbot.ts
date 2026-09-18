import { prisma } from '../src/lib/prisma';
import { generateText } from 'ai';
import { getAIModel } from '../src/lib/ai/provider';
import { getAITools } from '../src/lib/ai/tools';

async function testQuery(prompt: string) {
  const tenant = await prisma.tenant.findFirst({
    include: {
      usuarios: true,
      clientes: true,
      productos: true,
    },
  });

  const user = tenant!.usuarios[0];
  const aiTools = getAITools({
    tenantId: tenant!.id,
    userRol: user.rol,
    userId: user.id,
    userNombre: user.nombre,
  });

  const model = getAIModel();
  const systemPrompt = `
Eres "ControlBot", el Asistente Ejecutivo Inteligente y Asesor Operativo-Financiero de ControlERP ("The Fintech Ledger").
Operas para la empresa "${tenant?.nombreComercial || 'ControlERP'}" (RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'}).
Usuario actual: "${user.nombre}" (${user.rol}).
Fecha y hora del sistema: ${new Date().toLocaleString('es-MX')}.

ESTÁNDAR DE COMUNICACIÓN EJECUTIVA:
1. Semáforo / Conclusión principal primero.
2. Mini tabla o resumen conciso.
3. Enlaces directos de acción rápida en markdown.
  `.trim();

  let currentMessages: any[] = [{ role: 'user', content: prompt }];
  let finalResponseText = '';

  for (let turn = 0; turn < 4; turn++) {
    const response = await generateText({
      model,
      system: systemPrompt,
      messages: currentMessages,
      tools: aiTools,
    });

    if (response.toolCalls && response.toolCalls.length > 0) {
      currentMessages = [...currentMessages, ...response.responseMessages];
    } else {
      finalResponseText = response.text;
      break;
    }
  }

  if (!finalResponseText && currentMessages.length > 1) {
    const synth = await generateText({
      model,
      system: systemPrompt + '\n\nSintetiza la respuesta ejecutiva final para el usuario explicando el resultado de las herramientas ejecutadas.',
      messages: currentMessages,
      tools: aiTools,
    });
    finalResponseText = synth.text;
  }

  console.log(`\n💬 USUARIO: "${prompt}"`);
  console.log(`🤖 CONTROLBOT:\n${finalResponseText}\n----------------------------------`);
}

async function runAll() {
  await testQuery('¿Cuál es el saldo y límite de crédito de Comercializadora San Pedro?');
  await testQuery('¿Cuánto tenemos en existencias del rotomartillo y en qué almacenes?');
}

runAll().finally(() => prisma.$disconnect());
