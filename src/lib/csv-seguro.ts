export type ValorCsv = string | number | boolean | null | undefined;

export function celdaCsv(value: ValorCsv): string {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Número no finito en CSV');
  let text = value == null ? '' : String(value);
  if (typeof value === 'string' && /^[\s\uFEFF]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function construirCsv(filas: ValorCsv[][], prefacio: string[] = []): string {
  return '\uFEFF' + [...prefacio, ...filas.map(row => row.map(celdaCsv).join(','))].join('\r\n') + '\r\n';
}

export function descargarCsv(nombre: string, filas: ValorCsv[][], prefacio: string[] = []) {
  const blob = new Blob([construirCsv(filas, prefacio)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = nombre;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
