'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, FileSpreadsheet, AlertTriangle, TrendingDown } from 'lucide-react';

interface ClienteRow {
  clienteId: string;
  razonSocial: string;
  codigo: string;
  cargos: number;
  abonos: number;
  saldoFinal: number;
  cuentas: number;
}

interface BalanzaData {
  mes: string;
  anio: string;
  rows: ClienteRow[];
  totales: { totalCargos: number; totalAbonos: number; totalSaldoFinal: number };
}

interface Props {
  mes: string;
  anio: string;
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });

export default function BalanzaCxCReport({ mes, anio }: Props) {
  const [data, setData] = useState<BalanzaData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/balanza-cxc?mes=${mes}&anio=${anio}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportCSV = () => {
    if (!data) return;
    const header = 'Código,Razón Social,Cargos,Abonos,Saldo Final,Cuentas';
    const rows = data.rows.map((r) =>
      `${r.codigo},"${r.razonSocial}",${r.cargos},${r.abonos},${r.saldoFinal},${r.cuentas}`
    ).join('\n');
    const csv = `data:text/csv;charset=utf-8,${header}\n${rows}`;
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `Balanza_CxC_${anio}_${mes}.csv`);
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
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Sin datos de CxC para este período</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Cargos', value: data.totales.totalCargos, color: 'text-slate-900' },
          { label: 'Total Abonos', value: data.totales.totalAbonos, color: 'text-emerald-700' },
          { label: 'Saldo Pendiente', value: data.totales.totalSaldoFinal, color: 'text-rose-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{kpi.label}</p>
            <p className={`font-mono font-bold text-lg mt-1 ${kpi.color}`}>${fmt(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex justify-end">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl transition-all active:scale-95"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Código</th>
              <th className="text-left px-4 py-2.5 font-semibold">Razón Social</th>
              <th className="text-right px-4 py-2.5 font-semibold">Cargos</th>
              <th className="text-right px-4 py-2.5 font-semibold">Abonos</th>
              <th className="text-right px-4 py-2.5 font-semibold">Saldo Final</th>
              <th className="text-center px-4 py-2.5 font-semibold">Docs.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rows.map((r) => (
              <tr key={r.clienteId} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-mono text-slate-500">{r.codigo}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{r.razonSocial}</td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-700">${fmt(r.cargos)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-emerald-700">${fmt(r.abonos)}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`font-mono font-bold ${r.saldoFinal > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                    ${fmt(r.saldoFinal)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center text-slate-400">{r.cuentas}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900 text-white text-xs font-bold">
            <tr>
              <td colSpan={2} className="px-4 py-2.5 font-semibold">TOTAL</td>
              <td className="px-4 py-2.5 text-right font-mono">${fmt(data.totales.totalCargos)}</td>
              <td className="px-4 py-2.5 text-right font-mono text-emerald-300">${fmt(data.totales.totalAbonos)}</td>
              <td className="px-4 py-2.5 text-right font-mono text-rose-300">${fmt(data.totales.totalSaldoFinal)}</td>
              <td className="px-4 py-2.5 text-center">{data.rows.reduce((s, r) => s + r.cuentas, 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {data.totales.totalSaldoFinal > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <span>
            Cartera pendiente de <strong className="font-mono">${fmt(data.totales.totalSaldoFinal)}</strong>.
            Revise la antigüedad de saldos para identificar cuentas en mora.
          </span>
        </div>
      )}
    </div>
  );
}
