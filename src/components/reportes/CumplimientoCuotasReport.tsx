'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Target, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface CuotaRow {
  usuarioId: string; nombre: string; rol: string;
  meta: number; real: number; cumplimientoPct: number;
  estado: 'CUMPLIDA' | 'EN_PROCESO' | 'BAJO' | 'SIN_META';
}
interface CuotasData {
  mes: string; anio: string;
  rows: CuotaRow[];
  kpis: {
    metaTotal: number; realTotal: number; cumplimientoGlobal: number;
    cumplidas: number; enProceso: number; bajo: number; sinMeta: number;
  };
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });

const ESTADO_CONFIG = {
  CUMPLIDA: { label: 'Cumplida', color: 'text-emerald-700 bg-emerald-100 border-emerald-200', barColor: 'bg-emerald-500' },
  EN_PROCESO: { label: 'En Proceso', color: 'text-amber-700 bg-amber-100 border-amber-200', barColor: 'bg-amber-500' },
  BAJO: { label: 'Bajo', color: 'text-rose-700 bg-rose-100 border-rose-200', barColor: 'bg-rose-500' },
  SIN_META: { label: 'Sin Meta', color: 'text-slate-500 bg-slate-100 border-slate-200', barColor: 'bg-slate-300' },
} as const;

interface Props { mes: string; anio: string }

export default function CumplimientoCuotasReport({ mes, anio }: Props) {
  const [data, setData] = useState<CuotasData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/cumplimiento-cuotas?mes=${mes}&anio=${anio}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-slate-200 rounded-xl" />)}
        </div>
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-200 rounded-xl" />)}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* KPIs Globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Meta Total', value: data.kpis.metaTotal, prefix: '$', color: 'text-slate-900' },
          { label: 'Vendido Real', value: data.kpis.realTotal, prefix: '$', color: data.kpis.realTotal >= data.kpis.metaTotal ? 'text-emerald-700' : 'text-amber-700' },
          { label: 'Cumplimiento Global', value: data.kpis.cumplimientoGlobal, prefix: '', suffix: '%', color: data.kpis.cumplimientoGlobal >= 100 ? 'text-emerald-700' : data.kpis.cumplimientoGlobal >= 60 ? 'text-amber-700' : 'text-rose-700' },
          { label: 'Cuotas Cumplidas', value: data.kpis.cumplidas, prefix: '', suffix: `/${data.rows.filter(r => r.estado !== 'SIN_META').length}`, color: 'text-slate-900' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{kpi.label}</p>
            <p className={`font-mono font-bold text-lg mt-1 ${kpi.color}`}>
              {kpi.prefix}{kpi.prefix === '$' ? fmt(kpi.value as number) : typeof kpi.value === 'number' ? kpi.value.toFixed(kpi.suffix?.includes('%') ? 1 : 0) : kpi.value}{kpi.suffix || ''}
            </p>
          </div>
        ))}
      </div>

      {/* Barra global */}
      {data.kpis.metaTotal > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-700">Avance Global del Equipo</span>
            <span className={`font-mono font-bold ${data.kpis.cumplimientoGlobal >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {data.kpis.cumplimientoGlobal.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${data.kpis.cumplimientoGlobal >= 100 ? 'bg-emerald-500' : data.kpis.cumplimientoGlobal >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(data.kpis.cumplimientoGlobal, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>$0</span>
            <span className="font-mono">${fmt(data.kpis.metaTotal)}</span>
          </div>
        </div>
      )}

      {/* Cards por usuario */}
      <div className="space-y-3">
        {data.rows.map((r) => {
          const cfg = ESTADO_CONFIG[r.estado];
          const pct = Math.min(r.cumplimientoPct, 100);
          return (
            <div key={r.usuarioId} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{r.nombre}</p>
                  <p className="text-xs text-slate-400 capitalize">{r.rol.toLowerCase()}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>

              {r.estado !== 'SIN_META' ? (
                <>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div className={`h-full ${cfg.barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Real: <strong className="text-slate-900 font-mono">${fmt(r.real)}</strong></span>
                    <span className={`font-mono font-bold ${r.cumplimientoPct >= 100 ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {r.cumplimientoPct.toFixed(1)}%
                    </span>
                    <span>Meta: <strong className="text-slate-900 font-mono">${fmt(r.meta)}</strong></span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Sin meta configurada para este período
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
        <Target className="w-4 h-4 inline mr-1 text-blue-600" />
        Configure las metas mensuales de cada vendedor desde <strong>Usuarios → Editar → Meta Mensual</strong>.
      </div>
    </div>
  );
}
