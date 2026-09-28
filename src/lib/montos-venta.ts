// Cantidades con hasta 6 decimales y precios con hasta 2; importes en centavos.
// Compartido por servidor y pantalla: redondeo por partida, luego IVA 16%.
export function calcularMontosVenta(items: { cantidad: number; precioUnitario: number; descuento?: number }[]) {
  const escala = BigInt(1000000);
  const partidasCentavos = items.map(it => {
    if (!Number.isFinite(it.cantidad) || !Number.isFinite(it.precioUnitario)
      || it.cantidad < 0 || it.precioUnitario < 0) throw new Error('Importe inválido');
    const cantidad = BigInt(it.cantidad.toFixed(6).replace('.', ''));
    const precio = BigInt(it.precioUnitario.toFixed(2).replace('.', ''));
    const bruto = (cantidad * precio + escala / BigInt(2)) / escala;
    const descuento = it.descuento ?? 0;
    if (!Number.isFinite(descuento) || descuento < 0 || Number(descuento.toFixed(2)) !== descuento) throw new Error('Descuento inválido');
    const neto = bruto - BigInt(descuento.toFixed(2).replace('.', ''));
    if (neto < BigInt(0)) throw new Error('Descuento mayor al importe de la partida');
    return neto;
  });
  const subtotal = partidasCentavos.reduce((s, n) => s + n, BigInt(0));
  const impuestos = (subtotal * BigInt(16) + BigInt(50)) / BigInt(100);
  if (subtotal + impuestos > BigInt(100000000000000)) throw new Error('El total excede el máximo permitido');
  return { partidas: partidasCentavos.map(n => Number(n) / 100), subtotal: Number(subtotal) / 100,
    impuestos: Number(impuestos) / 100, total: Number(subtotal + impuestos) / 100 };
}
