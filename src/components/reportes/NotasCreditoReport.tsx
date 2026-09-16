'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { XCircle, AlertTriangle, FileText } from 'lucide-react';

interface DevolucionRow {
  ventaId: string; folio: string; fecha: string; cliente: string;
  clienteCodigo: string; importe: number; tipoPago: string;
  cxcId: string | null; estadoFiscal: string; uuidFiscal: string | null;
  motivo: string; capturadoPor: string;
}
interface ClienteDev { razonSocial: string; total: number; count: number }
interface NotasCreditoData {
  mes: string; anio: string;
  rows: DevolucionRow[];
  porCliente: ClienteDev[];
  kpis: { totalCancelaciones: number; totalDevuelto: number; timbradas: number; sinTimbre: number };
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });
interface Props { mes: string; anio: string }

export default function NotasCreditoReport({ mes, anio }: Props) {
  const [data, setData] = useState<NotasCreditoData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/notas-credito?mes=${mes}&anio=${anio}`);
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
        {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-200 rounded-xl" />)}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <XCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Sin cancelaciones en este período</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Cancelaciones', value: data.kpis.totalCancelaciones, prefix: '', color: 'text-slate-900' },
          { label: 'Total Devuelto', value: data.kpis.totalDevuelto, prefix: '$', color: 'text-rose-700' },
          { label: 'Con Timbre SAT', value: data.kpis.timbradas, prefix: '', color: 'text-amber-700', suffix: ' docs' },
          { label: 'Sin Timbre', value: data.kpis.sinTimbre, prefix: '', color: 'text-slate-500', suffix: ' docs' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{kpi.label}</p>
            <p className={`font-mono font-bold text-lg mt-1 ${kpi.color}`}>
              {kpi.prefix}{kpi.prefix === '$' ? fmt(kpi.value as number) : kpi.value}{kpi.suffix || ''}
            </p>
          </div>
        ))}
      </div>

      {/* Top clientes con devoluciones */}
      {data.porCliente.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 mb-3">Clientes con Mayor Importe Devuelto</p>
          <div className="space-y-2">
            {data.porCliente.slice(0, 5).map((c, i) => (
              <div key={c.razonSocial} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 w-5 text-right">{i + 1}.</span>
                  <span className="font-medium text-slate-700">{c.razonSocial}</span>
                  <span className="text-slate-400">({c.count} docs.)</span>
                </div>
                <span className="font-mono font-bold text-rose-700">${fmt(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla detalle */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Folio</th>
              <th className="text-left px-4 py-2.5 font-semibold">Cliente</th>
              <th className="text-center px-3 py-2.5 font-semibold">Fecha</th>
              <th className="text-right px-3 py-2.5 font-semibold">Importe</th>
              <th className="text-center px-3 py-2.5 font-semibold">Tipo</th>
              <th className="text-center px-3 py-2.5 font-semibold">Estado Fiscal</th>
              <th className="text-left px-4 py-2.5 font-semibold">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rows.map((r) => (
              <tr key={r.ventaId} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-mono text-slate-500">{r.folio}</td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-slate-900">{r.cliente}</p>
                  <p className="text-slate-400 font-mono">{r.clienteCodigo}</p>
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-slate-500">{r.fecha}</td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-700">${fmt(r.importe)}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{r.tipoPago}</span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {r.estadoFiscal === 'TIMBRADA' ? (
                    <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                      TIMBRADA
                    </span>
                  ) : r.estadoFiscal === 'CANCELADA' ? (
                    <span className="bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-semibold">
                      CANCELADA
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">
                      {r.estadoFiscal}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-600 max-w-48 truncate" title={r.motivo}>{r.motivo}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900 text-white text-xs font-bold">
            <tr>
              <td colSpan={3} className="px-4 py-2.5 font-semibold">TOTAL DEVOLUCIONES</td>
              <td className="px-3 py-2.5 text-right font-mono text-rose-300">${fmt(data.kpis.totalDevuelto)}</td>
              <td colSpan={3} className="px-3 py-2.5 text-slate-400">{data.kpis.totalCancelaciones} documentos cancelados</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {data.kpis.timbradas > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <span>
            <strong>{data.kpis.timbradas} facturas canceladas</strong> tienen timbrado SAT activo.
            Verifique que la cancelación ante el SAT haya sido procesada correctamente.
          </span>
        </div>
      )}
    </div>
  );
}
