import { createOpenAI } from '@ai-sdk/openai';

/**
 * Proveedor de Modelos de Lenguaje para ControlERP
 * Conectado a Groq Cloud con compatibilidad estándar de OpenAI / Vercel AI SDK.
 */
export function getAIModel() {
  const apiKey = process.env.GROQ_API_KEY || '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';
  const modelName = process.env.AI_MODEL || 'openai/gpt-oss-120b';

  const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
  });

  // groq.chat fuerza el uso del endpoint compatible /chat/completions en Groq
  return groq.chat(modelName);
}
