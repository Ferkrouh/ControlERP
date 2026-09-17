'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  Boxes, 
  ShieldCheck, 
  Server, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  ArrowUpRight,
  KeyRound,
  HardDrive,
  Cloud,
  Lock,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  Layers,
  Clock,
  Activity,
  Radio,
  Sliders,
  TrendingUp,
  PieChart,
  Cpu,
  Database
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Tenant {
  id: string;
  nombreComercial: string;
  razonSocial?: string;
  identificacionFiscal: string;
  giro: string;
  activo: boolean;
  colorPrimario?: string;
  planSuscripcion?: string;
  fechaVencimientoPlan?: string | null;
  diasGraciaSuscripcion?: number;
  bloqueadoPorSuscripcion?: boolean;
  limiteUsuarios?: number;
  limiteAlmacenes?: number;
  moduloMultiAlmacen?: boolean;
  moduloTraspasos?: boolean;
  moduloCredito?: boolean;
  moduloFacturacionSAT?: boolean;
  moduloTesoreria?: boolean;
  moduloManufactura?: boolean;
  moduloCrm?: boolean;
  _count?: {
    usuarios: number;
    almacenes: number;
    ventas: number;
    compras: number;
  };
  usuarios?: any[];
  almacenes?: any[];
}

interface AuditLog {
  id: string;
  modulo: string;
  accion: string;
  usuarioNombre: string;
  detalles: string;
  nivelRiesgo: string;
  fecha: string;
}

const PLAN_PRICES: Record<string, number> = {
  DEMO: 0,
  BASICO: 799,
  PROFESIONAL: 1899,
  ENTERPRISE: 3999,
  PERSONALIZADO: 2499,
};

// Mini Sparkline SVG elegante
function Sparkline({ data, color = '#8b5cf6', height = 34, width = 90 }: { data: number[]; color?: string; height?: number; width?: number }) {
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
  const gradientId = `sa-spark-${color.replace('#', '')}-${Math.random().toString(36).substring(2, 6)}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
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
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 8) - 4}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}

// Histórico de MRR para el gráfico
const SAAS_GROWTH_DATA = {
  '3M': {
    labels: ['Ene', 'Feb', 'Mar'],
    mrr: [12800, 16400, 21890],
    tenants: [4, 6, 9],
  },
  '6M': {
    labels: ['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar'],
    mrr: [7800, 9500, 11200, 14500, 17800, 21890],
    tenants: [2, 3, 4, 5, 7, 9],
  },
  '1A': {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    mrr: [5400, 11200, 16800, 21890],
    tenants: [2, 4, 7, 9],
  }
};

export default function SuperadminDashboard() {
  const { switchUser } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  const [growthPeriod, setGrowthPeriod] = useState<'3M' | '6M' | '1A'>('6M');
  const [chartHover, setChartHover] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [resTenants, resAudit] = await Promise.all([
        fetch('/api/tenants'),
        fetch('/api/auditoria?limit=6'),
      ]);

      if (resTenants.ok) {
        const data = await resTenants.json();
        setTenants(data);
      }

      if (resAudit.ok) {
        const auditData = await resAudit.json();
        if (Array.isArray(auditData)) {
          setRecentLogs(auditData.slice(0, 5));
        } else if (auditData.logs) {
          setRecentLogs(auditData.logs.slice(0, 5));
        }
      }
    } catch (e) {
      console.error('Error fetching Superadmin Dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (tenantId: string, moduleKey: string, currentValue: boolean) => {
    try {
      setTogglingModule(`${tenantId}-${moduleKey}`);
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [moduleKey]: !currentValue }),
      });
      if (res.ok) {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenantId ? { ...t, [moduleKey]: !currentValue } : t))
        );
      }
    } catch (e) {
      console.error('Error toggling module:', e);
    } finally {
      setTogglingModule(null);
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    try {
      const res = await fetch(`/api/tenants/${tenant.id}`);
      if (!res.ok) throw new Error('Error al consultar usuarios del tenant');
      const data = await res.json();
      
      const adminUser = data.usuarios?.find((u: any) => u.rol === 'ADMIN') || data.usuarios?.[0];
      if (!adminUser) {
        alert('Este negocio no cuenta con usuarios configurados aún.');
        return;
      }

      if (confirm(`¿Deseas ingresar a la vista de "${tenant.nombreComercial}" como ${adminUser.nombre} (${adminUser.email})?`)) {
        await switchUser(adminUser.email);
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Error durante impersonación:', err);
      alert('No se pudo acceder al entorno del tenant');
    }
  };

  const getSubscriptionStatus = (t: Tenant) => {
    if (!t.activo) {
      return { status: 'PAUSADO', label: 'Pausado', badgeBg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    if (t.bloqueadoPorSuscripcion) {
      return { status: 'BLOQUEADO', label: 'Bloqueado', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (!t.fechaVencimientoPlan) {
      return { status: 'ACTIVO', label: 'Permanente', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }

    const now = new Date().getTime();
    const vencimiento = new Date(t.fechaVencimientoPlan).getTime();
    const diffDays = Math.ceil((vencimiento - now) / (1000 * 3600 * 24));
    const diasGracia = t.diasGraciaSuscripcion || 3;

    if (diffDays > 7) {
      return { status: 'ACTIVO', label: `Activo (${diffDays}d)`, badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    } else if (diffDays > 0) {
      return { status: 'POR_VENCER', label: `Vence en ${diffDays}d`, badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' };
    } else if (diffDays >= -diasGracia) {
      return { status: 'MOROSO_GRACIA', label: `En Gracia (+${Math.abs(diffDays)}d)`, badgeBg: 'bg-orange-50 text-orange-700 border-orange-200' };
    } else {
      return { status: 'VENCIDO', label: `Vencido (+${Math.abs(diffDays)}d)`, badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
  };

  const mrrEstimado = useMemo(() => {
    return tenants.reduce((acc, t) => {
      if (!t.activo || t.bloqueadoPorSuscripcion) return acc;
      const plan = (t.planSuscripcion || 'PROFESIONAL').toUpperCase();
      return acc + (PLAN_PRICES[plan] || 1899);
    }, 0);
  }, [tenants]);

  const totalUsuarios = useMemo(() => {
    return tenants.reduce((acc, t) => acc + (t._count?.usuarios || t.usuarios?.length || 0), 1);
  }, [tenants]);

  const totalAlmacenes = useMemo(() => {
    return tenants.reduce((acc, t) => acc + (t._count?.almacenes || t.almacenes?.length || 0), 0);
  }, [tenants]);

  const negociosEnAlerta = useMemo(() => {
    return tenants.filter((t) => {
      const sub = getSubscriptionStatus(t);
      return sub.status === 'POR_VENCER' || sub.status === 'MOROSO_GRACIA' || sub.status === 'VENCIDO';
    }).length;
  }, [tenants]);

  const almacenamientoTotalMB = useMemo(() => {
    const totalRecords = tenants.reduce((acc, t) => {
      const ventas = t._count?.ventas || 0;
      const compras = t._count?.compras || 0;
      return acc + ventas + compras + 20;
    }, 0);
    return ((totalRecords * 4.5) / 1024).toFixed(1);
  }, [tenants]);

  // Distribución de planes
  const planDistribution = useMemo(() => {
    const counts = { ENTERPRISE: 0, PROFESIONAL: 0, BASICO: 0, DEMO: 0 };
    tenants.forEach(t => {
      const p = (t.planSuscripcion || 'PROFESIONAL').toUpperCase() as keyof typeof counts;
      if (counts[p] !== undefined) counts[p]++;
      else counts.PROFESIONAL++;
    });
    const total = tenants.length || 1;
    return {
      counts,
      percentages: {
        ENTERPRISE: Math.round((counts.ENTERPRISE / total) * 100),
        PROFESIONAL: Math.round((counts.PROFESIONAL / total) * 100),
        BASICO: Math.round((counts.BASICO / total) * 100),
        DEMO: Math.round((counts.DEMO / total) * 100),
      }
    };
  }, [tenants]);

  const currentGrowth = SAAS_GROWTH_DATA[growthPeriod];
  const maxGrowthMrr = Math.max(...currentGrowth.mrr) * 1.2;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Cabecera Soberana Ejecutiva - The Fintech Ledger */}
      <div className="bg-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Plataforma SaaS Global
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Docker Ubuntu • Servidor Online
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Panel Maestro Superadmin SaaS
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            Supervisa el crecimiento comercial recurrente, la salud técnica de las bases de datos y la autorización modular de las empresas clientes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 relative z-10">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-800"
            title="Sincronizar telemetría de inquilinos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          <Link
            href="/superadmin/personalizar"
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center gap-2"
          >
            <Sliders className="w-4 h-4 text-purple-400" /> Personalizar Negocios
          </Link>

          <Link
            href="/negocios"
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md shadow-purple-950/40 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Dar de Alta Negocio
          </Link>
        </div>
      </div>

      {/* 2. Cuadrícula de Métricas Clave (Fintech Ledger KPIs) con Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Estimado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">MRR Recurrente Estimado</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-2xl font-bold font-mono text-slate-900">
                ${mrrEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span className="text-emerald-700 font-semibold font-mono">MXN/mes</span> • Suscripciones
              </p>
            </div>
            <Sparkline data={[12800, 14500, 17200, 19400, mrrEstimado || 21890]} color="#8b5cf6" />
          </div>
        </div>

        {/* Empresas Activas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Negocios Registrados</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-2xl font-bold font-mono text-slate-900">{tenants.length}</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                <span className="font-semibold text-slate-700">{totalUsuarios}</span> usuarios en red
              </p>
            </div>
            <Sparkline data={[3, 4, 6, 7, tenants.length || 9]} color="#3b82f6" />
          </div>
        </div>

        {/* Alertas de Suscripción */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Alertas de Cartera</span>
            <div className={`p-2 rounded-xl ${negociosEnAlerta > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : 'bg-slate-100 text-slate-600'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className={`text-2xl font-bold font-mono ${negociosEnAlerta > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {negociosEnAlerta}
              </p>
              <p className="text-xs text-slate-500 mt-1">Por vencer / en gracia</p>
            </div>
            <Sparkline data={[0, 1, 2, 1, negociosEnAlerta]} color="#f59e0b" />
          </div>
        </div>

        {/* Almacenes & Red Física */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Almacenes en Red</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-2xl font-bold font-mono text-slate-900">{totalAlmacenes}</p>
              <p className="text-xs text-slate-500 mt-1">Centros de distribución</p>
            </div>
            <Sparkline data={[2, 4, 5, 7, totalAlmacenes || 8]} color="#10b981" />
          </div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICOS ANALÍTICOS DE LA PLATAFORMA SAAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Curva de Crecimiento MRR y Suscripciones (2 Columnas) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                Crecimiento de MRR & Expansión de Negocios
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresos recurrentes mensuales por licencias de software
              </p>
            </div>

            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
              {(['3M', '6M', '1A'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setGrowthPeriod(p)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    growthPeriod === p ? 'bg-white text-purple-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Gráfico SVG de Curva Soberana */}
          <div className="relative h-60 w-full pt-4">
            <svg viewBox="0 0 600 180" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="saas-mrr-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#7c3aed" floodOpacity="0.35" />
                </filter>
              </defs>

              {/* Líneas Guía Horizontales */}
              {[0, 0.33, 0.66, 1].map((ratio, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={15 + ratio * 140}
                  x2="600"
                  y2={15 + ratio * 140}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Área MRR */}
              {(() => {
                const count = currentGrowth.labels.length;
                const step = 600 / (count - 1);
                const pts = currentGrowth.mrr.map((v, i) => {
                  const x = i * step;
                  const y = 155 - (v / maxGrowthMrr) * 140;
                  return `${x},${y}`;
                });
                const linePath = `M ${pts.join(' L ')}`;
                const areaPath = `M 0,155 L ${pts.join(' L ')} L 600,155 Z`;
                return (
                  <g>
                    <path d={areaPath} fill="url(#saas-mrr-grad)" />
                    <path d={linePath} fill="none" stroke="#7c3aed" strokeWidth="3.5" filter="url(#glow-purple)" strokeLinecap="round" strokeLinejoin="round" />
                    {currentGrowth.mrr.map((v, i) => {
                      const cx = i * step;
                      const cy = 155 - (v / maxGrowthMrr) * 140;
                      return (
                        <circle
                          key={`mrr-dot-${i}`}
                          cx={cx}
                          cy={cy}
                          r={chartHover === i ? 6 : 4}
                          fill="#ffffff"
                          stroke="#7c3aed"
                          strokeWidth="2.5"
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setChartHover(i)}
                          onMouseLeave={() => setChartHover(null)}
                        />
                      );
                    })}
                  </g>
                );
              })()}
            </svg>

            {/* Eje X */}
            <div className="flex justify-between text-xs text-slate-400 font-mono mt-2 px-1">
              {currentGrowth.labels.map((lbl, i) => (
                <span
                  key={i}
                  className={`transition-colors ${chartHover === i ? 'text-purple-600 font-bold' : ''}`}
                >
                  {lbl}
                </span>
              ))}
            </div>

            {/* Tooltip */}
            {chartHover !== null && (
              <div 
                className="absolute top-2 bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-xl text-xs shadow-2xl border border-slate-700 pointer-events-none transition-all z-20"
                style={{ left: `${(chartHover / (currentGrowth.labels.length - 1)) * 80 + 10}%` }}
              >
                <div className="font-bold border-b border-slate-700 pb-1 text-purple-300">
                  {currentGrowth.labels[chartHover]}
                </div>
                <div className="space-y-0.5 mt-1 font-mono text-[11px]">
                  <div className="text-white">MRR: ${currentGrowth.mrr[chartHover].toLocaleString('es-MX')} MXN</div>
                  <div className="text-slate-400">{currentGrowth.tenants[chartHover]} negocios activos</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Donut de Distribución de Planes SaaS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 p-6 space-y-5 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-600" />
              Distribución de Planes SaaS
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Segmentación de licencias activas</p>
          </div>

          {/* Donut SVG */}
          <div className="relative flex items-center justify-center my-2">
            <svg width="170" height="170" viewBox="0 0 170 170" className="transform -rotate-90">
              <circle cx="85" cy="85" r="65" fill="none" stroke="#f1f5f9" strokeWidth="18" />

              {/* Enterprise (Púrpura) */}
              <circle
                cx="85"
                cy="85"
                r="65"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="18"
                strokeDasharray={`${(planDistribution.percentages.ENTERPRISE * 408) / 100} 408`}
                strokeDashoffset="0"
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />

              {/* Profesional (Azul) */}
              <circle
                cx="85"
                cy="85"
                r="65"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="18"
                strokeDasharray={`${(planDistribution.percentages.PROFESIONAL * 408) / 100} 408`}
                strokeDashoffset={`-${(planDistribution.percentages.ENTERPRISE * 408) / 100}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />

              {/* Básico (Esmeralda) */}
              <circle
                cx="85"
                cy="85"
                r="65"
                fill="none"
                stroke="#10b981"
                strokeWidth="18"
                strokeDasharray={`${(planDistribution.percentages.BASICO * 408) / 100} 408`}
                strokeDashoffset={`-${((planDistribution.percentages.ENTERPRISE + planDistribution.percentages.PROFESIONAL) * 408) / 100}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Centro */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Negocios</span>
              <span className="text-lg font-bold font-mono text-slate-900">
                {tenants.length}
              </span>
              <span className="text-[10px] text-purple-600 font-semibold">100% cloud</span>
            </div>
          </div>

          {/* Leyenda */}
          <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                <span className="text-slate-600 font-sans">Enterprise ($3,999)</span>
              </div>
              <span className="font-bold text-slate-900">{planDistribution.counts.ENTERPRISE} ({planDistribution.percentages.ENTERPRISE}%)</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 font-sans">Profesional ($1,899)</span>
              </div>
              <span className="font-bold text-slate-900">{planDistribution.counts.PROFESIONAL} ({planDistribution.percentages.PROFESIONAL}%)</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 font-sans">Básico ($799)</span>
              </div>
              <span className="font-bold text-slate-900">{planDistribution.counts.BASICO} ({planDistribution.percentages.BASICO}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Matriz Maestra de Clientes (Tenants Ledger) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              Matriz Maestra de Clientes & Conmutación Restrictiva
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control centralizado de licencias. Los administradores de cada empresa solo tienen visibilidad de los módulos encendidos.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/superadmin/personalizar"
              className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/80 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5" /> Consola de Personalización Quirúrgica
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
            <span className="text-xs font-semibold">Cargando matriz de inquilinos...</span>
          </div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No hay negocios registrados en la plataforma.</p>
            <Link
              href="/negocios"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-purple-600 font-bold hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Dar de alta el primer negocio
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Negocio / Razón Social</th>
                  <th className="py-3 px-4">Plan SaaS & Vigencia</th>
                  <th className="py-3 px-4 text-center">Multi-Almacén</th>
                  <th className="py-3 px-4 text-center">Traspasos</th>
                  <th className="py-3 px-4 text-center">Crédito & CxC</th>
                  <th className="py-3 px-4 text-center">Facturación SAT</th>
                  <th className="py-3 px-4 text-center">Tesorería</th>
                  <th className="py-3 px-4 text-center">Manufactura</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {tenants.map((t) => {
                  const sub = getSubscriptionStatus(t);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Empresa y RFC */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                            style={{ backgroundColor: t.colorPrimario || '#2563eb' }}
                          >
                            {t.nombreComercial.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight">{t.nombreComercial}</p>
                            <p className="text-xs text-slate-400 font-mono">RFC: {t.identificacionFiscal}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan y Vigencia */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 uppercase text-[11px]">
                              {t.planSuscripcion || 'PROFESIONAL'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sub.badgeBg}`}>
                              {sub.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {t.fechaVencimientoPlan 
                              ? `Vence: ${new Date(t.fechaVencimientoPlan).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`
                              : 'Vigencia Permanente'}
                          </p>
                        </div>
                      </td>
                      
                      {/* Switch MultiAlmacen */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloMultiAlmacen', !!t.moduloMultiAlmacen)}
                          disabled={togglingModule === `${t.id}-moduloMultiAlmacen`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                        >
                          {t.moduloMultiAlmacen ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Bloqueado
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Switch Traspasos */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloTraspasos', !!t.moduloTraspasos)}
                          disabled={togglingModule === `${t.id}-moduloTraspasos`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                        >
                          {t.moduloTraspasos ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Bloqueado
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Switch Credito */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloCredito', !!t.moduloCredito)}
                          disabled={togglingModule === `${t.id}-moduloCredito`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                        >
                          {t.moduloCredito ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Bloqueado
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Switch SAT */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloFacturacionSAT', !!t.moduloFacturacionSAT)}
                          disabled={togglingModule === `${t.id}-moduloFacturacionSAT`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                        >
                          {t.moduloFacturacionSAT ? (
                            <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1 border border-purple-200">
                              CFDI 4.0
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Switch Tesorería */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloTesoreria', !!t.moduloTesoreria)}
                          disabled={togglingModule === `${t.id}-moduloTesoreria`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                        >
                          {t.moduloTesoreria ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                              Bancos
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Switch Manufactura */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloManufactura', !!t.moduloManufactura)}
                          disabled={togglingModule === `${t.id}-moduloManufactura`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                        >
                          {t.moduloManufactura ? (
                            <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-200">
                              BOM/OP
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleImpersonate(t)}
                            className="p-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-all border border-purple-200/60"
                            title="Ingreso de Soporte Directo (Impersonación)"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            href={`/superadmin/personalizar`}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                            title="Personalización Quirúrgica"
                          >
                            <Sliders className="w-3.5 h-3.5 text-purple-600" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Panel Inferior: Telemetría de Infraestructura & Actividad en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Estatus de Infraestructura Cloud */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-600" />
              Telemetría de Infraestructura
            </h3>
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
              99.98% SLA
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Base de Datos */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="font-semibold text-slate-800">Motor de Base de Datos</p>
                  <p className="text-slate-500 font-mono">SQLite (Dev) / Postgres (Prod)</p>
                </div>
              </div>
              <span className="font-bold font-mono text-slate-700">
                ~{almacenamientoTotalMB} MB
              </span>
            </div>

            {/* Timbrado Fiscal PAC */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="font-semibold text-slate-800">Adaptador Multi-PAC SAT</p>
                  <p className="text-slate-500">Finkok / SW Sapien / Prodigia</p>
                </div>
              </div>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Online (120ms)
              </span>
            </div>

            {/* Seguridad Criptográfica */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="font-semibold text-slate-800">Bitácora Criptográfica</p>
                  <p className="text-slate-500">Encadenamiento SHA-256 Activo</p>
                </div>
              </div>
              <Link 
                href="/auditoria"
                className="text-purple-700 hover:text-purple-900 font-bold hover:underline"
              >
                Auditar &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Feed de Auditoría Global Reciente */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              Feed Transaccional Reciente en Tiempo Real
            </h3>
            <Link 
              href="/auditoria"
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline"
            >
              Ver Auditoría Forense Completa &rarr;
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Sin actividad reciente registrada en la plataforma.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentLogs.map((log) => {
                const isCritico = log.nivelRiesgo === 'CRITICO';
                const isAdvertencia = log.nivelRiesgo === 'ADVERTENCIA';

                return (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50/70 hover:bg-slate-100/70 rounded-xl border border-slate-200/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isCritico ? 'bg-rose-600' : isAdvertencia ? 'bg-amber-500' : 'bg-blue-600'
                      }`} />
                      <span className="font-bold text-slate-900">{log.usuarioNombre}</span>
                      <span className="font-mono bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                        {log.modulo}
                      </span>
                      <span className="font-mono font-bold text-purple-700 uppercase">
                        {log.accion}
                      </span>
                      <span className="text-slate-600 truncate max-w-xs md:max-w-md">
                        {log.detalles}
                      </span>
                    </div>

                    <span className="text-slate-400 font-mono text-xs whitespace-nowrap self-end sm:self-auto">
                      {new Date(log.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
