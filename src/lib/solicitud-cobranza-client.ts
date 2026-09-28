'use client';
type Abono = { monto: number; metodo: string; referencia: string; timbrarRep: false };
type Pendiente = { clave: string; documentoId: string; body: Abono };
export function leerAbonoPendiente(scope: string): Pendiente | null {
  const raw = sessionStorage.getItem(`abono-pendiente:${scope}`); if (!raw) return null;
  const p = JSON.parse(raw) as Pendiente;
  if (!p.clave || !p.documentoId || !p.body || !Number.isFinite(p.body.monto)) throw new Error('Solicitud pendiente inválida; solicite conciliación antes de volver a cobrar');
  return p;
}
export async function enviarAbono(scope: string, documentoId: string, body: Abono) {
  const previa = leerAbonoPendiente(scope);
  if (previa && (previa.documentoId !== documentoId || JSON.stringify(previa.body) !== JSON.stringify(body)))
    throw new Error('Hay un abono pendiente de confirmar. Recargue para recuperar la solicitud original antes de iniciar otro.');
  const p = previa ?? { clave: crypto.randomUUID(), documentoId, body };
  sessionStorage.setItem(`abono-pendiente:${scope}`, JSON.stringify(p));
  const res = await fetch(`/api/cxc/${encodeURIComponent(p.documentoId)}/abono`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': p.clave }, body: JSON.stringify(p.body) });
  const data = await res.json();
  if (res.ok || data.solicitudRechazada === true) sessionStorage.removeItem(`abono-pendiente:${scope}`);
  return { res, data };
}
