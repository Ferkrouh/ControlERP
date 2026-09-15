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
      {/* Header Operativo */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              👤 Encargado de Sucursal & Operaciones
            </span>
            <span className="bg-white/10 text-white text-xs px-2.5 py-0.5 rounded-full">
              {tenant?.nombreComercial}
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2">Centro de Control Comercial & Operativo</h2>
          <p className="text-emerald-100 text-sm mt-1">
            Gestión diaria de ventas, cobranza de clientes, cuentas por pagar y solicitudes de traspaso.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/cxc"
            className="bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Registrar Cobranza
          </Link>
          <Link
            href="/traspasos"
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" /> Solicitar Traspaso
          </Link>
        </div>
      </div>

      {/* Tarjetas de Operación Diaria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Cobranza del Mes</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">$32,450.00</p>
          <p className="text-xs text-slate-500 mt-1">Recaudación acumulada</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Facturas por Vencer</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">2 facturas</p>
          <p className="text-xs text-slate-500 mt-1">Próximas 48 - 72 horas</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Clientes Retenidos</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">1 cliente</p>
          <p className="text-xs text-slate-500 mt-1">Límite saturado / Venta bloqueada</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Traspasos en Curso</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">1 orden</p>
          <p className="text-xs text-slate-500 mt-1">En tránsito a Sucursal GDL</p>
        </div>
      </div>

      {/* Alertas Urgentes de Cobranza y Validación de Crédito */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerta de Crédito Bloqueado */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Alerta de Límite de Crédito: Venta Bloqueada
            </h3>
          </div>
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-bold text-rose-900 text-sm">Comercializadora San Pedro S. de R.L.</p>
              <span className="text-xs bg-rose-200 text-rose-800 font-bold px-2 py-0.5 rounded">
                Factura Vencida 25 días
              </span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              El cliente tiene un límite de crédito de <strong>$50,000.00</strong> y un saldo adeudado de <strong>$50,000.00</strong>. 
              El motor de control de crédito ha bloqueado automáticamente nuevos pedidos a crédito según la política <strong>ESTRICTA</strong> del negocio.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/cxc"
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-500" />
              Traspaso de Almacén en Proceso
            </h3>
            <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
              TRASP-2026-001
            </span>
          </div>
          
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Origen: CEDIS Central MTY</span>
              <span>➡️</span>
              <span>Destino: Sucursal GDL</span>
            </div>
            <p className="text-xs text-slate-600">
              Artículo: <strong>Compresor de Aire 50 Litros (5 piezas)</strong>
            </p>
            <p className="text-xs text-slate-500">
              Estatus: <span className="text-blue-600 font-bold">DESPACHADO</span>. El almacenista de destino debe confirmar la recepción física.
            </p>
            <div className="pt-2">
              <Link
                href="/traspasos"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Monitorear Traspasos ➡️
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
