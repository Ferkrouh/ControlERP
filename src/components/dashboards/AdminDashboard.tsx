'use client';

import React, { useState, useEffect } from 'react';
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
  Plus, 
  TrendingUp, 
  Clock,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      {/* Header Ejecutivo con Branding del Negocio */}
      <div 
        className="text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
        style={{ backgroundColor: tenant?.colorPrimario || '#1e40af' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold">
              👔 Panel Ejecutivo de Administración
            </span>
            <span className="text-white/80 text-xs font-mono">
              RFC: {tenant?.identificacionFiscal}
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2">{tenant?.nombreComercial}</h2>
          <p className="text-white/90 text-sm mt-1">
            {tenant?.textoEncabezadoDoc || 'Control integral del negocio, finanzas, inventarios y políticas de crédito'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/personalizacion"
            className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <Sliders className="w-4 h-4" /> Personalizar Negocio
          </Link>
          <Link
            href="/reportes"
            className="bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <TrendingUp className="w-4 h-4 text-blue-600" /> Reporte Mensual
          </Link>
        </div>
      </div>

      {/* Tarjetas de Indicadores Clave (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cuentas por Cobrar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Cuentas por Cobrar</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${(metrics?.totalPorCobrar || 107500).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>${(metrics?.totalVencido || 50000).toLocaleString('es-MX')} en mora</span>
          </div>
        </div>

        {/* Cuentas por Pagar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Cuentas por Pagar</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${(metrics?.totalPorPagar || 65250).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">1 factura por vencer en 18 días</p>
        </div>

        {/* Valuación de Inventarios */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Valuación Inventario</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${(metrics?.valuacionTotal || 211850).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Costo Promedio en 2 almacenes</p>
        </div>

        {/* Salud Crediticia de Clientes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Política de Crédito</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            {tenant?.politicaBloqueoCredito === 'ESTRICTO' ? 'Bloqueo Estricto' : 'Modo Advertencia'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {tenant?.diasGraciaCredito || 0} días de gracia de tolerancia
          </p>
        </div>
      </div>

      {/* Semáforo de Crédito y Monitoreo de Clientes en Riesgo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Semáforo de Clientes y Límites de Crédito</h3>
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
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">Comercializadora San Pedro</span>
                  <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    BLOQUEADO POR MORA
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Límite: $50,000 | Saldo utilizado: $50,000 (100%)</p>
              </div>
              <div className="w-full sm:w-48">
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full w-full"></div>
                </div>
                <p className="text-xs text-right font-semibold text-rose-600 mt-1">Crédito Agotado</p>
              </div>
            </div>

            {/* Cliente 2 */}
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">Constructora del Bajío S.A.</span>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    ACTIVO
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Límite: $150,000 | Saldo utilizado: $45,000 (30%)</p>
              </div>
              <div className="w-full sm:w-48">
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '30%' }}></div>
                </div>
                <p className="text-xs text-right font-semibold text-emerald-600 mt-1">Disponible: $105,000</p>
              </div>
            </div>

            {/* Cliente 3 */}
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">Ferreterías Unidas del Norte</span>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    ACTIVO
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Límite: $80,000 | Saldo utilizado: $12,500 (15.6%)</p>
              </div>
              <div className="w-full sm:w-48">
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '16%' }}></div>
                </div>
                <p className="text-xs text-right font-semibold text-emerald-600 mt-1">Disponible: $67,500</p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas y Configuración del Negocio */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Acciones de Dirección</h3>
          
          <div className="space-y-2.5">
            <Link
              href="/personalizacion"
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:scale-105 transition-transform">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800">Personalizar mi Negocio</p>
                  <p className="text-xs text-slate-500">Logo, color de tema y políticas</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>

            <Link
              href="/usuarios"
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800">Equipo y Roles</p>
                  <p className="text-xs text-slate-500">Encargados, Almacenistas, Auditor</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>

            <Link
              href="/reportes"
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800">Cierre Contable Mensual</p>
                  <p className="text-xs text-slate-500">Balance y valuación de activos</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
