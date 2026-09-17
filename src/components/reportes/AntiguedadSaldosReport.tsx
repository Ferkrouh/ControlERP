'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, FileSpreadsheet } from 'lucide-react';

interface ClienteBucket {
  clienteId: string;
  razonSocial: string;
  codigo: string;
  vigente: number;
  dias1a30: number;
  dias31a60: number;
  dias61a90: number;
  mas90: number;
  total: number;
  cuentas: number;
}

interface AntiguedadData {
  rows: ClienteBucket[];
  totales: {
    vigente: number; dias1a30: number; dias31a60: number;
    dias61a90: number; mas90: number; total: number;
  };
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });

interface Props { mes: string; anio: string }

export default function AntiguedadSaldosReport({ mes, anio }: Props) {
  const [data, setData] = useState<AntiguedadData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/antiguedad-saldos?mes=${mes}&anio=${anio}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportCSV = () => {
    if (!data) return;
    const header = 'Código,Razón Social,Vigente,1-30 Días,31-60 Días,61-90 Días,+90 Días,Total';
    const rows = data.rows.map((r) =>
      `${r.codigo},"${r.razonSocial}",${r.vigente},${r.dias1a30},${r.dias31a60},${r.dias61a90},${r.mas90},${r.total}`
    ).join('\n');
    const csv = `data:text/csv;charset=utf-8,${header}\n${rows}`;
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `Antiguedad_Saldos_${anio}_${mes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-slate-200 rounded-xl" />)}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Sin saldos pendientes al día de hoy</p>
      </div>
    );
  }

  const buckets = [
    { key: 'vigente', label: 'Vigente', color: 'text-emerald-700 bg-emerald-50', borderColor: 'border-emerald-200' },
    { key: 'dias1a30', label: '1-30 días', color: 'text-amber-700 bg-amber-50', borderColor: 'border-amber-200' },
    { key: 'dias31a60', label: '31-60 días', color: 'text-orange-700 bg-orange-50', borderColor: 'border-orange-200' },
    { key: 'dias61a90', label: '61-90 días', color: 'text-rose-600 bg-rose-50', borderColor: 'border-rose-200' },
    { key: 'mas90', label: '+90 días', color: 'text-rose-800 bg-rose-100', borderColor: 'border-rose-300' },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Resumen de antigüedad */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {buckets.map((b) => (
          <div key={b.key} className={`rounded-xl border p-3 ${b.borderColor}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{b.label}</p>
            <p className={`font-mono font-bold text-sm mt-1 ${b.color.split(' ')[0]}`}>
              ${fmt(data.totales[b.key])}
            </p>
          </div>
        ))}
      </div>

      {/* Barra de progreso visual */}
      {data.totales.total > 0 && (
        <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
          <p className="text-xs font-semibold text-slate-600 mb-2">Distribución de Cartera</p>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {buckets.map((b) => {
              const pct = (data.totales[b.key] / data.totales.total) * 100;
              return pct > 0 ? (
                <div
                  key={b.key}
                  style={{ width: `${pct}%` }}
                  className={`${b.color.split(' ')[1]} transition-all`}
                  title={`${b.label}: ${pct.toFixed(1)}%`}
                />
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-end">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl transition-all active:scale-95"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>

      {/* Tabla por cliente */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Cliente</th>
              <th className="text-right px-3 py-2.5 font-semibold">Vigente</th>
              <th className="text-right px-3 py-2.5 font-semibold">1-30d</th>
              <th className="text-right px-3 py-2.5 font-semibold">31-60d</th>
              <th className="text-right px-3 py-2.5 font-semibold">61-90d</th>
              <th className="text-right px-3 py-2.5 font-semibold text-rose-700">+90d</th>
              <th className="text-right px-4 py-2.5 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rows.map((r) => (
              <tr key={r.clienteId} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-slate-900">{r.razonSocial}</p>
                  <p className="text-slate-400 font-mono">{r.codigo}</p>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-emerald-700">${fmt(r.vigente)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-amber-700">${fmt(r.dias1a30)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-orange-600">${fmt(r.dias31a60)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-rose-600">${fmt(r.dias61a90)}</td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-800">${fmt(r.mas90)}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">${fmt(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900 text-white text-xs font-bold">
            <tr>
              <td className="px-4 py-2.5 font-semibold">TOTAL GENERAL</td>
              <td className="px-3 py-2.5 text-right font-mono text-emerald-300">${fmt(data.totales.vigente)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-amber-200">${fmt(data.totales.dias1a30)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-orange-200">${fmt(data.totales.dias31a60)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-rose-300">${fmt(data.totales.dias61a90)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-rose-200">${fmt(data.totales.mas90)}</td>
              <td className="px-4 py-2.5 text-right font-mono">${fmt(data.totales.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {data.totales.mas90 > 0 && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <span>
            <strong className="font-mono">${fmt(data.totales.mas90)}</strong> en cartera crítica (+90 días).
            Se recomienda iniciar gestión de cobranza judicial o extrajudicial.
          </span>
        </div>
      )}
    </div>
  );
}
