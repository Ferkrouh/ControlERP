'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

type PlatformEvent = {
  id: string;
  tenantId: string | null;
  usuarioEmail: string | null;
  categoria: string;
  accion: string;
  resultado: string;
  detalles: string;
  correlationId: string | null;
  fecha: string;
};

export default function SuperadminBitacoraPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/superadmin/bitacora?limit=200', { cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 403 ? 'Acceso exclusivo de SUPERADMIN.' : 'No se pudo consultar la bitácora.');
      const data = await response.json();
      setEvents(data.events || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al consultar la bitácora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.rol === 'SUPERADMIN') void loadEvents();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user?.rol, loadEvents]);

  if (authLoading || loading) {
    return <div className="p-8 text-sm text-slate-500">Cargando bitácora operacional…</div>;
  }

  if (user?.rol !== 'SUPERADMIN') {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-800">Esta bitácora es exclusiva de SUPERADMIN.</div>;
  }

  const errors = events.filter((event) => event.resultado === 'ERROR').length;
  const denied = events.filter((event) => event.resultado === 'DENEGADO').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-700"><ShieldAlert className="h-4 w-4" /> Control de plataforma</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bitácora de Plataforma</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Eventos operativos y de acceso para investigar fallas y actividad administrativa.</p>
        </div>
        <button onClick={() => void loadEvents()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric icon={<Activity className="h-4 w-4" />} label="Eventos cargados" value={events.length} />
        <Metric icon={<AlertTriangle className="h-4 w-4" />} label="Errores" value={errors} tone="rose" />
        <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Accesos denegados" value={denied} tone="amber" />
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h2 className="font-semibold text-slate-900">Actividad reciente</h2><p className="mt-0.5 text-xs text-slate-500">Hasta 200 eventos más recientes</p></div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">Solo lectura</span>
        </div>
        {events.length === 0 && !error ? <p className="p-8 text-center text-sm text-slate-500">Todavía no hay eventos registrados.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Categoría / acción</th><th className="px-5 py-3">Usuario</th><th className="px-5 py-3">Resultado</th><th className="px-5 py-3">Detalle</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => <tr key={event.id} className="align-top hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">{new Date(event.fecha).toLocaleString('es-MX')}</td>
                  <td className="px-5 py-3"><div className="font-semibold text-slate-800">{event.accion}</div><div className="mt-0.5 text-xs text-slate-500">{event.categoria}</div></td>
                  <td className="px-5 py-3 text-xs text-slate-600">{event.usuarioEmail || 'Sistema'}{event.tenantId && <div className="mt-1 font-mono text-[10px] text-slate-400">tenant {event.tenantId.slice(0, 8)}</div>}</td>
                  <td className="px-5 py-3"><ResultBadge value={event.resultado} /></td>
                  <td className="max-w-lg px-5 py-3 text-xs leading-5 text-slate-600">{event.detalles}{event.correlationId && <div className="mt-1 font-mono text-[10px] text-slate-400">ref {event.correlationId}</div>}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs text-slate-400">No registres secretos, contraseñas, tokens ni datos financieros completos en los detalles del evento.</p>
    </div>
  );
}

function Metric({ icon, label, value, tone = 'violet' }: { icon: ReactNode; label: string; value: number; tone?: 'violet' | 'rose' | 'amber' }) {
  const colors = { violet: 'bg-violet-50 text-violet-700', rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-700' };
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><span className={`rounded-lg p-2 ${colors[tone]}`}>{icon}</span>{label}</div><div className="mt-3 font-mono text-2xl font-bold text-slate-900">{value}</div></div>;
}

function ResultBadge({ value }: { value: string }) {
  const styles: Record<string, string> = { OK: 'bg-emerald-50 text-emerald-700', ERROR: 'bg-rose-50 text-rose-700', DENEGADO: 'bg-amber-50 text-amber-800' };
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${styles[value] || 'bg-slate-100 text-slate-600'}`}>{value}</span>;
}
