'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Crown, Users, TrendingUp } from 'lucide-react';

interface ClienteLTV {
  clienteId: string;
  razonSocial: string;
  codigo: string;
  totalVentas: number;
  totalCobrado: number;
  numTransacciones: number;
  ticketPromedio: number;
  primerCompra: string | null;
  ultimaCompra: string | null;
}

interface LtvData {
  rows: ClienteLTV[];
  kpis: {
    totalClientes: number;
    totalRevenue: number;
    ticketPromedioGlobal: number;
    top3Revenue: { razonSocial: string; total: number }[];
  };
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });

interface Props { mes: string; anio: string }

export default function LtvClientesReport({ mes, anio }: Props) {
  const [data, setData] = useState<LtvData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reportes/ltv-clientes');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}
        </div>
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-slate-200 rounded-xl" />)}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Sin datos históricos de ventas</p>
      </div>
    );
  }

  const maxRevenue = data.rows[0]?.totalVentas || 1;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Clientes con Historial', value: data.kpis.totalClientes, suffix: '', icon: Users, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Revenue Total Histórico', value: data.kpis.totalRevenue, suffix: '$', icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Ticket Promedio Global', value: data.kpis.ticketPromedioGlobal, suffix: '$', icon: Crown, color: 'text-blue-700', bg: 'bg-blue-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</span>
              <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
              </div>
            </div>
            <p className={`font-mono font-bold text-lg ${kpi.color}`}>
              {kpi.suffix}{kpi.suffix === '$' ? fmt(kpi.value) : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Ranking */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700">Ranking de Clientes — Lifetime Value</p>
          <span className="text-xs text-slate-400">{data.rows.length} clientes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-500 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">#</th>
                <th className="text-left px-4 py-2 font-semibold">Cliente</th>
                <th className="text-right px-3 py-2 font-semibold">Revenue Total</th>
                <th className="text-right px-3 py-2 font-semibold">Cobrado</th>
                <th className="text-right px-3 py-2 font-semibold">Transacciones</th>
                <th className="text-right px-4 py-2 font-semibold">Ticket Prom.</th>
                <th className="text-center px-4 py-2 font-semibold">Última Compra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.rows.map((c, i) => {
                const barPct = (c.totalVentas / maxRevenue) * 100;
                return (
                  <tr key={c.clienteId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      {i < 3 ? (
                        <Crown className={`w-4 h-4 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-amber-700'}`} />
                      ) : (
                        <span className="text-slate-400 font-mono">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{c.razonSocial}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${barPct}%` }} />
                        </div>
                        <span className="text-slate-400 font-mono">{c.codigo}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">${fmt(c.totalVentas)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-700">${fmt(c.totalCobrado)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{c.numTransacciones}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-blue-700">${fmt(c.ticketPromedio)}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-slate-400">{c.ultimaCompra || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
