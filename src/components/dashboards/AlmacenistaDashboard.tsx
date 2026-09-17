'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Boxes, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckCircle2, 
  Barcode, 
  Package, 
  ClipboardCheck,
  Truck,
  TrendingDown,
  TrendingUp,
  Warehouse,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

// Sparkline SVG Component
function Sparkline({ data, color, height = 36, id }: { data: number[]; color: string; height?: number; id: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${points} ${width},${height} 0,${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8 overflow-visible">
      <defs>
        <linearGradient id={`grad-alm-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-alm-${id})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 8) - 4}
          r="2.5"
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

// Datos de Flujo Kárdex (Entradas vs Salidas de Piezas)
const FLUJO_KARDEX_DATA = {
  semana: [
    { label: 'Lun', entradas: 45, salidas: 38, balance: 7 },
    { label: 'Mar', entradas: 62, salidas: 51, balance: 11 },
    { label: 'Mié', entradas: 28, salidas: 44, balance: -16 },
    { label: 'Jue', entradas: 85, salidas: 60, balance: 25 },
    { label: 'Vie', entradas: 94, salidas: 82, balance: 12 },
    { label: 'Sáb', entradas: 30, salidas: 48, balance: -18 },
    { label: 'Dom', entradas: 0, salidas: 8, balance: -8 },
  ],
  quincena: [
    { label: 'Día 1-3', entradas: 120, salidas: 95, balance: 25 },
    { label: 'Día 4-6', entradas: 140, salidas: 130, balance: 10 },
    { label: 'Día 7-9', entradas: 85, salidas: 110, balance: -25 },
    { label: 'Día 10-12', entradas: 210, salidas: 175, balance: 35 },
    { label: 'Día 13-15', entradas: 165, salidas: 140, balance: 25 },
  ],
  mes: [
    { label: 'Sem 1', entradas: 340, salidas: 280, balance: 60 },
    { label: 'Sem 2', entradas: 420, salidas: 390, balance: 30 },
    { label: 'Sem 3', entradas: 290, salidas: 310, balance: -20 },
    { label: 'Sem 4', entradas: 480, salidas: 410, balance: 70 },
  ]
};

// Distribución de Stock por Ubicación Física
const ALMACENES_DISTRIBUCION = [
  { nombre: 'CEDIS Central Monterrey', piezas: 215, porcentaje: 63, valor: '$134,800.00', color: '#0ea5e9', status: '78% Capacidad' },
  { nombre: 'Sucursal Guadalajara', piezas: 86, porcentaje: 25, valor: '$53,450.00', color: '#6366f1', status: '62% Capacidad' },
  { nombre: 'Bodega Norte', piezas: 35, porcentaje: 10, valor: '$21,900.00', color: '#10b981', status: '34% Capacidad' },
  { nombre: 'En Tránsito (Traspasos)', piezas: 5, porcentaje: 2, valor: '$1,700.00', color: '#f59e0b', status: 'Despachado' },
];

export default function AlmacenistaDashboard() {
  const { user } = useAuth();
  const tenant = user?.tenant;

  const [periodo, setPeriodo] = useState<'semana' | 'quincena' | 'mes'>('semana');
  const [hoveredData, setHoveredData] = useState<any | null>(null);

  const currentFlujo = FLUJO_KARDEX_DATA[periodo];
  const maxFlujo = Math.max(...currentFlujo.map(d => Math.max(d.entradas, d.salidas))) * 1.2;

  const totalPiezas = ALMACENES_DISTRIBUCION.reduce((acc, curr) => acc + curr.piezas, 0);

  return (
    <div className="space-y-6">
      {/* Header Logístico de Almacén Soberano */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-400 border border-amber-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5" /> Operador de Almacén & Logística Física
            </span>
            <span className="bg-white/10 text-white/90 text-xs px-2.5 py-0.5 rounded-full">
              {tenant?.nombreComercial}
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2 tracking-tight">Control de Stock, Despachos y Traspasos</h2>
          <p className="text-slate-400 text-sm mt-1">
            Recepción física de mercancía, conteos cíclicos, preparación de traspasos y cotejo transaccional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/traspasos"
            className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <ClipboardCheck className="w-4 h-4" /> Recepción de Traspaso
          </Link>
          <Link
            href="/inventarios"
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Barcode className="w-4 h-4" /> Buscar SKU / Código
          </Link>
        </div>
      </div>

      {/* Indicadores Físicos de Inventario con Sparklines (Card Float Principle) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bajo Stock Mínimo</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-rose-600">1 producto</p>
            <span className="text-xs font-bold font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md">
              4 / 5 pzas
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[3, 2, 4, 3, 2, 2, 1]} color="#f43f5e" id="stock-min" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Requiere reabastecimiento urgente</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Traspasos Por Recibir</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-blue-700">1 envío</p>
            <span className="text-xs font-mono font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
              5 pzas
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[0, 1, 1, 2, 1, 2, 1]} color="#3b82f6" id="traspasos-recibir" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Folio TRASP-2026-001</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Artículos Activos</span>
            <div className="p-2 bg-slate-50 text-slate-700 rounded-xl border border-slate-200">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-slate-900">3 SKUs</p>
            <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded-md">
              100% Código
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[2, 2, 3, 3, 3, 3, 3]} color="#0ea5e9" id="skus" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Con código de barras registrado</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Piezas Físicas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-slate-900">341 pzas</p>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 font-mono">
              <ArrowUpRight className="w-3.5 h-3.5" /> +18 pzas
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[290, 305, 312, 320, 328, 335, 341]} color="#10b981" id="piezas" />
          </div>
          <p className="text-[11px] text-emerald-700 mt-2 font-medium">Existencia consolidada multialmacén</p>
        </div>
      </div>

      {/* Gráfico Principal: Flujo Kárdex y Distribución de Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Entradas vs Salidas Kárdex */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Dinámica de Movimientos Kárdex</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Entradas físicas por compras/devoluciones vs Salidas por ventas/despachos</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filtros de período */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
                {(['semana', 'quincena', 'mes'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriodo(p)}
                    className={`px-3 py-1 rounded-lg transition-all capitalize ${
                      periodo === p 
                        ? 'bg-white text-slate-900 shadow-sm font-bold' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Leyenda */}
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-cyan-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></span> Entradas
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> Salidas
                </span>
              </div>
            </div>
          </div>

          {/* Área de Gráfico SVG de Barras Dobles */}
          <div className="relative pt-4 pb-2">
            <div className="h-64 w-full relative">
              <svg viewBox="0 0 700 240" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="alm-entradas-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.7" />
                  </linearGradient>
                  <linearGradient id="alm-salidas-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.7" />
                  </linearGradient>
                </defs>

                {/* Grid horizontal */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = 210 - ratio * 180;
                  return (
                    <g key={i}>
                      <line x1="0" y1={y} x2="700" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <text x="0" y={y - 4} fill="#94a3b8" fontSize="10" fontFamily="monospace">
                        {Math.round(maxFlujo * ratio)} pzas
                      </text>
                    </g>
                  );
                })}

                {/* Render de Barras */}
                {currentFlujo.map((d, i) => {
                  const xGroup = (i / (currentFlujo.length - 1)) * 620 + 40;
                  const barWidth = Math.min(22, 280 / currentFlujo.length);
                  
                  const hEntradas = (d.entradas / maxFlujo) * 180;
                  const hSalidas = (d.salidas / maxFlujo) * 180;
                  const yEntradas = 210 - hEntradas;
                  const ySalidas = 210 - hSalidas;

                  const isHovered = hoveredData?.label === d.label;

                  return (
                    <g 
                      key={i} 
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredData(d)} 
                      onMouseLeave={() => setHoveredData(null)}
                    >
                      {/* Fondo interactivo */}
                      {isHovered && (
                        <rect
                          x={xGroup - barWidth * 1.5}
                          y={20}
                          width={barWidth * 3}
                          height={200}
                          fill="#f8fafc"
                          rx="8"
                        />
                      )}

                      {/* Barra Entrada */}
                      <rect
                        x={xGroup - barWidth - 2}
                        y={yEntradas}
                        width={barWidth}
                        height={hEntradas}
                        fill="url(#alm-entradas-grad)"
                        rx="4"
                        className="transition-all duration-200"
                        opacity={isHovered ? 1 : 0.9}
                      />

                      {/* Barra Salida */}
                      <rect
                        x={xGroup + 2}
                        y={ySalidas}
                        width={barWidth}
                        height={hSalidas}
                        fill="url(#alm-salidas-grad)"
                        rx="4"
                        className="transition-all duration-200"
                        opacity={isHovered ? 1 : 0.9}
                      />

                      {/* Label eje X */}
                      <text
                        x={xGroup}
                        y={230}
                        textAnchor="middle"
                        fill={isHovered ? "#0f172a" : "#64748b"}
                        fontSize="11"
                        fontWeight={isHovered ? "bold" : "normal"}
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip Kárdex */}
              {hoveredData && (
                <div className="absolute top-2 right-4 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-xs space-y-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1">
                    <span className="font-bold text-slate-200">{hoveredData.label}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      hoveredData.balance >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {hoveredData.balance >= 0 ? `+${hoveredData.balance}` : hoveredData.balance} neto
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Entradas:
                    </span>
                    <span className="font-bold font-mono text-cyan-400">{hoveredData.entradas} pzas</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> Salidas:
                    </span>
                    <span className="font-bold font-mono text-amber-400">{hoveredData.salidas} pzas</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Donut Chart: Distribución por Almacén */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Warehouse className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Stock por Bodega</h3>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {totalPiezas} pzas
              </span>
            </div>

            {/* SVG Donut */}
            <div className="relative flex items-center justify-center my-6">
              <svg viewBox="0 0 160 160" className="w-40 h-40 transform -rotate-90">
                {(() => {
                  let accumulatedPercent = 0;
                  const radius = 60;
                  const circumference = 2 * Math.PI * radius;

                  return ALMACENES_DISTRIBUCION.map((a, idx) => {
                    const strokeDasharray = `${(a.porcentaje / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                    accumulatedPercent += a.porcentaje;

                    return (
                      <circle
                        key={idx}
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="transparent"
                        stroke={a.color}
                        strokeWidth="18"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="hover:opacity-85 transition-all cursor-pointer"
                      />
                    );
                  });
                })()}
              </svg>

              {/* Centro del Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Stock</span>
                <span className="text-xl font-bold font-mono text-slate-900">{totalPiezas}</span>
                <span className="text-[10px] text-blue-600 font-bold font-mono">Piezas Físicas</span>
              </div>
            </div>
          </div>

          {/* Desglose de Almacenes */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            {ALMACENES_DISTRIBUCION.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }}></span>
                  <div>
                    <span className="text-slate-700 font-medium block">{a.nombre}</span>
                    <span className="text-[10px] text-slate-400">{a.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-right">
                  <span className="font-bold text-slate-800">{a.piezas} pzas</span>
                  <span className="text-slate-400 font-medium">({a.porcentaje}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tareas Urgentes de Almacén */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerta de Desabasto Físico */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Alerta de Stock Crítico
            </h3>
            <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 font-semibold px-2.5 py-0.5 rounded-full">
              Desabasto Activo
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">Compresor de Aire 50 Litros 2.5 HP</p>
                <p className="text-xs font-mono text-slate-500">SKU: HER-002 | Código: 7501234567891</p>
              </div>
              <span className="text-xs bg-white text-slate-700 border border-slate-200 px-2 py-1 rounded-lg font-semibold font-mono">
                Sucursal GDL
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
              <div>
                <span className="text-slate-500">Existencia actual:</span>
                <p className="font-bold font-mono text-rose-600 text-sm">4 piezas</p>
              </div>
              <div>
                <span className="text-slate-500">Mínimo requerido:</span>
                <p className="font-bold font-mono text-slate-800 text-sm">5 piezas</p>
              </div>
            </div>

            <p className="text-xs text-blue-700 font-medium">
              Traspaso de 5 piezas en tránsito desde CEDIS Monterrey para cubrir este faltante.
            </p>
          </div>
        </div>

        {/* Cotejo de Traspaso Entrante */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Recepción Física Pendiente de Cotejo
            </h3>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              TRASP-2026-001
            </span>
          </div>

          <div className="p-4 border border-blue-100 bg-blue-50/40 rounded-xl space-y-2">
            <p className="text-xs text-slate-600">
              Despachado desde: <strong>CEDIS Central Monterrey</strong> con destino a <strong>Sucursal Guadalajara</strong>.
            </p>
            <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
              <span className="font-medium text-slate-800">Compresor de Aire 50 Litros</span>
              <span className="font-bold font-mono text-slate-900">Enviadas: 5 pzas</span>
            </div>
            <div className="pt-2">
              <Link
                href="/traspasos"
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-semibold py-2.5 px-3 rounded-xl block text-center transition-all shadow-sm"
              >
                Abrir Pantalla de Conteo y Recepción Física
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
