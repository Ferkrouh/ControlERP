'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  DollarSign, 
  CreditCard, 
  Receipt, 
  Boxes, 
  AlertTriangle, 
  Sliders, 
  Users, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart2,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

// Componente Mini Sparkline SVG elegante
function Sparkline({ data, color = '#10b981', height = 36, width = 100 }: { data: number[]; color?: string; height?: number; width?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${points} ${width},${height} 0,${height}`;
  const gradientId = `sparkline-grad-${color.replace('#', '')}-${Math.random().toString(36).substring(2, 7)}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* Último punto pulsante */}
      {data.length > 0 && (
        <circle
          cx={(width)}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 8) - 4}
          r="3"
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

// Datos simulados para gráficos por periodo
const PERIOD_DATA = {
  '7D': {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    ventas: [18400, 24500, 31200, 28900, 42100, 38600, 19800],
    cobranza: [14200, 19800, 26400, 24100, 38500, 31200, 16500],
    compras: [8500, 12000, 15400, 11200, 22000, 18500, 9200],
  },
  '30D': {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    ventas: [98400, 142500, 128900, 165400],
    cobranza: [84200, 126800, 114100, 148500],
    compras: [48500, 72000, 61200, 89000],
  },
  '6M': {
    labels: ['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar'],
    ventas: [380000, 445000, 580000, 410000, 465000, 535200],
    cobranza: [340000, 395000, 510000, 375000, 420000, 482000],
    compras: [195000, 240000, 310000, 215000, 235000, 278000],
  },
  '1A': {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    ventas: [1250000, 1420000, 1580000, 1890000],
    cobranza: [1120000, 1280000, 1410000, 1720000],
    compras: [680000, 740000, 810000, 960000],
  }
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7D' | '30D' | '6M' | '1A'>('6M');
  const [activeSeries, setActiveSeries] = useState<{ ventas: boolean; cobranza: boolean; compras: boolean }>({
    ventas: true,
    cobranza: true,
    compras: true,
  });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [user]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reportes/mensual');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const tenant = user?.tenant;

  const currentChart = PERIOD_DATA[period];
  const maxChartValue = useMemo(() => {
    const all = [
      ...(activeSeries.ventas ? currentChart.ventas : []),
      ...(activeSeries.cobranza ? currentChart.cobranza : []),
      ...(activeSeries.compras ? currentChart.compras : []),
    ];
    return Math.max(...all, 100000) * 1.15;
  }, [currentChart, activeSeries]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
          <div className="h-28 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Cálculos para Gráfico Donut de Composición de Activos
  const totalCxC = metrics?.totalPorCobrar || 107500;
  const totalInv = metrics?.valuacionTotal || 211850;
  const totalBancos = 185400; // Saldo en Tesorería
  const totalMora = metrics?.totalVencido || 50000;
  const granTotalActivos = totalCxC + totalInv + totalBancos;

  const pctCxC = Math.round((totalCxC / granTotalActivos) * 100);
  const pctInv = Math.round((totalInv / granTotalActivos) * 100);
  const pctBancos = 100 - pctCxC - pctInv;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Ejecutivo con Branding del Negocio */}
      <div 
        className="text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all relative overflow-hidden"
        style={{ backgroundColor: tenant?.colorPrimario || '#1e40af' }}
      >
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold backdrop-blur-sm">
              Panel Ejecutivo de Dirección
            </span>
            <span className="text-white/80 text-xs font-mono">
              RFC: {tenant?.identificacionFiscal}
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2 tracking-tight">{tenant?.nombreComercial}</h2>
          <p className="text-white/90 text-sm mt-1">
            {tenant?.textoEncabezadoDoc || 'Control integral del negocio, finanzas, inventarios y políticas de crédito'}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Link
            href="/personalizacion"
            className="bg-white/10 hover:bg-white/20 active:scale-95 border border-white/30 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm backdrop-blur-sm"
          >
            <Sliders className="w-4 h-4" /> Personalizar Negocio
          </Link>
          <Link
            href="/reportes"
            className="bg-white text-slate-900 hover:bg-slate-100 active:scale-95 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-slate-950/20"
          >
            <TrendingUp className="w-4 h-4 text-blue-600" /> Analítica & Reportes
          </Link>
        </div>
      </div>

      {/* Tarjetas de Indicadores Clave (KPIs) con Mini Sparklines Integrados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas & Cobranza */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cuentas por Cobrar</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-2xl font-bold font-mono text-slate-900">
                ${(metrics?.totalPorCobrar || 107500).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-rose-600 mt-1 font-medium font-mono">
                <AlertTriangle className="w-3 h-3" />
                <span>${(metrics?.totalVencido || 50000).toLocaleString('es-MX', { minimumFractionDigits: 2 })} en mora</span>
              </div>
            </div>
            <Sparkline data={[65000, 82000, 78000, 95000, 107500]} color="#3b82f6" />
          </div>
        </div>

        {/* Cuentas por Pagar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cuentas por Pagar</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-2xl font-bold font-mono text-slate-900">
                ${(metrics?.totalPorPagar || 65250).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1 font-medium">
                <ArrowDownRight className="w-3 h-3" />
                <span>Al corriente</span>
              </div>
            </div>
            <Sparkline data={[72000, 68000, 71000, 64000, 65250]} color="#6366f1" />
          </div>
        </div>

        {/* Valuación de Inventarios */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Valuación Inventario</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-2xl font-bold font-mono text-slate-900">
                ${(metrics?.valuacionTotal || 211850).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                <span>Costo Promedio auditado</span>
              </div>
            </div>
            <Sparkline data={[195000, 202000, 208000, 215000, 211850]} color="#f59e0b" />
          </div>
        </div>

        {/* Política de Crédito */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Salud Crediticia</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-xl font-bold text-slate-900">
                {tenant?.politicaBloqueoCredito === 'ESTRICTO' ? 'Bloqueo Estricto' : 'Modo Advertencia'}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 font-mono">
                <span>{tenant?.diasGraciaCredito || 0}d gracia • {tenant?.alertaVencimientoDias || 5}d alerta</span>
              </div>
            </div>
            <Sparkline data={[40, 60, 55, 75, 88]} color="#10b981" />
          </div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICOS PRINCIPALES ELEGANTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Fintech Curve & Bar Area Chart (2 Columnas) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Rendimiento Financiero & Flujo Operativo
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cruce comparativo de Ventas Facturadas, Cobranza Efectiva y Compras
              </p>
            </div>

            {/* Selectores de Periodo y Filtros */}
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
                {(['7D', '30D', '6M', '1A'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selector de Series Activas */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <button
              onClick={() => setActiveSeries(prev => ({ ...prev, ventas: !prev.ventas }))}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                activeSeries.ventas ? 'bg-blue-50/80 border-blue-200 text-blue-800 font-semibold' : 'border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Ventas Facturadas</span>
            </button>

            <button
              onClick={() => setActiveSeries(prev => ({ ...prev, cobranza: !prev.cobranza }))}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                activeSeries.cobranza ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 font-semibold' : 'border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>Cobranza Real</span>
            </button>

            <button
              onClick={() => setActiveSeries(prev => ({ ...prev, compras: !prev.compras }))}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                activeSeries.compras ? 'bg-indigo-50/80 border-indigo-200 text-indigo-800 font-semibold' : 'border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Compras & Egresos</span>
            </button>
          </div>

          {/* Gráfico SVG de Curvas & Barras */}
          <div className="relative h-64 w-full pt-4">
            <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="admin-ventas-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="admin-cobranza-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="admin-bar-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.25" />
                </linearGradient>
                <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.3" />
                </filter>
                <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10b981" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Líneas Guía Horizontales */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={20 + ratio * 160}
                  x2="600"
                  y2={20 + ratio * 160}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Barras de Compras/Egresos */}
              {activeSeries.compras && currentChart.compras.map((val, idx) => {
                const count = currentChart.labels.length;
                const slotWidth = 600 / count;
                const x = idx * slotWidth + slotWidth / 2 - 12;
                const barH = (val / maxChartValue) * 160;
                const y = 180 - barH;
                return (
                  <rect
                    key={`bar-${idx}`}
                    x={x}
                    y={y}
                    width="24"
                    height={barH}
                    rx="6"
                    fill="url(#admin-bar-grad)"
                    className="transition-all duration-300 hover:opacity-100 opacity-80 cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}

              {/* Curva de Área Ventas */}
              {activeSeries.ventas && (() => {
                const count = currentChart.labels.length;
                const step = 600 / (count - 1);
                const pts = currentChart.ventas.map((v, i) => {
                  const x = i * step;
                  const y = 180 - (v / maxChartValue) * 160;
                  return `${x},${y}`;
                });
                const linePath = `M ${pts.join(' L ')}`;
                const areaPath = `M 0,180 L ${pts.join(' L ')} L 600,180 Z`;
                return (
                  <g>
                    <path d={areaPath} fill="url(#admin-ventas-grad)" />
                    <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="3" filter="url(#glow-blue)" strokeLinecap="round" strokeLinejoin="round" />
                    {currentChart.ventas.map((v, i) => {
                      const cx = i * step;
                      const cy = 180 - (v / maxChartValue) * 160;
                      return (
                        <circle
                          key={`v-dot-${i}`}
                          cx={cx}
                          cy={cy}
                          r={hoveredIndex === i ? 6 : 4}
                          fill="#ffffff"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        />
                      );
                    })}
                  </g>
                );
              })()}

              {/* Curva de Área Cobranza */}
              {activeSeries.cobranza && (() => {
                const count = currentChart.labels.length;
                const step = 600 / (count - 1);
                const pts = currentChart.cobranza.map((v, i) => {
                  const x = i * step;
                  const y = 180 - (v / maxChartValue) * 160;
                  return `${x},${y}`;
                });
                const linePath = `M ${pts.join(' L ')}`;
                const areaPath = `M 0,180 L ${pts.join(' L ')} L 600,180 Z`;
                return (
                  <g>
                    <path d={areaPath} fill="url(#admin-cobranza-grad)" />
                    <path d={linePath} fill="none" stroke="#059669" strokeWidth="2.5" strokeDasharray="5 3" filter="url(#glow-emerald)" strokeLinecap="round" />
                    {currentChart.cobranza.map((v, i) => {
                      const cx = i * step;
                      const cy = 180 - (v / maxChartValue) * 160;
                      return (
                        <circle
                          key={`c-dot-${i}`}
                          cx={cx}
                          cy={cy}
                          r={hoveredIndex === i ? 5 : 3.5}
                          fill="#ffffff"
                          stroke="#059669"
                          strokeWidth="2"
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        />
                      );
                    })}
                  </g>
                );
              })()}
            </svg>

            {/* Etiquetas del Eje X */}
            <div className="flex justify-between text-xs text-slate-400 font-mono mt-2 px-1">
              {currentChart.labels.map((lbl, i) => (
                <span
                  key={i}
                  className={`transition-colors ${hoveredIndex === i ? 'text-blue-600 font-bold' : ''}`}
                >
                  {lbl}
                </span>
              ))}
            </div>

            {/* Tooltip Interactivo flotante */}
            {hoveredIndex !== null && (
              <div 
                className="absolute top-2 bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-xl text-xs shadow-2xl border border-slate-700 pointer-events-none transition-all z-20"
                style={{ left: `${(hoveredIndex / (currentChart.labels.length - 1)) * 80 + 10}%` }}
              >
                <div className="font-bold border-b border-slate-700 pb-1 text-slate-300">
                  {currentChart.labels[hoveredIndex]}
                </div>
                <div className="space-y-0.5 mt-1 font-mono text-[11px]">
                  {activeSeries.ventas && (
                    <div className="text-blue-400">Venta: ${currentChart.ventas[hoveredIndex].toLocaleString('es-MX')}</div>
                  )}
                  {activeSeries.cobranza && (
                    <div className="text-emerald-400">Cobro: ${currentChart.cobranza[hoveredIndex].toLocaleString('es-MX')}</div>
                  )}
                  {activeSeries.compras && (
                    <div className="text-indigo-300">Compras: ${currentChart.compras[hoveredIndex].toLocaleString('es-MX')}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Donut Chart de Composición de Activos & Liquidez */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 p-6 space-y-5 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-600" />
              Composición de Activos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Distribución de capital circulante en el negocio</p>
          </div>

          {/* Donut SVG con Anillos Concéntricos */}
          <div className="relative flex items-center justify-center my-2">
            <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
              {/* Fondo Anillo */}
              <circle cx="90" cy="90" r="70" fill="none" stroke="#f1f5f9" strokeWidth="18" />

              {/* Segmento 1: Inventario (Ámbar) */}
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="18"
                strokeDasharray={`${(pctInv * 440) / 100} 440`}
                strokeDashoffset="0"
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />

              {/* Segmento 2: Cuentas por Cobrar (Azul) */}
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="18"
                strokeDasharray={`${(pctCxC * 440) / 100} 440`}
                strokeDashoffset={`-${(pctInv * 440) / 100}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />

              {/* Segmento 3: Tesorería y Bancos (Esmeralda) */}
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="none"
                stroke="#10b981"
                strokeWidth="18"
                strokeDasharray={`${(pctBancos * 440) / 100} 440`}
                strokeDashoffset={`-${((pctInv + pctCxC) * 440) / 100}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Centro del Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Activos Totales</span>
              <span className="text-base font-bold font-mono text-slate-900">
                ${(granTotalActivos / 1000).toFixed(0)}k
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold font-mono">MXN</span>
            </div>
          </div>

          {/* Leyenda Calibrada */}
          <div className="space-y-2 text-xs pt-2 border-t border-slate-100 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600 font-sans">Inventario Físico ({pctInv}%)</span>
              </div>
              <span className="font-bold text-slate-900">${totalInv.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 font-sans">Cartera Clientes ({pctCxC}%)</span>
              </div>
              <span className="font-bold text-slate-900">${totalCxC.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 font-sans">Caja & Bancos ({pctBancos}%)</span>
              </div>
              <span className="font-bold text-slate-900">${totalBancos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Semáforo de Crédito y Monitoreo de Clientes en Riesgo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" />
                Semáforo de Clientes y Límites de Crédito
              </h3>
              <p className="text-xs text-slate-500">Supervisión en tiempo real de saldos y crédito asignado</p>
            </div>
            <Link
              href="/clientes"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Ver Cartera Completa <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {/* Cliente 1 */}
            <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:bg-rose-50/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">Comercializadora San Pedro</span>
                  <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full border border-rose-200">
                    BLOQUEADO POR MORA
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">Límite: $50,000.00 | Saldo utilizado: $50,000.00 (100%)</p>
              </div>
              <div className="w-full sm:w-48">
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full w-full"></div>
                </div>
                <p className="text-xs text-right font-semibold font-mono text-rose-600 mt-1">Crédito Agotado</p>
              </div>
            </div>

            {/* Cliente 2 */}
            <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:bg-emerald-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">Constructora del Bajío S.A.</span>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    ACTIVO
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">Límite: $150,000.00 | Saldo utilizado: $45,000.00 (30%)</p>
              </div>
              <div className="w-full sm:w-48">
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '30%' }}></div>
                </div>
                <p className="text-xs text-right font-semibold font-mono text-emerald-600 mt-1">Disponible: $105,000.00</p>
              </div>
            </div>

            {/* Cliente 3 */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:bg-slate-100/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">Ferreterías Unidas del Norte</span>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    ACTIVO
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">Límite: $80,000.00 | Saldo utilizado: $12,500.00 (15.6%)</p>
              </div>
              <div className="w-full sm:w-48">
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '16%' }}></div>
                </div>
                <p className="text-xs text-right font-semibold font-mono text-emerald-600 mt-1">Disponible: $67,500.00</p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas y Configuración del Negocio */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">Acciones Directivas</h3>
            <p className="text-xs text-slate-500 mt-0.5">Accesos directos de control administrativo</p>
          </div>
          
          <div className="space-y-2.5">
            <Link
              href="/personalizacion"
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 active:scale-98 transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg group-hover:scale-105 transition-transform">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">Personalizar mi Negocio</p>
                  <p className="text-[11px] text-slate-500">Logo, color de tema y políticas</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>

            <Link
              href="/usuarios"
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 active:scale-98 transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">Equipo y Colaboradores</p>
                  <p className="text-[11px] text-slate-500">Encargados, Almacenistas, Auditor</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>

            <Link
              href="/reportes"
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 active:scale-98 transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">Inteligencia de Negocios</p>
                  <p className="text-[11px] text-slate-500">Balanza, LTV, Forecasting y 10 reportes</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
