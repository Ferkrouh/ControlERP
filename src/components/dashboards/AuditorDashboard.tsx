'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Eye, 
  ShieldCheck, 
  FileText, 
  History, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Scale
} from 'lucide-react';
import Link from 'next/link';

export default function AuditorDashboard() {
  const { user } = useAuth();
  const tenant = user?.tenant;

  return (
    <div className="space-y-6">
      {/* Header Auditor con Banner de Solo Lectura */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-amber-500/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Modo Auditoría Fiscal & Control Interno (Solo Lectura)
            </span>
            <span className="bg-white/10 text-white text-xs px-2.5 py-0.5 rounded-full font-mono">
              RFC: {tenant?.identificacionFiscal}
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2">Balanza de Comprobación y Trazabilidad</h2>
          <p className="text-slate-300 text-sm mt-1">
            Supervisión de operaciones de {tenant?.nombreComercial}, kárdex bajo método de Costo Promedio y bitácora de folios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reportes"
            className="bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-blue-600" /> Exportar Dictamen Mensual
          </Link>
          <Link
            href="/auditoria"
            className="bg-slate-700 hover:bg-slate-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <History className="w-4 h-4" /> Bitácora del Sistema
          </Link>
        </div>
      </div>

      {/* Tarjetas de Balanza Auditoría */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Cartera de Clientes Total</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">$107,500.00</p>
          <p className="text-xs text-slate-500 mt-1">Saldos por cobrar auditados</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Pasivos con Proveedores</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">$65,250.00</p>
          <p className="text-xs text-slate-500 mt-1">Obligaciones por liquidar</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Cartera Vencida (Mora)</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">$50,000.00</p>
          <p className="text-xs text-rose-600 font-semibold mt-1">46.5% de la cartera en mora</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Valuación Art. 28 CFF</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">$211,850.00</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Valuado a Costo Promedio</p>
        </div>
      </div>

      {/* Dictamen de Antigüedad de Saldos y Kárdex */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center justify-between">
            <span>Segmentación de Antigüedad de Saldos</span>
            <span className="text-xs font-normal text-slate-500">Corte mensual</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Al Corriente (Vigente): $57,500.00</span>
                <span className="font-bold text-emerald-600">53.5%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: '53.5%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">1 a 30 Días de Mora: $50,000.00</span>
                <span className="font-bold text-amber-600">46.5%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: '46.5%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-500">31 a 60 Días de Mora: $0.00</span>
                <span className="text-slate-400">0%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300" style={{ width: '0%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-500">+90 Días (Incobrables): $0.00</span>
                <span className="text-slate-400">0%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Trazabilidad de Auditoría Reciente */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Trazabilidad de Movimientos</h3>
            <Link href="/auditoria" className="text-xs text-blue-600 hover:underline">
              Ver Histórico Completo
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Traspaso Despachado: Folio TRASP-2026-001</p>
                <p className="text-slate-500 mt-0.5">5 unidades Compresor 50L transferidas de Central a GDL.</p>
                <span className="text-xs text-slate-400 mt-1 block">Usuario: Almacenista Central</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Bloqueo Automático de Crédito Activado</p>
                <p className="text-slate-500 mt-0.5">Cliente Comercializadora San Pedro alcanzó el 100% de su límite.</p>
                <span className="text-xs text-slate-400 mt-1 block">Motor de Validación de Crédito</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
