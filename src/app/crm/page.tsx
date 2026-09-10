'use client';

import React, { useEffect, useState } from 'react';
import {
  Kanban,
  Plus,
  DollarSign,
  TrendingUp,
  UserCheck,
  Phone,
  Mail,
  Calendar,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter
} from 'lucide-react';

interface Oportunidad {
  id: string;
  nombre: string;
  contactoNombre: string;
  contactoEmail?: string;
  contactoTelefono?: string;
  etapa: string;
  valorEstimado: number;
  probabilidadPct: number;
  fechaCierrePrev?: string;
  origen?: string;
  usuarioAsignado?: string;
  notas?: string;
}

const ETAPAS = [
  { key: 'PROSPECCION', label: '1. Prospección', color: 'border-slate-300 bg-slate-50/50' },
  { key: 'CALIFICACION', label: '2. Calificación', color: 'border-blue-300 bg-blue-50/30' },
  { key: 'PROPUESTA', label: '3. Propuesta / Cotización', color: 'border-indigo-300 bg-indigo-50/30' },
  { key: 'NEGOCIACION', label: '4. Negociación', color: 'border-amber-300 bg-amber-50/30' },
  { key: 'GANADA', label: '5. Ganada (Cerrada)', color: 'border-emerald-300 bg-emerald-50/30' },
  { key: 'PERDIDA', label: '6. Perdida', color: 'border-rose-300 bg-rose-50/30' },
];

export default function CrmPage() {
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Formulario nueva oportunidad
  const [nombre, setNombre] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoEmail, setContactoEmail] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [valorEstimado, setValorEstimado] = useState('15000');
  const [probabilidadPct, setProbabilidadPct] = useState('20');
  const [etapa, setEtapa] = useState('PROSPECCION');
  const [origen, setOrigen] = useState('DIRECTO');
  const [notas, setNotas] = useState('');

  const cargarOportunidades = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm');
      const data = await res.json();
      setOportunidades(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarOportunidades();
  }, []);

  const handleCrearOportunidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !contactoNombre) {
      alert('Título y nombre del contacto son obligatorios');
      return;
    }

    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          contactoNombre,
          contactoEmail,
          contactoTelefono,
          valorEstimado: Number(valorEstimado),
          probabilidadPct: Number(probabilidadPct),
          etapa,
          origen,
          notas,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al crear trato');
        return;
      }

      setShowModal(false);
      setNombre('');
      setContactoNombre('');
      setContactoEmail('');
      setContactoTelefono('');
      setNotas('');
      cargarOportunidades();
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleMoverEtapa = async (id: string, nuevaEtapa: string) => {
    try {
      const res = await fetch('/api/crm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, etapa: nuevaEtapa }),
      });

      if (res.ok) {
        cargarOportunidades();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // KPIs
  const pipelineTotal = oportunidades
    .filter((o) => o.etapa !== 'PERDIDA')
    .reduce((acc, curr) => acc + curr.valorEstimado, 0);

  const pipelinePonderado = oportunidades
    .filter((o) => o.etapa !== 'PERDIDA')
    .reduce((acc, curr) => acc + (curr.valorEstimado * curr.probabilidadPct) / 100, 0);

  const tratosGanados = oportunidades.filter((o) => o.etapa === 'GANADA').length;

  return (
    <div className="space-y-6">
      {/* Header Fintech Ledger */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Kanban className="w-7 h-7 text-indigo-600" />
            CRM & Pipeline Comercial
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión visual de leads, oportunidades de mayoreo y tasa de conversión de embudo.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva Oportunidad / Trato
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Valor Total Pipeline</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-mono font-bold text-slate-900 mt-2">
            ${pipelineTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400">Tratos activos no perdidos</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-indigo-200/60 bg-indigo-50/20 shadow-sm">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold uppercase tracking-wider">
            <span>Pronóstico Ponderado</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-mono font-bold text-indigo-900 mt-2">
            ${pipelinePonderado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-indigo-600">Calculado según % probabilidad</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200/60 bg-emerald-50/20 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase tracking-wider">
            <span>Tratos Ganados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-mono font-bold text-emerald-900 mt-2">{tratosGanados}</p>
          <span className="text-[11px] text-emerald-600">Cierres exitosos</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Oportunidades</span>
            <UserCheck className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-mono font-bold text-slate-900 mt-2">{oportunidades.length}</p>
          <span className="text-[11px] text-slate-400">En el embudo comercial</span>
        </div>
      </div>

      {/* Tablero Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 min-h-[600px] overflow-x-auto">
        {ETAPAS.map((et) => {
          const tratosEtapa = oportunidades.filter((o) => o.etapa === et.key);
          const totalEtapa = tratosEtapa.reduce((sum, item) => sum + item.valorEstimado, 0);

          return (
            <div
              key={et.key}
              className={`rounded-2xl border flex flex-col p-3 ${et.color} min-w-[240px] md:min-w-0`}
            >
              {/* Header de Etapa */}
              <div className="border-b border-slate-200/60 pb-2 mb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-800 tracking-tight">{et.label}</h3>
                  <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-600">
                    {tratosEtapa.length}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 mt-1 font-semibold">
                  ${totalEtapa.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                </p>
              </div>

              {/* Lista de Tarjetas de Tratos */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[650px] pr-1">
                {tratosEtapa.map((op) => (
                  <div
                    key={op.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-2.5 group"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight">
                        {op.nombre}
                      </h4>
                      <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-1 shrink-0">
                        {op.probabilidadPct}%
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-500">
                      <div className="font-semibold text-slate-700">{op.contactoNombre}</div>
                      {op.contactoTelefono && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Phone className="w-3 h-3" />
                          <span>{op.contactoTelefono}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        ${op.valorEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>

                      {/* Selector Rápido de Movimiento de Etapa */}
                      <select
                        value={op.etapa}
                        onChange={(e) => handleMoverEtapa(op.id, e.target.value)}
                        className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-600 outline-none"
                      >
                        {ETAPAS.map((eOpt) => (
                          <option key={eOpt.key} value={eOpt.key}>
                            {eOpt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Crear Oportunidad */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Kanban className="w-5 h-5 text-indigo-600" />
                Registrar Nuevo Trato Comercial
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearOportunidad} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Oportunidad *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Suministro Anual 500 Tarimas a Distribuidora del Norte"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Contacto / Empresa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ing. Roberto Garza"
                    value={contactoNombre}
                    onChange={(e) => setContactoNombre(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="81 1234 5678"
                    value={contactoTelefono}
                    onChange={(e) => setContactoTelefono(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Valor Estimado ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={valorEstimado}
                    onChange={(e) => setValorEstimado(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Probabilidad (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={probabilidadPct}
                    onChange={(e) => setProbabilidadPct(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Etapa Inicial</label>
                  <select
                    value={etapa}
                    onChange={(e) => setEtapa(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {ETAPAS.map((eOpt) => (
                      <option key={eOpt.key} value={eOpt.key}>
                        {eOpt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas / Requerimientos del Cliente</label>
                <textarea
                  rows={3}
                  placeholder="Detalles sobre tiempos de entrega requeridos, condiciones de pago negociadas..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20"
                >
                  Crear Oportunidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
