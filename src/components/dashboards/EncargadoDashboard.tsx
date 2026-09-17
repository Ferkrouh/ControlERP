'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  DollarSign, 
  CreditCard, 
  AlertCircle, 
  ArrowLeftRight, 
  Plus, 
  Clock, 
  ShieldAlert,
  Calendar,
  TrendingUp,
  Activity,
  Layers,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CheckCircle2
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
        <linearGradient id={`grad-enc-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-enc-${id})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* Indicador de último punto con pulso */}
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

// Datos de Operaciones Diarias
const RITMO_VENTAS_DATA = {
  hoy: [
    { label: '09:00', ventas: 4200, cobranza: 2500, transacciones: 3 },
    { label: '11:00', ventas: 9800, cobranza: 6400, transacciones: 7 },
    { label: '13:00', ventas: 14500, cobranza: 11200, transacciones: 11 },
    { label: '15:00', ventas: 8900, cobranza: 4300, transacciones: 5 },
    { label: '17:00', ventas: 16200, cobranza: 8050, transacciones: 14 },
    { label: '19:00', ventas: 6450, cobranza: 0, transacciones: 4 },
  ],
  semana: [
    { label: 'Lun', ventas: 34500, cobranza: 18200, transacciones: 22 },
    { label: 'Mar', ventas: 41200, cobranza: 28400, transacciones: 29 },
    { label: 'Mié', ventas: 38900, cobranza: 24100, transacciones: 26 },
    { label: 'Jue', ventas: 52400, cobranza: 39500, transacciones: 35 },
    { label: 'Vie', ventas: 68100, cobranza: 44200, transacciones: 48 },
    { label: 'Sáb', ventas: 45300, cobranza: 31000, transacciones: 31 },
    { label: 'Dom', ventas: 12000, cobranza: 5000, transacciones: 9 },
  ],
  quincena: [
    { label: 'Día 1-3', ventas: 85000, cobranza: 62000, transacciones: 65 },
    { label: 'Día 4-6', ventas: 92000, cobranza: 71000, transacciones: 74 },
    { label: 'Día 7-9', ventas: 78000, cobranza: 54000, transacciones: 58 },
    { label: 'Día 10-12', ventas: 115000, cobranza: 89000, transacciones: 92 },
    { label: 'Día 13-15', ventas: 142000, cobranza: 118000, transacciones: 115 },
  ]
};

// Desglose de Métodos de Pago
const METODOS_PAGO = [
  { nombre: 'Transferencia SPEI', porcentaje: 48, monto: 15576, color: '#10b981', bg: 'bg-emerald-500' },
  { nombre: 'Tarjeta TPV', porcentaje: 26, monto: 8437, color: '#3b82f6', bg: 'bg-blue-500' },
  { nombre: 'Efectivo en Caja', porcentaje: 16, monto: 5192, color: '#f59e0b', bg: 'bg-amber-500' },
  { nombre: 'Crédito a Plazos', porcentaje: 10, monto: 3245, color: '#8b5cf6', bg: 'bg-purple-500' },
];

// Top Productos Despachados
const TOP_PRODUCTOS = [
  { sku: 'HER-001', nombre: 'Taladro Percutor Industrial 1/2" 850W', unidades: 48, ingreso: '$57,600.00', rotacion: 92, status: 'Óptimo' },
  { sku: 'HER-002', nombre: 'Compresor de Aire 50L 2.5 HP', unidades: 26, ingreso: '$46,800.00', rotacion: 68, status: 'Reabastecer' },
  { sku: 'MAT-104', nombre: 'Soldadora Inversora 200A 110/220V', unidades: 19, ingreso: '$41,800.00', rotacion: 85, status: 'Óptimo' },
  { sku: 'DIS-022', nombre: 'Disco de Corte Fino 4-1/2" (Pack 50)', unidades: 115, ingreso: '$28,750.00', rotacion: 96, status: 'Alta Demanda' },
];

export default function EncargadoDashboard() {
  const { user } = useAuth();
  const tenant = user?.tenant;
  
  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'quincena'>('semana');
  const [activeSeries, setActiveSeries] = useState<{ ventas: boolean; cobranza: boolean }>({ ventas: true, cobranza: true });
  const [hoveredData, setHoveredData] = useState<any | null>(null);

  const currentChartData = RITMO_VENTAS_DATA[periodo];
  const maxVal = Math.max(...currentChartData.map(d => Math.max(d.ventas, d.cobranza))) * 1.15;

  return (
    <div className="space-y-6">
      {/* Header Operativo Soberano */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Encargado de Sucursal & Operaciones
            </span>
            <span className="bg-white/10 text-white/90 text-xs px-2.5 py-0.5 rounded-full">
              {tenant?.nombreComercial}
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2 tracking-tight">Centro de Control Comercial & Operativo</h2>
          <p className="text-slate-400 text-sm mt-1">
            Gestión diaria de ventas, ritmo de despacho, cobranza de clientes y supervisión de traspasos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/cxc"
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Registrar Cobranza
          </Link>
          <Link
            href="/traspasos"
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" /> Solicitar Traspaso
          </Link>
        </div>
      </div>

      {/* Tarjetas de Operación Diaria con Sparklines (Card Float Principle) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cobranza del Mes</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-emerald-700">$32,450.00</p>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5 font-mono">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[12000, 15400, 18200, 22100, 26800, 29400, 32450]} color="#10b981" id="cobranza" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Recaudación real conciliada</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Facturas por Vencer</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-amber-700">2 facturas</p>
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
              $18,400
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[5, 4, 6, 3, 4, 3, 2]} color="#f59e0b" id="facturas" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Próximas 48 - 72 horas</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Clientes Retenidos</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-rose-600">1 cliente</p>
            <span className="text-xs font-bold font-mono text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md">
              100% cupo
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[3, 2, 2, 1, 2, 1, 1]} color="#f43f5e" id="retenidos" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Límite saturado / Venta en pausa</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Traspasos en Curso</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-blue-700">1 orden</p>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
              5 piezas
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[0, 1, 2, 1, 3, 2, 1]} color="#3b82f6" id="traspasos" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">En tránsito hacia Sucursal GDL</p>
        </div>
      </div>

      {/* Gráfico Principal: Ritmo de Operaciones y Métodos de Pago */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Ventas vs Cobranza */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Ritmo Transaccional y Recaudación</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Cruce en tiempo real de ventas generadas vs cobranza efectiva</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Filtros de período */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
                {(['hoy', 'semana', 'quincena'] as const).map(p => (
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

              {/* Toggles de serie */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl text-xs">
                <button
                  onClick={() => setActiveSeries(prev => ({ ...prev, ventas: !prev.ventas }))}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all ${
                    activeSeries.ventas ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-400 opacity-60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Ventas
                </button>
                <button
                  onClick={() => setActiveSeries(prev => ({ ...prev, cobranza: !prev.cobranza }))}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all ${
                    activeSeries.cobranza ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-400 opacity-60'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Cobranza
                </button>
              </div>
            </div>
          </div>

          {/* Área de Visualización SVG Interactiva */}
          <div className="relative pt-4 pb-2">
            <div className="h-64 w-full relative">
              <svg viewBox="0 0 700 240" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="enc-ventas-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="enc-cobranza-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <filter id="enc-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Grid horizontal */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = 220 - ratio * 190;
                  return (
                    <g key={i}>
                      <line x1="0" y1={y} x2="700" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <text x="0" y={y - 4} fill="#94a3b8" fontSize="10" fontFamily="monospace">
                        ${Math.round((maxVal * ratio) / 1000)}k
                      </text>
                    </g>
                  );
                })}

                {/* Barras y Áreas SVG */}
                {currentChartData.map((d, i) => {
                  const x = (i / (currentChartData.length - 1)) * 640 + 30;
                  const barWidth = Math.max(16, 400 / currentChartData.length);
                  
                  return (
                    <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredData(d)} onMouseLeave={() => setHoveredData(null)}>
                      {/* Fondo de columna activa al hover */}
                      {hoveredData?.label === d.label && (
                        <rect
                          x={x - barWidth}
                          y={20}
                          width={barWidth * 2}
                          height={200}
                          fill="#f8fafc"
                          rx="8"
                          opacity="0.9"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Curva de Ventas */}
                {activeSeries.ventas && (
                  <>
                    <polygon
                      points={`30,220 ${currentChartData.map((d, i) => `${(i / (currentChartData.length - 1)) * 640 + 30},${220 - (d.ventas / maxVal) * 190}`).join(' ')} 670,220`}
                      fill="url(#enc-ventas-grad)"
                    />
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#enc-glow)"
                      points={currentChartData.map((d, i) => `${(i / (currentChartData.length - 1)) * 640 + 30},${220 - (d.ventas / maxVal) * 190}`).join(' ')}
                    />
                  </>
                )}

                {/* Curva de Cobranza */}
                {activeSeries.cobranza && (
                  <>
                    <polygon
                      points={`30,220 ${currentChartData.map((d, i) => `${(i / (currentChartData.length - 1)) * 640 + 30},${220 - (d.cobranza / maxVal) * 190}`).join(' ')} 670,220`}
                      fill="url(#enc-cobranza-grad)"
                    />
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={currentChartData.map((d, i) => `${(i / (currentChartData.length - 1)) * 640 + 30},${220 - (d.cobranza / maxVal) * 190}`).join(' ')}
                    />
                  </>
                )}

                {/* Puntos y Nodos */}
                {currentChartData.map((d, i) => {
                  const x = (i / (currentChartData.length - 1)) * 640 + 30;
                  const yVentas = 220 - (d.ventas / maxVal) * 190;
                  const yCobranza = 220 - (d.cobranza / maxVal) * 190;
                  const isHovered = hoveredData?.label === d.label;

                  return (
                    <g key={i}>
                      {activeSeries.ventas && (
                        <circle
                          cx={x}
                          cy={yVentas}
                          r={isHovered ? "5.5" : "3.5"}
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all duration-200"
                        />
                      )}
                      {activeSeries.cobranza && (
                        <circle
                          cx={x}
                          cy={yCobranza}
                          r={isHovered ? "5" : "3"}
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all duration-200"
                        />
                      )}
                      {/* Label eje X */}
                      <text
                        x={x}
                        y={236}
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

              {/* Tooltip Dinámico */}
              {hoveredData && (
                <div className="absolute top-2 right-4 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-xs space-y-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1">
                    <span className="font-bold text-slate-200">{hoveredData.label}</span>
                    <span className="text-[10px] text-blue-400 font-mono">{hoveredData.transacciones} operaciones</span>
                  </div>
                  {activeSeries.ventas && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Ventas:
                      </span>
                      <span className="font-bold font-mono text-blue-400">${hoveredData.ventas.toLocaleString('es-MX')}</span>
                    </div>
                  )}
                  {activeSeries.cobranza && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Cobranza:
                      </span>
                      <span className="font-bold font-mono text-emerald-400">${hoveredData.cobranza.toLocaleString('es-MX')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Donut Chart: Métodos de Pago */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Medios de Cobro</h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                $32,450.00
              </span>
            </div>

            {/* SVG Donut */}
            <div className="relative flex items-center justify-center my-6">
              <svg viewBox="0 0 160 160" className="w-40 h-40 transform -rotate-90">
                {/* Donut segments calculation */}
                {(() => {
                  let accumulatedPercent = 0;
                  const radius = 60;
                  const circumference = 2 * Math.PI * radius;

                  return METODOS_PAGO.map((m, idx) => {
                    const strokeDasharray = `${(m.porcentaje / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                    accumulatedPercent += m.porcentaje;

                    return (
                      <circle
                        key={idx}
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="transparent"
                        stroke={m.color}
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
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Cobrado</span>
                <span className="text-lg font-bold font-mono text-slate-900">100%</span>
                <span className="text-[10px] text-emerald-600 font-bold font-mono">4 Canales</span>
              </div>
            </div>
          </div>

          {/* Desglose de Leyendas */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            {METODOS_PAGO.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }}></span>
                  <span className="text-slate-600 font-medium">{m.nombre}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-400">${m.monto.toLocaleString('es-MX')}</span>
                  <span className="font-bold text-slate-800">{m.porcentaje}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Productos Más Vendidos con Rendimiento Visual */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Top Artículos con Mayor Demanda en Sucursal</h3>
              <p className="text-xs text-slate-400">Velocidad de despacho y rotación de stock físico en mostrador</p>
            </div>
          </div>
          <Link href="/inventarios" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
            Ver Catálogo <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {TOP_PRODUCTOS.map((p, idx) => (
            <div key={idx} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3 hover:bg-slate-100/70 transition-all">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-mono font-bold bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded">
                  {p.sku}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  p.status === 'Reabastecer' 
                    ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                    : p.status === 'Alta Demanda'
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                  {p.status}
                </span>
              </div>

              <div>
                <p className="font-semibold text-slate-800 text-xs line-clamp-1">{p.nombre}</p>
                <p className="text-base font-bold font-mono text-slate-900 mt-1">{p.ingreso}</p>
                <p className="text-[11px] text-slate-400">{p.unidades} unidades despachadas</p>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400 font-medium">Índice de Rotación</span>
                  <span className="font-bold font-mono text-slate-700">{p.rotacion}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      p.rotacion > 80 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${p.rotacion}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas Urgentes de Cobranza y Validación de Crédito */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerta de Crédito Bloqueado */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              Alerta de Límite de Crédito: Venta Bloqueada
            </h3>
          </div>
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-bold text-rose-900 text-sm">Comercializadora San Pedro S. de R.L.</p>
              <span className="text-xs font-semibold bg-rose-200 text-rose-800 px-2 py-0.5 rounded font-mono">
                Mora: 25 días
              </span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              El cliente tiene un límite de crédito de <strong className="font-mono">$50,000.00</strong> y un saldo adeudado de <strong className="font-mono">$50,000.00</strong>. 
              El motor de control de crédito ha bloqueado automáticamente nuevos pedidos a crédito según la política <strong>ESTRICTA</strong> del negocio.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/cxc"
                className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" /> Registrar Pago de Abono
              </Link>
              <Link
                href="/clientes"
                className="text-xs font-semibold text-rose-800 hover:underline"
              >
                Ver Expediente del Cliente
              </Link>
            </div>
          </div>
        </div>

        {/* Traspaso de Almacén en Tránsito */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-600" />
              Traspaso de Almacén en Proceso
            </h3>
            <span className="text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold">
              TRASP-2026-001
            </span>
          </div>
          
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Origen: CEDIS Central MTY</span>
              <span className="text-slate-400 font-mono">→</span>
              <span>Destino: Sucursal GDL</span>
            </div>
            <p className="text-xs text-slate-600">
              Artículo: <strong>Compresor de Aire 50 Litros (5 piezas)</strong>
            </p>
            <p className="text-xs text-slate-500">
              Estatus: <span className="text-blue-700 font-semibold">DESPACHADO</span>. El almacenista de destino debe confirmar la recepción física.
            </p>
            <div className="pt-2">
              <Link
                href="/traspasos"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Monitorear Traspasos <ArrowLeftRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
