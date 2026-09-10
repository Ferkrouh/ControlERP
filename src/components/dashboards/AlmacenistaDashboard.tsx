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
      {/* Header Logístico de Almacén */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-950 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              📦 Operador de Almacén & Logística Física
            </span>
            <span className="bg-white/10 text-white text-xs px-2.5 py-0.5 rounded-full">
              {tenant?.nombreComercial}
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2">Control de Stock, Despachos y Traspasos</h2>
          <p className="text-amber-100 text-sm mt-1">
            Recepción física de mercancía, conteos, preparación de traspasos y cotejo de entradas/salidas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/traspasos"
            className="bg-white text-amber-950 hover:bg-amber-50 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <ClipboardCheck className="w-4 h-4" /> Recepción de Traspaso
          </Link>
          <Link
            href="/inventarios"
            className="bg-amber-700 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Barcode className="w-4 h-4" /> Buscar SKU / Código
          </Link>
        </div>
      </div>

      {/* Indicadores Físicos de Inventario (Sin Datos Financieros) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Bajo Stock Mínimo</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">1 producto</p>
          <p className="text-xs text-slate-500 mt-1">Requiere reabastecimiento</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Traspasos Por Recibir</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">1 envío</p>
          <p className="text-xs text-slate-500 mt-1">Folio TRASP-2026-001</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Artículos Activos</span>
            <div className="p-2 bg-slate-50 text-slate-700 rounded-lg">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">3 SKUs</p>
          <p className="text-xs text-slate-500 mt-1">Con código de barras registrado</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Piezas Físicas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">341 pzas</p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">Existencia consolidada</p>
        </div>
      </div>

      {/* Tareas Urgentes de Almacén */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerta de Desabasto Físico */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Alerta de Stock Crítico
            </h3>
            <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">
              Desabasto
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">Compresor de Aire 50 Litros 2.5 HP</p>
                <p className="text-xs font-mono text-slate-500">SKU: HER-002 | Código: 7501234567891</p>
              </div>
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded font-semibold">
                Sucursal GDL
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
              <div>
                <span className="text-slate-500">Existencia actual:</span>
                <p className="font-bold text-rose-600 text-sm">4 piezas</p>
              </div>
              <div>
                <span className="text-slate-500">Mínimo requerido:</span>
                <p className="font-bold text-slate-800 text-sm">5 piezas</p>
              </div>
            </div>

            <p className="text-[11px] text-blue-600 font-medium">
              ℹ️ Ya hay un traspaso de 5 piezas en tránsito desde CEDIS Monterrey para cubrir este faltante.
            </p>
          </div>
        </div>

        {/* Cotejo de Traspaso Entrante */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Recepción Física Pendiente de Cotejo
            </h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
              TRASP-2026-001
            </span>
          </div>

          <div className="p-4 border border-blue-100 bg-blue-50/40 rounded-xl space-y-2">
            <p className="text-xs text-slate-600">
              Despachado desde: <strong>CEDIS Central Monterrey</strong> con destino a <strong>Sucursal Guadalajara</strong>.
            </p>
            <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
              <span>Compresor de Aire 50 Litros</span>
              <span className="font-bold text-slate-900">Enviadas: 5 pzas</span>
            </div>
            <div className="pt-2">
              <Link
                href="/traspasos"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-lg block text-center transition-colors shadow-sm"
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
