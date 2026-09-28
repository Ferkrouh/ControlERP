import assert from 'node:assert/strict';
import { sendFacturaEmail, sendRepEmail } from '../src/lib/email-service';

async function main() {
  await assert.rejects(sendFacturaEmail({}), /no disponible sin PAC/);
  await assert.rejects(sendRepEmail({}), /no disponible sin PAC/);
  console.log('PASS rutas de correo fiscal bloqueadas en el piloto; no se envió ningún mensaje.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
