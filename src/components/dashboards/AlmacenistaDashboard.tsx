'use client';

import React from 'react';
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
  Truck
} from 'lucide-react';
import Link from 'next/link';

export default function AlmacenistaDashboard() {
  const { user } = useAuth();
  const tenant = user?.tenant;

  return (
    <div className="space-y-6">
      {/* Header Logístico de Almacén Soberano */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-400 border border-amber-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Operador de Almacén & Logística Física
            </span>
            <span className="bg-white/10 text-white/90 text-xs px-2.5 py-0.5 rounded-full">
              {tenant?.nombreComercial}
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2 tracking-tight">Control de Stock, Despachos y Traspasos</h2>
          <p className="text-slate-400 text-sm mt-1">
            Recepción física de mercancía, conteos, preparación de traspasos y cotejo de entradas/salidas.
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

      {/* Indicadores Físicos de Inventario (Card Float Principle) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bajo Stock Mínimo</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-600 mt-2">1 producto</p>
          <p className="text-xs text-slate-400 mt-1">Requiere reabastecimiento</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Traspasos Por Recibir</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-blue-700 mt-2">1 envío</p>
          <p className="text-xs text-slate-400 mt-1">Folio TRASP-2026-001</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Artículos Activos</span>
            <div className="p-2 bg-slate-50 text-slate-700 rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">3 SKUs</p>
          <p className="text-xs text-slate-400 mt-1">Con código de barras registrado</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Piezas Físicas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">341 pzas</p>
          <p className="text-xs text-emerald-700 mt-1 font-medium">Existencia consolidada</p>
        </div>
      </div>

      {/* Tareas Urgentes de Almacén */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerta de Desabasto Físico */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Alerta de Stock Crítico
            </h3>
            <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 font-semibold px-2.5 py-0.5 rounded-full">
              Desabasto
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">Compresor de Aire 50 Litros 2.5 HP</p>
                <p className="text-xs font-mono text-slate-500">SKU: HER-002 | Código: 7501234567891</p>
              </div>
              <span className="text-xs bg-white text-slate-700 border border-slate-200 px-2 py-1 rounded-lg font-semibold">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 p-5 space-y-4">
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
              <span>Compresor de Aire 50 Litros</span>
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
