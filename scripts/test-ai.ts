import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';
import { getAITools } from '../src/lib/ai/tools';
import { prisma } from '../src/lib/prisma';

async function testFullBackendFlow() {
  console.log('--- Iniciando prueba de comunicación de ControlBot con base de datos real ---');
  
  const apiKey = process.env.GROQ_API_KEY || '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';
  const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
  });

  const model = groq.chat('openai/gpt-oss-120b');

  // Buscar primer tenant real
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('No hay tenant registrado.');
    return;
  }

  const aiTools = getAITools({
    tenantId: tenant.id,
    userRol: 'ADMIN',
    userId: 'test-user',
    userNombre: 'Administrador Demo',
  });

  const personalityPrompt = `
Eres "ControlBot", el Asistente Inteligente más amigable, empático, proactivo y eficiente de ControlERP.
Tu personalidad es cálida, entusiasta y sumamente profesional.
- Utiliza emojis estratégicos (✨, 📦, 📊, 💳, 🚀, 💡, 🛡️) para hacer la información amena y visual.
- Cuando des números, dales formato legible en moneda ($0.00 MXN) o piezas.
- Si una operación fue exitosa, celebra el resultado con ánimo positivo.
- Si detectas problemas (clientes en mora, stock bajo mínimo o faltantes en caja), adviértelo con claridad y propone una solución preventiva.
- Mantén siempre un trato respetuoso, cercano y enfocado en hacerle la vida más fácil al usuario.
`.trim();

  // Caso 1: Pregunta conceptual sin herramientas
  console.log('\n[PRUEBA 1] Pregunta conceptual: "¿Qué es un corte Z y por qué es importante?"');
  const res1 = await generateText({
    model,
    system: personalityPrompt,
    prompt: '¿Qué es un corte Z y por qué es importante en el punto de venta?',
  });
  console.log('✅ RESPUESTA 1:\n', res1.text);

  // Caso 2: Pregunta transaccional con herramienta (Stock)
  console.log('\n[PRUEBA 2] Pregunta de stock con herramienta: "¿Tenemos stock disponible en almacén?"');
  
  const res2Step1 = await generateText({
    model,
    system: personalityPrompt,
    prompt: '¿Tenemos stock de productos en almacén? Dame un resumen rápido de existencias.',
    tools: aiTools,
  });

  if (res2Step1.toolCalls.length > 0) {
    console.log(`Tool ejecutada: ${res2Step1.toolCalls[0].toolName}`);
    
    const res2Final = await generateText({
      model,
      system: personalityPrompt,
      messages: [
        { role: 'user', content: '¿Tenemos stock de productos en almacén? Dame un resumen rápido de existencias.' },
        ...res2Step1.responseMessages,
      ],
    });
    console.log('✅ RESPUESTA 2:\n', res2Final.text);
  } else {
    console.log('✅ RESPUESTA DIRECTA 2:\n', res2Step1.text);
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE COMUNICACIÓN COMPLETADAS EXITOSAMENTE!');
}

testFullBackendFlow();
