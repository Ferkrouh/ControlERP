'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ShieldAlert, Clock, PhoneCall, Mail, Building2, LogOut, RefreshCw } from 'lucide-react';

export default function SuscripcionVencidaPage() {
  const { user, logout } = useAuth();
  const tenant = user?.tenant;

  const fechaVenc = tenant?.fechaVencimientoPlan
    ? new Date(tenant.fechaVencimientoPlan).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Periodo Expirado';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-100">
      {/* Luces de fondo sobrias */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-center">
        {/* Ícono de Estado */}
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-lg shadow-rose-950">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div>
          <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            Suscripción SaaS Expirada
          </span>
          <h1 className="text-2xl font-bold text-white mt-3">
            Acceso Temporalmente Bloqueado
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            La vigencia de servicio para la empresa <strong className="text-slate-200">{tenant?.nombreComercial || 'su negocio'}</strong> concluyó el <span className="font-mono text-rose-400 font-semibold">{fechaVenc}</span>.
          </p>
        </div>

        {/* Tarjeta de Detalles */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span>Razón Social:</span>
            <span className="font-semibold text-slate-200">{tenant?.razonSocial || tenant?.nombreComercial}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>RFC Fiscal:</span>
            <span className="font-mono text-slate-300">{tenant?.identificacionFiscal || 'N/D'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Plan Asignado:</span>
            <span className="font-semibold text-purple-400 uppercase">{tenant?.planSuscripcion || 'PROFESIONAL'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Estado de los Datos:</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              ✓ Datos e inventarios respaldados
            </span>
          </div>
        </div>

        <div className="p-4 bg-purple-950/30 border border-purple-800/40 rounded-2xl text-xs text-purple-200 text-left space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-purple-300">
            <ShieldAlert className="w-4 h-4" /> ¿Cómo reactivar su servicio de inmediato?
          </p>
          <p className="text-slate-300 leading-relaxed">
            Póngase en contacto con su ejecutivo de cuenta o con el <strong>Superadmin de ControlERP</strong> para registrar la renovación de su suscripción o solicitar una extensión de cortesía.
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Verificar Pago / Reintentar
          </button>
          <button
            onClick={logout}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
