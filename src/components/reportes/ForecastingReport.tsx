'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Target, TrendingUp, AlertTriangle, Award } from 'lucide-react';

interface ForecastKpis {
  forecastTotal: number;
  comprometido: number;
  pipeline: number;
  enRiesgo: number;
  totalOportunidades: number;
  ganadasAnio: number;
  valorGanadasAnio: number;
}

interface EtapaRow { etapa: string; count: number; valorBruto: number; valorPonderado: number }
interface AsesorRow { asesor: string; count: number; forecastPonderado: number }
interface Top10Row {
  id: string; nombre: string; contacto: string; etapa: string;
  valorEstimado: number; probabilidadPct: number; valorPonderado: number;
  asesor: string; fechaCierrePrev: string | null;
}

interface ForecastData {
  kpis: ForecastKpis;
  porEtapa: EtapaRow[];
  porAsesor: AsesorRow[];
  top10: Top10Row[];
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });
const fmtK = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${fmt(n)}`;

const ETAPA_COLOR: Record<string, string> = {
  PROSPECCION: 'bg-slate-200 text-slate-700',
  CALIFICACION: 'bg-blue-100 text-blue-700',
  PROPUESTA: 'bg-purple-100 text-purple-700',
  NEGOCIACION: 'bg-amber-100 text-amber-800',
};

interface Props { mes: string; anio: string }

export default function ForecastingReport({ mes, anio }: Props) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reportes/forecasting');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="h-40 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* KPIs Principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Forecast Total', value: data.kpis.forecastTotal, icon: Target, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Comprometido (≥80%)', value: data.kpis.comprometido, icon: Award, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'En Pipeline (50-79%)', value: data.kpis.pipeline, icon: TrendingUp, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'En Riesgo (<50%)', value: data.kpis.enRiesgo, icon: AlertTriangle, color: 'text-rose-700', bg: 'bg-rose-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">{kpi.label}</span>
              <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
              </div>
            </div>
            <p className={`font-mono font-bold text-lg ${kpi.color}`}>{fmtK(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* Pipeline por etapa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Pipeline por Etapa</p>
          <div className="space-y-2">
            {data.porEtapa.map((e) => (
              <div key={e.etapa} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${ETAPA_COLOR[e.etapa] || 'bg-slate-100 text-slate-600'}`}>
                    {e.etapa}
                  </span>
                  <span className="text-slate-500">{e.count} ops.</span>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-slate-900">{fmtK(e.valorPonderado)}</p>
                  <p className="text-slate-400 font-mono">bruto {fmtK(e.valorBruto)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por asesor */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Forecast por Asesor</p>
          <div className="space-y-3">
            {data.porAsesor.slice(0, 8).map((a, i) => {
              const maxF = data.porAsesor[0]?.forecastPonderado || 1;
              return (
                <div key={a.asesor}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 truncate max-w-40">{a.asesor}</span>
                    <span className="font-mono text-slate-900 font-bold">{fmtK(a.forecastPonderado)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(a.forecastPonderado / maxF) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 10 oportunidades */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-700">Top 10 Oportunidades por Valor Ponderado</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-500 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">#</th>
                <th className="text-left px-4 py-2 font-semibold">Oportunidad</th>
                <th className="text-center px-3 py-2 font-semibold">Etapa</th>
                <th className="text-right px-3 py-2 font-semibold">Valor Bruto</th>
                <th className="text-center px-3 py-2 font-semibold">Prob.</th>
                <th className="text-right px-4 py-2 font-semibold">Ponderado</th>
                <th className="text-left px-4 py-2 font-semibold">Asesor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.top10.map((op, i) => (
                <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900 max-w-48 truncate">{op.nombre}</p>
                    <p className="text-slate-400">{op.contacto}</p>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${ETAPA_COLOR[op.etapa] || 'bg-slate-100 text-slate-600'}`}>
                      {op.etapa}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-600">${fmt(op.valorEstimado)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-mono font-bold ${op.probabilidadPct >= 80 ? 'text-emerald-700' : op.probabilidadPct >= 50 ? 'text-amber-700' : 'text-rose-600'}`}>
                      {op.probabilidadPct}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-700">${fmt(op.valorPonderado)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{op.asesor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
