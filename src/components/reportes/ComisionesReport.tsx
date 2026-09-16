'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Users } from 'lucide-react';

interface VendedorRow {
  usuarioId: string; nombre: string; numVentas: number;
  totalVendido: number; comisionPct: number; comisionMXN: number;
}
interface ComisionesData {
  mes: string; anio: string;
  rows: VendedorRow[];
  totales: { totalVendido: number; totalComision: number; numVendedores: number };
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });
interface Props { mes: string; anio: string }

export default function ComisionesReport({ mes, anio }: Props) {
  const [data, setData] = useState<ComisionesData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/comisiones?mes=${mes}&anio=${anio}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-slate-200 rounded-xl" />)}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Sin ventas registradas en este período</p>
      </div>
    );
  }

  const maxVendido = data.rows[0]?.totalVendido || 1;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Vendedores Activos', value: data.totales.numVendedores, prefix: '', color: 'text-slate-900' },
          { label: 'Total Vendido', value: data.totales.totalVendido, prefix: '$', color: 'text-slate-900' },
          { label: 'Total Comisiones', value: data.totales.totalComision, prefix: '$', color: 'text-emerald-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{kpi.label}</p>
            <p className={`font-mono font-bold text-lg mt-1 ${kpi.color}`}>
              {kpi.prefix}{kpi.prefix === '$' ? fmt(kpi.value as number) : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Ranking vendedores */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-700">Comisiones por Vendedor</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-500 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">#</th>
                <th className="text-left px-4 py-2 font-semibold">Vendedor</th>
                <th className="text-right px-3 py-2 font-semibold">Ventas</th>
                <th className="text-right px-3 py-2 font-semibold">Total Vendido</th>
                <th className="text-center px-3 py-2 font-semibold">% Comisión</th>
                <th className="text-right px-4 py-2 font-semibold">Comisión MXN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.rows.map((r, i) => {
                const barPct = (r.totalVendido / maxVendido) * 100;
                return (
                  <tr key={r.usuarioId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{r.nombre}</p>
                      <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden w-32">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${barPct}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{r.numVentas}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">${fmt(r.totalVendido)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                        {r.comisionPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">${fmt(r.comisionMXN)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900 text-white text-xs font-bold">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 font-semibold">TOTAL</td>
                <td className="px-3 py-2.5 text-right font-mono">${fmt(data.totales.totalVendido)}</td>
                <td className="px-3 py-2.5" />
                <td className="px-4 py-2.5 text-right font-mono text-emerald-300">${fmt(data.totales.totalComision)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
        <DollarSign className="w-4 h-4 inline mr-1 text-blue-600" />
        El porcentaje de comisión por vendedor se configura en <strong>Usuarios → Editar</strong>.
        El valor predeterminado es <strong className="font-mono">3.0%</strong>.
      </div>
    </div>
  );
}
