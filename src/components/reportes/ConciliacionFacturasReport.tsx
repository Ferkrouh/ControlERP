'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface ConciliacionRow {
  oportunidadId: string;
  nombre: string;
  contacto: string;
  valorEstimado: number;
  asesor: string;
  fechaCierre: string;
  ventaConciliada: { totalVendido: number; folios: string[] } | null;
  estado: 'CONCILIADA' | 'SIN_VENTA';
}

interface ConciliacionData {
  mes: string;
  anio: string;
  rows: ConciliacionRow[];
  totales: {
    oportunidades: number;
    valorEstimado: number;
    ventasMes: number;
    cxcPendiente: number;
    conciliadas: number;
    sinVenta: number;
  };
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });
interface Props { mes: string; anio: string }

export default function ConciliacionFacturasReport({ mes, anio }: Props) {
  const [data, setData] = useState<ConciliacionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/conciliacion-facturas?mes=${mes}&anio=${anio}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-200 rounded-xl" />)}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Info className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Sin oportunidades ganadas en este período</p>
        <p className="text-xs mt-1">Las oportunidades cerradas aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Oportunidades Ganadas', value: data.totales.oportunidades, suffix: '', color: 'text-slate-900' },
          { label: 'Valor Estimado CRM', value: data.totales.valorEstimado, suffix: '$', color: 'text-blue-700' },
          { label: 'Ventas del Mes', value: data.totales.ventasMes, suffix: '$', color: 'text-emerald-700' },
          { label: 'CxC Pendiente', value: data.totales.cxcPendiente, suffix: '$', color: 'text-amber-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{kpi.label}</p>
            <p className={`font-mono font-bold text-base mt-1 ${kpi.color}`}>
              {kpi.suffix}{kpi.suffix === '$' ? fmt(kpi.value) : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Estado de conciliación */}
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold text-emerald-900">Conciliadas</p>
            <p className="font-mono text-xl font-bold text-emerald-700">{data.totales.conciliadas}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
          <XCircle className="w-4 h-4 text-rose-600" />
          <div>
            <p className="text-xs font-semibold text-rose-900">Sin Venta Registrada</p>
            <p className="font-mono text-xl font-bold text-rose-700">{data.totales.sinVenta}</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Oportunidad</th>
              <th className="text-left px-4 py-2.5 font-semibold">Contacto</th>
              <th className="text-right px-4 py-2.5 font-semibold">Valor Estimado</th>
              <th className="text-left px-4 py-2.5 font-semibold">Asesor</th>
              <th className="text-center px-4 py-2.5 font-semibold">Fecha Cierre</th>
              <th className="text-center px-4 py-2.5 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rows.map((r) => (
              <tr key={r.oportunidadId} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-slate-900 max-w-48 truncate">{r.nombre}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.contacto}</td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-700">${fmt(r.valorEstimado)}</td>
                <td className="px-4 py-2.5 text-slate-500">{r.asesor}</td>
                <td className="px-4 py-2.5 text-center font-mono text-slate-500">{r.fechaCierre}</td>
                <td className="px-4 py-2.5 text-center">
                  {r.estado === 'CONCILIADA' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                      <CheckCircle className="w-3 h-3" /> Conciliada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full font-semibold">
                      <XCircle className="w-3 h-3" /> Sin Venta
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-start gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />
        <span>La conciliación empareja oportunidades CRM ganadas con ventas del mismo período. Para un cruce exacto, vincule las oportunidades directamente a folios de venta desde el módulo CRM.</span>
      </div>
    </div>
  );
}
