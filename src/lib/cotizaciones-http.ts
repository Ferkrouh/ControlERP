import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { VentaError } from './ventas';

export function errorCotizacion(error: unknown) {
  if (error instanceof VentaError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: 'Datos de cotización inválidos; revise versión, partidas e importes' }, { status: 400 });
  if (['P2034', 'P1008', 'P2028', 'P2002', 'P2025'].includes((error as { code?: string }).code || '')) {
    return NextResponse.json({ error: 'La cotización cambió durante la operación; recargue y revise antes de continuar' }, { status: 409 });
  }
  console.error('Error al operar cotización:', error);
  return NextResponse.json({ error: 'Error al operar cotización' }, { status: 500 });
}
