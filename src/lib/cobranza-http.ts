import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { VentaError } from './ventas';
export function errorCobranza(error: unknown) {
  if (error instanceof VentaError) return NextResponse.json({ error: error.message, solicitudRechazada: !error.conservarSolicitud }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: 'Revise monto, método y campos de la solicitud', solicitudRechazada: true }, { status: 400 });
  console.error('Error de cobranza:', error);
  return NextResponse.json({ error: 'No se pudo confirmar el resultado. Reintente con la misma solicitud.' }, { status: 500 });
}
