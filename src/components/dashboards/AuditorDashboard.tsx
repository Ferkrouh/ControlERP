'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Eye, 
  ShieldCheck, 
  FileText, 
  History, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  Scale,
  TrendingDown,
  TrendingUp,
  Percent,
  Layers,
  ArrowUpRight,
  Calculator,
  ShieldAlert,
  FileCheck2
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
        <linearGradient id={`grad-aud-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-aud-${id})`} />
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

// Datos de Antigüedad de Saldos por Rango de Mora
const AGING_DATA = [
  { rango: 'Al Corriente (Vigente)', monto: 57500, porcentaje: 53.5, facturas: 4, color: '#10b981', riesgo: 'Bajo Riesgo', bg: 'bg-emerald-500' },
  { rango: '1 a 30 Días Mora', monto: 50000, porcentaje: 46.5, facturas: 1, color: '#f59e0b', riesgo: 'Cobranza Preventiva', bg: 'bg-amber-500' },
  { rango: '31 a 60 Días Mora', monto: 0, porcentaje: 0, facturas: 0, color: '#f97316', riesgo: 'Gestión Extrajudicial', bg: 'bg-orange-500' },
  { rango: '61 a 90 Días Mora', monto: 0, porcentaje: 0, facturas: 0, color: '#f43f5e', riesgo: 'Crítico / Bloqueo Total', bg: 'bg-rose-500' },
  { rango: '+90 Días (Incobrables)', monto: 0, porcentaje: 0, facturas: 0, color: '#e11d48', riesgo: 'Deducible Art. 27 LISR', bg: 'bg-red-600' },
];

// Estructura Contable de Partida Doble
const ESTRUCTURA_BALANCE = [
  { cuenta: '1. Activo Circulante Total', monto: 211850, porcentaje: 100, color: '#0ea5e9' },
  { cuenta: '2. Pasivo a Corto Plazo (CxP)', monto: 65250, porcentaje: 30.8, color: '#6366f1' },
  { cuenta: '3. Capital Contable / Patrimonio', monto: 146600, porcentaje: 69.2, color: '#10b981' },
];

export default function AuditorDashboard() {
  const { user } = useAuth();
  const tenant = user?.tenant;

  const [agingMode, setAgingMode] = useState<'monto' | 'porcentaje'>('monto');
  const [hoveredAging, setHoveredAging] = useState<any | null>(null);

  const totalCartera = 107500;

  return (
    <div className="space-y-6">
      {/* Header Auditor Soberano */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-400 border border-amber-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Modo Auditoría Fiscal & Control Interno (Solo Lectura)
            </span>
            <span className="bg-white/10 text-white/90 text-xs px-2.5 py-0.5 rounded-full font-mono">
              RFC: {tenant?.identificacionFiscal || 'Sin registrar'}
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2 tracking-tight">Balanza de Comprobación y Trazabilidad Fiscal</h2>
          <p className="text-slate-400 text-sm mt-1">
            Supervisión integral de {tenant?.nombreComercial}, Kárdex bajo método de Costo Promedio (Art. 28 CFF) y bitácora inmutable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reportes"
            className="bg-white text-slate-900 hover:bg-slate-100 active:scale-95 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-blue-600" /> Exportar Dictamen Mensual
          </Link>
          <Link
            href="/auditoria"
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <History className="w-4 h-4" /> Bitácora del Sistema
          </Link>
        </div>
      </div>

      {/* Tarjetas de Balanza Auditoría con Sparklines (Card Float Principle) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cartera de Clientes Total</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-slate-900">$107,500.00</p>
            <span className="text-xs font-bold text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded-md">
              5 facturas
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[85000, 92000, 98000, 104000, 102000, 106000, 107500]} color="#3b82f6" id="cartera" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Saldos por cobrar auditados</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pasivos con Proveedores</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-slate-900">$65,250.00</p>
            <span className="text-xs font-bold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded-md">
              3 OC's
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[50000, 58000, 62000, 60000, 68000, 66000, 65250]} color="#6366f1" id="pasivos" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Obligaciones de pago a plazo</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cartera en Mora</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-rose-600">$50,000.00</p>
            <span className="text-xs font-bold font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md">
              46.5% Mora
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[20000, 30000, 35000, 45000, 50000, 50000, 50000]} color="#f43f5e" id="mora" />
          </div>
          <p className="text-[11px] text-rose-600 font-semibold mt-2">1 cuenta en bloqueo estricto</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Valuación Art. 28 CFF</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-slate-900">$211,850.00</p>
            <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded-md">
              Costo Prom.
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[180000, 190000, 198000, 205000, 208000, 210000, 211850]} color="#10b981" id="valuacion" />
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-2">Valuación fiscal respaldada</p>
        </div>
      </div>

      {/* Gráficos de Auditoría: Antigüedad de Saldos y Estructura Patrimonial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Pirámide de Antigüedad de Saldos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Calculator className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Segmentación de Antigüedad de Saldos (Aging)</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Clasificación de riesgo de cartera por franjas de vencimiento</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
                <button
                  onClick={() => setAgingMode('monto')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    agingMode === 'monto' 
                      ? 'bg-white text-slate-900 shadow-sm font-bold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Importe ($)
                </button>
                <button
                  onClick={() => setAgingMode('porcentaje')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    agingMode === 'porcentaje' 
                      ? 'bg-white text-slate-900 shadow-sm font-bold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Porcentaje (%)
                </button>
              </div>
            </div>
          </div>

          {/* Barras Horizontales de Aging */}
          <div className="space-y-4 pt-1">
            {AGING_DATA.map((item, idx) => {
              const isHovered = hoveredAging?.rango === item.rango;

              return (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isHovered 
                      ? 'bg-slate-50 border-slate-300 shadow-sm' 
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                  onMouseEnter={() => setHoveredAging(item)}
                  onMouseLeave={() => setHoveredAging(null)}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="font-bold text-slate-800">{item.rango}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({item.facturas} facturas)</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        item.monto === 0 
                          ? 'bg-slate-100 text-slate-500' 
                          : item.rango.includes('Corriente')
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {item.riesgo}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {agingMode === 'monto' 
                          ? `$${item.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` 
                          : `${item.porcentaje}%`}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.porcentaje}%`,
                        backgroundColor: item.color,
                        boxShadow: item.porcentaje > 0 ? `0 0 8px ${item.color}66` : 'none'
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ratios Financieros de Auditoría */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[11px] text-slate-500 font-medium block">Razón Circulante (Liquidez)</span>
              <p className="text-lg font-bold font-mono text-emerald-700 mt-0.5">3.24x</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Excelente cobertura</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[11px] text-slate-500 font-medium block">Prueba del Ácido</span>
              <p className="text-lg font-bold font-mono text-blue-700 mt-0.5">1.65x</p>
              <span className="text-[10px] text-blue-600 font-semibold">Sin depender de inventario</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="text-[11px] text-slate-500 font-medium block">Nivel de Endeudamiento</span>
              <p className="text-lg font-bold font-mono text-slate-800 mt-0.5">30.8%</p>
              <span className="text-[10px] text-slate-500 font-semibold">Pasivo / Activo total</span>
            </div>
          </div>
        </div>

        {/* Estructura Patrimonial: Activo vs Pasivo vs Capital */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Estructura Patrimonial</h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                100% Cuadrado
              </span>
            </div>

            {/* Donut SVG de Partida Doble */}
            <div className="relative flex items-center justify-center my-6">
              <svg viewBox="0 0 160 160" className="w-40 h-40 transform -rotate-90">
                {(() => {
                  let accumulatedPercent = 0;
                  const radius = 60;
                  const circumference = 2 * Math.PI * radius;
                  // Desglose de Pasivo (30.8%) y Capital (69.2%)
                  const parts = [
                    { porcentaje: 30.8, color: '#6366f1' },
                    { porcentaje: 69.2, color: '#10b981' }
                  ];

                  return parts.map((p, idx) => {
                    const strokeDasharray = `${(p.porcentaje / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                    accumulatedPercent += p.porcentaje;

                    return (
                      <circle
                        key={idx}
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="transparent"
                        stroke={p.color}
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
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Activo Total</span>
                <span className="text-base font-bold font-mono text-slate-900">$211.8k</span>
                <span className="text-[10px] text-emerald-600 font-bold font-mono">Art. 28 CFF</span>
              </div>
            </div>
          </div>

          {/* Desglose de Cuentas */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {ESTRUCTURA_BALANCE.map((b, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }}></span>
                  <span className="text-slate-700 font-medium">{b.cuenta}</span>
                </div>
                <span className="font-bold font-mono text-slate-900">
                  ${b.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trazabilidad de Auditoría Reciente & Bitácora */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Trazabilidad de Movimientos & Bitácora de Auditoría</h3>
              <p className="text-xs text-slate-400">Registro inmutable de eventos críticos con folio, usuario y timestamp</p>
            </div>
          </div>
          <Link href="/auditoria" className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
            Ver Histórico Completo <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl flex items-start gap-3 hover:bg-slate-100/70 transition-all">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800 text-xs">Traspaso Despachado: Folio <span className="font-mono text-blue-700">TRASP-2026-001</span></p>
                <span className="text-[10px] text-slate-400 font-mono">17/09/2026 14:32</span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">5 unidades Compresor 50L transferidas de Central a GDL.</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Responsable: <strong className="text-slate-600">Almacenista Central</strong></span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl flex items-start gap-3 hover:bg-slate-100/70 transition-all">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800 text-xs">Bloqueo Automático de Crédito Activado</p>
                <span className="text-[10px] text-slate-400 font-mono">17/09/2026 11:15</span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">Cliente Comercializadora San Pedro alcanzó el 100% de su límite de crédito.</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Motor: <strong className="text-rose-700">Control de Crédito Estricto</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
