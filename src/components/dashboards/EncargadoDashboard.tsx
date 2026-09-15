'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  DollarSign, 
  CreditCard, 
  AlertCircle, 
  ArrowLeftRight, 
  Plus, 
  Clock, 
  UserCheck, 
  ShieldAlert,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

export default function EncargadoDashboard() {
  const { user } = useAuth();
  const tenant = user?.tenant;

  return (
    <div className="space-y-6">
      {/* Header Operativo Soberano */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Encargado de Sucursal & Operaciones
            </span>
            <span className="bg-white/10 text-white/90 text-xs px-2.5 py-0.5 rounded-full">
              {tenant?.nombreComercial}
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2 tracking-tight">Centro de Control Comercial & Operativo</h2>
          <p className="text-slate-400 text-sm mt-1">
            Gestión diaria de ventas, cobranza de clientes, cuentas por pagar y solicitudes de traspaso.
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

      {/* Tarjetas de Operación Diaria (Card Float Principle) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cobranza del Mes</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-2">$32,450.00</p>
          <p className="text-xs text-slate-400 mt-1">Recaudación acumulada</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Facturas por Vencer</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-2">2 facturas</p>
          <p className="text-xs text-slate-400 mt-1">Próximas 48 - 72 horas</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Clientes Retenidos</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-600 mt-2">1 cliente</p>
          <p className="text-xs text-slate-400 mt-1">Límite saturado / Venta bloqueada</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Traspasos en Curso</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-blue-700 mt-2">1 orden</p>
          <p className="text-xs text-slate-400 mt-1">En tránsito a Sucursal GDL</p>
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
              <span className="text-xs font-semibold bg-rose-200 text-rose-800 px-2 py-0.5 rounded">
                Factura Vencida 25 días
              </span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              El cliente tiene un límite de crédito de <strong className="font-mono">$50,000.00</strong> y un saldo adeudado de <strong className="font-mono">$50,000.00</strong>. 
              El motor de control de crédito ha bloqueado automáticamente nuevos pedidos a crédito según la política <strong>ESTRICTA</strong> del negocio.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/cxc"
                className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm"
              >
                Registrar Pago de Abono
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
