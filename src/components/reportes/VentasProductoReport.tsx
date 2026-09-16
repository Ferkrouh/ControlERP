'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Boxes, TrendingDown, AlertTriangle } from 'lucide-react';

interface ProductoRow {
  productoId: string; sku: string; nombre: string; categoria: string;
  unidades: number; ingresos: number; costo: number; margenBruto: number; margenPct: number;
}
interface CategoriaRow {
  categoria: string; ingresos: number; costo: number; unidades: number;
  margenBruto: number; margenPct: number;
}
interface VentasProductoData {
  mes: string; anio: string;
  rowsProducto: ProductoRow[];
  rowsCategoria: CategoriaRow[];
  alertasMargen: ProductoRow[];
  kpis: {
    totalProductosVendidos: number; totalIngresos: number;
    totalCosto: number; margenBrutoTotal: number; margenGlobalPct: number;
  };
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });
interface Props { mes: string; anio: string }

export default function VentasProductoReport({ mes, anio }: Props) {
  const [data, setData] = useState<VentasProductoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<'producto' | 'categoria'>('producto');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/ventas-producto?mes=${mes}&anio=${anio}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-slate-200 rounded-xl" />)}
        </div>
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-slate-200 rounded-xl" />)}
      </div>
    );
  }

  if (!data || data.rowsProducto.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Boxes className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Sin ventas en este período</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Productos', value: data.kpis.totalProductosVendidos, prefix: '', color: 'text-slate-900' },
          { label: 'Ingresos', value: data.kpis.totalIngresos, prefix: '$', color: 'text-slate-900' },
          { label: 'Costo Total', value: data.kpis.totalCosto, prefix: '$', color: 'text-rose-600' },
          { label: 'Margen Bruto', value: data.kpis.margenBrutoTotal, prefix: '$', color: 'text-emerald-700' },
          { label: 'Margen Global %', value: data.kpis.margenGlobalPct, prefix: '', suffix: '%', color: data.kpis.margenGlobalPct < 15 ? 'text-rose-700' : 'text-emerald-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{kpi.label}</p>
            <p className={`font-mono font-bold text-sm mt-1 ${kpi.color}`}>
              {kpi.prefix}{typeof kpi.value === 'number' && kpi.prefix === '$' ? fmt(kpi.value) : kpi.value.toFixed(kpi.suffix === '%' ? 1 : 0)}{kpi.suffix || ''}
            </p>
          </div>
        ))}
      </div>

      {/* Alertas de margen */}
      {data.alertasMargen.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <span>
            <strong>{data.alertasMargen.length} productos</strong> con margen inferior al 10%:
            {' '}{data.alertasMargen.slice(0, 3).map((p) => p.nombre).join(', ')}
            {data.alertasMargen.length > 3 ? ` y ${data.alertasMargen.length - 3} más.` : '.'}
          </span>
        </div>
      )}

      {/* Toggle de vista */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['producto', 'categoria'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-all ${
              vista === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Por {v === 'producto' ? 'Producto' : 'Categoría'}
          </button>
        ))}
      </div>

      {/* Tabla de producto */}
      {vista === 'producto' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">SKU</th>
                <th className="text-left px-4 py-2.5 font-semibold">Producto</th>
                <th className="text-left px-3 py-2.5 font-semibold">Categoría</th>
                <th className="text-right px-3 py-2.5 font-semibold">Unidades</th>
                <th className="text-right px-3 py-2.5 font-semibold">Ingresos</th>
                <th className="text-right px-3 py-2.5 font-semibold">Costo</th>
                <th className="text-right px-3 py-2.5 font-semibold">Margen</th>
                <th className="text-right px-4 py-2.5 font-semibold">Margen %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rowsProducto.map((p) => (
                <tr key={p.productoId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-slate-500">{p.sku}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{p.nombre}</td>
                  <td className="px-3 py-2.5 text-slate-500">{p.categoria}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-600">{p.unidades.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-900">${fmt(p.ingresos)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-rose-600">${fmt(p.costo)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-700">${fmt(p.margenBruto)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-mono font-bold ${p.margenPct < 10 ? 'text-rose-700' : p.margenPct < 20 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {p.margenPct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Categoría</th>
                <th className="text-right px-3 py-2.5 font-semibold">Unidades</th>
                <th className="text-right px-3 py-2.5 font-semibold">Ingresos</th>
                <th className="text-right px-3 py-2.5 font-semibold">Costo</th>
                <th className="text-right px-3 py-2.5 font-semibold">Margen Bruto</th>
                <th className="text-right px-4 py-2.5 font-semibold">Margen %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rowsCategoria.map((c) => (
                <tr key={c.categoria} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{c.categoria}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-600">{c.unidades.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-900">${fmt(c.ingresos)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-rose-600">${fmt(c.costo)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-700">${fmt(c.margenBruto)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-mono font-bold ${c.margenPct < 10 ? 'text-rose-700' : c.margenPct < 20 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {c.margenPct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
