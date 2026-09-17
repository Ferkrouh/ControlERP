import { prisma } from '../src/lib/prisma';
import { signToken, COOKIE_NAME } from '../src/lib/auth';

async function testLiveApi() {
  console.log('=== TEST EN VIVO DE COMUNICACIÓN CON CONTROLLBOT (/api/ai/chat) ===');
  
  const user = await prisma.usuario.findFirst({
    where: { rol: 'ADMIN' },
    include: { tenant: true },
  });

  if (!user) {
    console.error('No se encontró usuario ADMIN.');
    return;
  }

  console.log(`Usuario autenticado: ${user.nombre} (${user.rol}) - Tenant: ${user.tenant?.nombreComercial}`);
  
  const token = await signToken({
    id: user.id,
    email: user.email,
    rol: user.rol,
    tenantId: user.tenantId,
  });

  const pregunta = 'Hola ControlBot, preséntate brevemente y dime qué herramientas tienes disponibles para este negocio.';
  console.log(`\nEnviando pregunta a http://localhost:3222/api/ai/chat: "${pregunta}"...\n`);

  try {
    const res = await fetch('http://localhost:3222/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: pregunta }
        ],
      }),
    });

    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log('\n--- RESPUESTA RECIBIDA DE CONTROLBOT ---');
    console.log(text);
    console.log('----------------------------------------\n');
    
    if (res.ok && text.length > 20) {
      console.log('🎉 ✅ PRUEBA EN VIVO: 100% EXITOSA. ControlBot responde fluidamente.');
    } else {
      console.error('❌ Error en respuesta');
    }
  } catch (err: any) {
    console.error('Error al conectar con servidor local:', err.message);
  }
}

testLiveApi();
