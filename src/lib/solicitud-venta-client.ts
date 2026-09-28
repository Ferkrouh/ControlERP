'use client';

type Pendiente = { clave: string; body: Record<string, any> };
export function leerVentaPendiente(scope: string): Pendiente | null {
  const raw = sessionStorage.getItem(`venta-pendiente:${scope}`);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Pendiente;
  if (!parsed.clave || !parsed.body) throw new Error('Solicitud pendiente inválida; solicite revisión antes de volver a cobrar');
  return parsed;
}

export async function enviarSolicitudVenta(scope: string, body: Record<string, any>) {
  const storageKey = `venta-pendiente:${scope}`;
  const previa = leerVentaPendiente(scope);
  if (previa && JSON.stringify(previa.body) !== JSON.stringify(body)) {
    throw new Error('Hay una venta pendiente de confirmar. Recargue la página para recuperar sus datos y reintentar antes de iniciar otra venta.');
  }
  const pendiente = previa || { clave: crypto.randomUUID(), body };
  // Persistir ANTES de enviar: si no hay almacenamiento, no arriesgar una venta sin clave recuperable.
  sessionStorage.setItem(storageKey, JSON.stringify(pendiente));
  const res = await fetch('/api/ventas', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': pendiente.clave }, body: JSON.stringify(pendiente.body) });
  const data = await res.json();
  if (res.ok || data.solicitudRechazada === true) sessionStorage.removeItem(storageKey);
  return { res, data };
}
