'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, CreditCard, ShoppingCart } from 'lucide-react';

interface DiaData { fecha: string; cobros: number; contado: number; total: number }
interface ClientePago { razonSocial: string; monto: number }

interface IngresosData {
  mes: string;
  anio: string;
  dias: DiaData[];
  porCliente: ClientePago[];
  totales: { cobros: number; contado: number; total: number };
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });
interface Props { mes: string; anio: string }

export default function IngresosRecaudacionReport({ mes, anio }: Props) {
  const [data, setData] = useState<IngresosData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/ingresos-recaudacion?mes=${mes}&anio=${anio}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="h-48 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const maxTotal = Math.max(...data.dias.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Recaudado', value: data.totales.total, icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Cobros CxC', value: data.totales.cobros, icon: CreditCard, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Ventas Contado', value: data.totales.contado, icon: ShoppingCart, color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</span>
              <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
              </div>
            </div>
            <p className={`font-mono font-bold text-xl ${kpi.color}`}>${fmt(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de barras por día */}
      {data.dias.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 mb-4">Flujo Diario de Ingresos</p>
          <div className="flex items-end gap-1 h-36">
            {data.dias.map((d) => {
              const heightPct = (d.total / maxTotal) * 100;
              const cobrosPct = d.total > 0 ? (d.cobros / d.total) * 100 : 0;
              return (
                <div key={d.fecha} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${d.fecha}: $${fmt(d.total)}`}>
                  <div className="relative w-full flex flex-col justify-end" style={{ height: '120px' }}>
                    <div
                      className="w-full rounded-t-sm overflow-hidden"
                      style={{ height: `${heightPct}%` }}
                    >
                      <div className="bg-blue-500" style={{ height: `${cobrosPct}%` }} />
                      <div className="bg-purple-400" style={{ height: `${100 - cobrosPct}%` }} />
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 hidden sm:block">
                    {d.fecha.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500" /><span className="text-xs text-slate-500">Cobros CxC</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-purple-400" /><span className="text-xs text-slate-500">Ventas Contado</span></div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-400 text-sm">Sin movimientos en el período</div>
      )}

      {/* Top clientes cobrados */}
      {data.porCliente.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 mb-3">Top Clientes — Cobranza CxC</p>
          <div className="space-y-2">
            {data.porCliente.slice(0, 8).map((c, i) => (
              <div key={c.razonSocial} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 w-5 text-right">{i + 1}.</span>
                  <span className="font-medium text-slate-700 truncate max-w-48">{c.razonSocial}</span>
                </div>
                <span className="font-mono font-bold text-emerald-700">${fmt(c.monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
