'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart3, Calendar, FileSpreadsheet, Printer,
  DollarSign, Boxes, CreditCard, Receipt, ShoppingCart,
  Truck, ShieldCheck, TrendingUp, AlertTriangle,
  Users, Target, LayoutGrid, PieChart, RotateCcw,
} from 'lucide-react';

// Importaciones lazy de todos los reportes
import dynamic from 'next/dynamic';

const BalanzaCxCReport = dynamic(() => import('@/components/reportes/BalanzaCxCReport'), { ssr: false });
const AntiguedadSaldosReport = dynamic(() => import('@/components/reportes/AntiguedadSaldosReport'), { ssr: false });
const IngresosRecaudacionReport = dynamic(() => import('@/components/reportes/IngresosRecaudacionReport'), { ssr: false });
const ConciliacionFacturasReport = dynamic(() => import('@/components/reportes/ConciliacionFacturasReport'), { ssr: false });
const ForecastingReport = dynamic(() => import('@/components/reportes/ForecastingReport'), { ssr: false });
const LtvClientesReport = dynamic(() => import('@/components/reportes/LtvClientesReport'), { ssr: false });
const VentasProductoReport = dynamic(() => import('@/components/reportes/VentasProductoReport'), { ssr: false });
const ComisionesReport = dynamic(() => import('@/components/reportes/ComisionesReport'), { ssr: false });
const CumplimientoCuotasReport = dynamic(() => import('@/components/reportes/CumplimientoCuotasReport'), { ssr: false });
const NotasCreditoReport = dynamic(() => import('@/components/reportes/NotasCreditoReport'), { ssr: false });

// ─── Tipos de pestañas ─────────────────────────────────────────────────────
type TabGroup = 'resumen' | 'balanza' | 'ventas' | 'cumplimiento';

interface SubTab {
  id: string;
  label: string;
  component: React.ComponentType<{ mes: string; anio: string }>;
}

const TABS: { id: TabGroup; label: string; icon: React.FC<any>; subTabs?: SubTab[] }[] = [
  {
    id: 'resumen',
    label: 'Resumen Ejecutivo',
    icon: LayoutGrid,
  },
  {
    id: 'balanza',
    label: 'Balanza & Finanzas',
    icon: DollarSign,
    subTabs: [
      { id: 'balanza-cxc', label: 'Balanza de Clientes', component: BalanzaCxCReport },
      { id: 'antiguedad', label: 'Antigüedad de Saldos', component: AntiguedadSaldosReport },
      { id: 'ingresos', label: 'Ingresos y Recaudación', component: IngresosRecaudacionReport },
      { id: 'conciliacion', label: 'Conciliación de Facturas', component: ConciliacionFacturasReport },
    ],
  },
  {
    id: 'ventas',
    label: 'Rendimiento de Ventas',
    icon: TrendingUp,
    subTabs: [
      { id: 'forecasting', label: 'Pronóstico (Forecast)', component: ForecastingReport },
      { id: 'ltv', label: 'Lifetime Value (LTV)', component: LtvClientesReport },
      { id: 'ventas-producto', label: 'Ventas por Producto', component: VentasProductoReport },
      { id: 'comisiones', label: 'Comisiones de Ventas', component: ComisionesReport },
    ],
  },
  {
    id: 'cumplimiento',
    label: 'Gestión & Cumplimiento',
    icon: Target,
    subTabs: [
      { id: 'cuotas', label: 'Cumplimiento de Cuotas', component: CumplimientoCuotasReport },
      { id: 'notas-credito', label: 'Notas de Crédito', component: NotasCreditoReport },
    ],
  },
];

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });

export default function ReportesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState('09');
  const [anio, setAnio] = useState('2026');
  const [activeTab, setActiveTab] = useState<TabGroup>('resumen');
  const [activeSubTab, setActiveSubTab] = useState<string>('balanza-cxc');

  useEffect(() => {
    if (user?.tenantId || user?.rol === 'SUPERADMIN') {
      fetchReportes();
    }
  }, [user, mes, anio]);

  const fetchReportes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reportes/mensual');
      if (res.ok) {
        const rep = await res.json();
        setData(rep);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    const csvContent = `data:text/csv;charset=utf-8,Indicador Financiero / Contable,Monto MXN,Notas
Total Ventas Emitidas,${data.totalVendido},${data.ventasCount} operaciones
Total Compras a Proveedores,${data.totalComprado},${data.comprasCount} recepciones
Cobranza Efectiva de Clientes,${data.cobranzaMes},Abonos recaudados
Liquidaciones a Proveedores,${data.pagosProveedoresMes},Egresos liquidados
Cartera Pendiente por Cobrar,${data.totalPorCobrar},Suma de saldos de clientes
Cartera Vencida (En Mora),${data.totalVencido},Riesgo de cartera
Pasivo Pendiente a Proveedores,${data.totalPorPagar},Suma de facturas por pagar
Valuacion Total de Inventario,${data.valuacionTotal},Costo Promedio Ponderado CFF Art. 28
`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cierre_Contable_ERP_${anio}_${mes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => { window.print(); };

  // ─── Skeleton loader ─────────────────────────────────────────────────────
  const SkeletonResumen = () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-slate-200 rounded-2xl" />
        <div className="h-72 bg-slate-200 rounded-2xl" />
      </div>
    </div>
  );

  // ─── Reporte activo ───────────────────────────────────────────────────────
  const currentGroup = TABS.find((t) => t.id === activeTab);
  const currentSubTab = currentGroup?.subTabs?.find((s) => s.id === activeSubTab);
  const ActiveComponent = currentSubTab?.component ?? null;

  return (
    <div className="space-y-5">
      {/* ─── Header Soberano Ejecutivo ─────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" /> Balanza de Operación & CFF Art. 28
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-2">
            Reportes Ejecutivos & Cierre de Balanza
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitoreo consolidado — ventas, compras, cobranza, márgenes y cumplimiento.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={activeTab !== 'resumen'}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 active:scale-95 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Balanza (CSV)
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Imprimir Estado
          </button>
        </div>
      </div>

      {/* ─── Selector de Periodo ───────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 flex-wrap">
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600">Periodo de Consulta:</span>
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
        >
          {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
            .map((m, i) => (
              <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
            ))}
        </select>
        <select
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
      </div>

      {/* ─── Pestañas principales ──────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.subTabs?.length) setActiveSubTab(tab.subTabs[0].id);
              }}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Sub-pestañas (si aplica) ─────────────────────────────────── */}
      {currentGroup?.subTabs && (
        <div className="flex gap-1 overflow-x-auto">
          {currentGroup.subTabs.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSubTab(sub.id)}
              className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                activeSubTab === sub.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-800'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Contenido principal ─────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <>
          {loading ? (
            <SkeletonResumen />
          ) : (
            <div className="space-y-6">
              {/* Bloque 1: Resumen de Flujo Comercial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ventas Registradas</span>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><ShoppingCart className="w-4 h-4" /></div>
                  </div>
                  <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
                    ${fmt(data?.totalVendido || 0)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{data?.ventasCount || 0} operaciones comerciales</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cobranza Recaudada</span>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CreditCard className="w-4 h-4" /></div>
                  </div>
                  <p className="text-2xl font-bold font-mono text-emerald-700 mt-2">
                    ${fmt(data?.cobranzaMes || 0)}
                  </p>
                  <p className="text-xs text-emerald-700 font-medium mt-1">Abonos recibidos de clientes</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Compras Recibidas</span>
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Truck className="w-4 h-4" /></div>
                  </div>
                  <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
                    ${fmt(data?.totalComprado || 0)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{data?.comprasCount || 0} órdenes de proveedores</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pagos a Proveedores</span>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Receipt className="w-4 h-4" /></div>
                  </div>
                  <p className="text-2xl font-bold font-mono text-amber-700 mt-2">
                    ${fmt(data?.pagosProveedoresMes || 0)}
                  </p>
                  <p className="text-xs text-amber-700 font-medium mt-1">Egresos liquidados en bancos</p>
                </div>
              </div>

              {/* Bloque 2: Cartera y Valuación */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Antigüedad de Saldos CxC */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Cartera de Clientes & Antigüedad de Saldos</h3>
                      <p className="text-xs text-slate-500">Total por Cobrar: ${fmt(data?.totalPorCobrar || 0)}</p>
                    </div>
                    {data?.totalVencido > 0 && (
                      <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> ${(data?.totalVencido || 0).toLocaleString()} en Mora
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: 'Al Corriente (Vigente)', desc: 'Plazo de crédito no vencido', value: data?.antiguedad?.vigente || 0, color: 'text-emerald-700' },
                      { label: '1 a 30 Días de Mora', desc: 'Vencimiento reciente', value: data?.antiguedad?.dias1a30 || 0, color: 'text-amber-700' },
                      { label: '31 a 60 Días de Mora', desc: 'Gestión de cobranza requerida', value: data?.antiguedad?.dias31a60 || 0, color: 'text-slate-600' },
                      { label: '+90 Días (Cartera Crítica)', desc: 'Bloqueo de crédito automático sugerido', value: data?.antiguedad?.mas90 || 0, color: 'text-rose-700', labelColor: 'text-rose-700', descColor: 'text-rose-500' },
                    ].map((bucket) => (
                      <div key={bucket.label} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className={`font-bold ${bucket.labelColor || 'text-slate-900'}`}>{bucket.label}</p>
                          <p className={`text-xs ${bucket.descColor || 'text-slate-500'}`}>{bucket.desc}</p>
                        </div>
                        <strong className={`font-mono text-sm font-bold ${bucket.color}`}>
                          ${fmt(bucket.value)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Valuación de Existencias */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 p-6 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">Valuación de Existencias por Almacén</h3>
                        <p className="text-xs text-slate-500">Total en Activos: ${fmt(data?.valuacionTotal || 0)}</p>
                      </div>
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <Boxes className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {data?.valuacionPorAlmacen && Object.entries(data.valuacionPorAlmacen).map(([almNombre, val]: any) => (
                        <div key={almNombre} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="font-bold text-slate-900">{almNombre}</p>
                            <p className="text-xs text-slate-500">{val.piezas} unidades en existencia</p>
                          </div>
                          <strong className="text-slate-900 font-mono text-sm font-bold">
                            ${val.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Valuación Regulada según CFF Art. 28 y NIF C-4</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      El costo de las existencias y de las salidas por venta es computado mediante el método de{' '}
                      <strong>Costo Promedio Ponderado</strong>, garantizando estricta consistencia fiscal y contable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Paneles de reportes avanzados ───────────────────────────── */}
      {activeTab !== 'resumen' && ActiveComponent && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 p-6">
          <div className="mb-5 pb-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">{currentSubTab?.label}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Período: {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][parseInt(mes) - 1]} {anio}
            </p>
          </div>
          <ActiveComponent mes={mes} anio={anio} />
        </div>
      )}
    </div>
  );
}
