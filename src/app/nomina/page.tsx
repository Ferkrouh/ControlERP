'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { 
  Users, 
  Plus, 
  Calendar, 
  Download, 
  RefreshCw, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building,
  UserPlus,
  Stamp
} from 'lucide-react';

export default function NominaPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'periodos' | 'empleados' | 'incidencias'>('periodos');
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [incidencias, setIncidencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodo, setSelectedPeriodo] = useState<any | null>(null);

  // Modales
  const [modalPeriodoOpen, setModalPeriodoOpen] = useState(false);
  const [modalEmpleadoOpen, setModalEmpleadoOpen] = useState(false);
  const [modalIncidenciaOpen, setModalIncidenciaOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form Periodo
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [fechaPago, setFechaPago] = useState('');

  // Form Empleado
  const [empData, setEmpData] = useState({
    numeroEmpleado: '',
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    rfc: '',
    curp: '',
    nss: '',
    puesto: '',
    departamento: 'ADMINISTRACION',
    salarioDiario: '',
    bancoNombre: 'BBVA',
    cuentaClabe: '',
  });

  // Form Incidencia
  const [incData, setIncData] = useState({
    empleadoId: '',
    fecha: '',
    tipo: 'FALTA',
    horas: 0,
    justificada: false,
    observaciones: '',
  });

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [resPer, resEmp, resInc] = await Promise.all([
        fetch('/api/nomina/periodos'),
        fetch('/api/nomina/empleados'),
        fetch('/api/nomina/incidencias'),
      ]);

      if (resPer.ok) {
        const perData = await resPer.json();
        setPeriodos(perData);
        if (perData.length > 0 && !selectedPeriodo) {
          setSelectedPeriodo(perData[0]);
        }
      }
      if (resEmp.ok) setEmpleados(await resEmp.json());
      if (resInc.ok) setIncidencias(await resInc.json());
    } catch (err) {
      console.error('Error cargando nómina:', err);
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const totalEmpleadosActivos = empleados.filter((e) => e.estado === 'ACTIVO').length;
  const nominaPeriodoActual = selectedPeriodo?.totalNeto || 0;
  const retencionesFiscales = selectedPeriodo?.totalDeducciones || 0;
  const cargasPatronales = selectedPeriodo?.totalCargasPatronales || 0;

  // Acciones de Periodo
  const handleCalcularPrenomina = async (periodoId: string) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/nomina/periodos/${periodoId}/calcular`, { method: 'POST' });
      if (res.ok) {
        await cargarTodo();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al calcular prenómina');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const handleTimbrarNomina = async (periodoId: string) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/nomina/periodos/${periodoId}/timbrar`, { method: 'POST' });
      if (res.ok) {
        await cargarTodo();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al timbrar nómina');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const handleContabilizarNomina = async (periodoId: string) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/nomina/periodos/${periodoId}/poliza`, { method: 'POST' });
      if (res.ok) {
        const pol = await res.json();
        alert(`Póliza ${pol.folio} generada exitosamente en Contabilidad.`);
        await cargarTodo();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al generar póliza');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  // Submit nuevo periodo
  const handleCrearPeriodo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/nomina/periodos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaInicio, fechaFin, fechaPago }),
      });
      if (res.ok) {
        setModalPeriodoOpen(false);
        cargarTodo();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit nuevo empleado
  const handleCrearEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/nomina/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empData),
      });
      if (res.ok) {
        setModalEmpleadoOpen(false);
        cargarTodo();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar colaborador');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit incidencia
  const handleCrearIncidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/nomina/incidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incData),
      });
      if (res.ok) {
        setModalIncidenciaOpen(false);
        cargarTodo();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Encabezado Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl shadow-slate-950/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Users className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">Recursos Humanos & Nómina CFDI 1.2</h1>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Cálculo fiscal de ISR Art. 96, cuotas IMSS, timbrado digital SAT y dispersión bancaria
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {user?.rol !== 'AUDITOR' && (
              <>
                <button
                  onClick={() => setModalIncidenciaOpen(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  Registrar Incidencia
                </button>
                <button
                  onClick={() => setModalEmpleadoOpen(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  Alta Empleado
                </button>
                <button
                  onClick={() => setModalPeriodoOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Periodo
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4 KPIs de Nómina */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-950/20">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Colaboradores Activos</span>
            <p className="text-2xl font-bold font-mono text-white mt-2">{totalEmpleadosActivos} Empleados</p>
            <span className="text-xs text-slate-500 mt-1 block">Plantilla con alta patronal</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-950/20">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Neto Nómina Periodo</span>
            <p className="text-2xl font-bold font-mono text-emerald-400 mt-2">
              ${nominaPeriodoActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">{selectedPeriodo?.folio || 'Sin periodo'}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-950/20">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Retenciones Fiscales</span>
            <p className="text-2xl font-bold font-mono text-amber-400 mt-2">
              ${retencionesFiscales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">ISR retenido + IMSS obrero</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-950/20">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Carga Social Patronal</span>
            <p className="text-2xl font-bold font-mono text-purple-400 mt-2">
              ${cargasPatronales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">IMSS Empresa + Infonavit + ISN</span>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-slate-800 gap-6">
          <button
            onClick={() => setTab('periodos')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              tab === 'periodos' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Periodos & Prenómina ({periodos.length})
          </button>
          <button
            onClick={() => setTab('empleados')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              tab === 'empleados' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Directorio de Colaboradores ({empleados.length})
          </button>
          <button
            onClick={() => setTab('incidencias')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              tab === 'incidencias' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Incidencias y Asistencias ({incidencias.length})
          </button>
        </div>

        {/* TAB 1: PERIODOS & PRENÓMINA */}
        {tab === 'periodos' && (
          <div className="space-y-6">
            {/* Selector de Periodo */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {periodos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriodo(p)}
                  className={`px-4 py-3 rounded-2xl border text-left min-w-[220px] transition-all ${
                    selectedPeriodo?.id === p.id
                      ? 'bg-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-900/20'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-sm">{p.folio}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.estado === 'TIMBRADA'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : p.estado === 'AUTORIZADA'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {p.estado}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(p.fechaInicio).toLocaleDateString('es-MX')} al {new Date(p.fechaFin).toLocaleDateString('es-MX')}
                  </p>
                  <p className="text-sm font-mono font-bold text-white mt-2">
                    ${(p.totalNeto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </button>
              ))}
            </div>

            {/* Detalle y Operaciones del Periodo Seleccionado */}
            {selectedPeriodo ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                      Prenómina {selectedPeriodo.folio}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Fecha de dispersión programada: {new Date(selectedPeriodo.fechaPago).toLocaleDateString('es-MX')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {user?.rol !== 'AUDITOR' && (
                      <>
                        <button
                          onClick={() => handleCalcularPrenomina(selectedPeriodo.id)}
                          disabled={processing}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
                          Calcular Prenómina
                        </button>
                        <button
                          onClick={() => handleTimbrarNomina(selectedPeriodo.id)}
                          disabled={processing || selectedPeriodo.estado === 'TIMBRADA'}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                        >
                          <Stamp className="w-3.5 h-3.5" />
                          Timbrar CFDI 1.2
                        </button>
                        <button
                          onClick={() => handleContabilizarNomina(selectedPeriodo.id)}
                          disabled={processing || !!selectedPeriodo.polizaContableId}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {selectedPeriodo.polizaContableId ? 'Póliza Generada' : 'Generar Póliza'}
                        </button>
                      </>
                    )}
                    <a
                      href={`/api/nomina/periodos/${selectedPeriodo.id}/dispersion`}
                      download
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      Dispersión Bancaria
                    </a>
                  </div>
                </div>

                {/* Tabla de Recibos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Empleado</th>
                        <th className="py-3 px-4">Puesto / Depto</th>
                        <th className="py-3 px-4 text-right">Días</th>
                        <th className="py-3 px-4 text-right">Percepciones</th>
                        <th className="py-3 px-4 text-right">Ret. ISR</th>
                        <th className="py-3 px-4 text-right">IMSS Obrero</th>
                        <th className="py-3 px-4 text-right">Neto a Pagar</th>
                        <th className="py-3 px-4 text-center">Timbre SAT</th>
                        <th className="py-3 px-4 text-center">Recibo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedPeriodo.recibos?.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-slate-500">
                            No hay recibos calculados para este periodo. Haz clic en "Calcular Prenómina".
                          </td>
                        </tr>
                      ) : (
                        selectedPeriodo.recibos?.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-4">
                              <span className="font-bold text-white block">
                                {r.empleado?.nombre} {r.empleado?.apellidoPaterno}
                              </span>
                              <span className="text-xs text-slate-500 font-mono">
                                [{r.empleado?.numeroEmpleado}] {r.empleado?.rfc}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-300">
                              {r.empleado?.puesto}
                              <span className="block text-slate-500">{r.empleado?.departamento}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono">{r.diasTrabajados}</td>
                            <td className="py-3 px-4 font-mono text-right text-emerald-400 font-semibold">
                              ${r.totalPercepciones.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 font-mono text-right text-rose-400">
                              ${r.retencionISR.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 font-mono text-right text-amber-400">
                              ${r.imssObrero.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 font-mono text-right font-bold text-white">
                              ${r.netoAPagar.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {r.uuidSAT ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Timbrado
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                  Pendiente
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <a
                                href={`/api/nomina/recibos/${r.id}/pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs font-semibold border border-slate-700 transition-all inline-flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> PDF
                              </a>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                Selecciona o crea un periodo de nómina para comenzar.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DIRECTORIO DE COLABORADORES */}
        {tab === 'empleados' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white">Plantilla Laboral Activa</h2>
                <p className="text-xs text-slate-400">Expediente fiscal y bancario para dispersión</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">No.</th>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">RFC / CURP / NSS</th>
                    <th className="py-3 px-4">Puesto / Depto</th>
                    <th className="py-3 px-4 text-right">Salario Diario</th>
                    <th className="py-3 px-4 text-right">SDI (IMSS)</th>
                    <th className="py-3 px-4">Banco / CLABE</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {empleados.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">{emp.numeroEmpleado}</td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {emp.nombre} {emp.apellidoPaterno} {emp.apellidoMaterno || ''}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">
                        {emp.rfc}
                        <span className="block text-slate-500">{emp.curp}</span>
                        <span className="block text-purple-400">{emp.nss || 'Sin NSS'}</span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="text-white font-medium">{emp.puesto}</span>
                        <span className="block text-slate-500">{emp.departamento}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-emerald-400 font-bold">
                        ${emp.salarioDiario.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-purple-400 font-bold">
                        ${emp.salarioDiarioIntegrado.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-400">
                        {emp.bancoNombre}
                        <span className="block text-slate-500">{emp.cuentaClabe || 'Efectivo'}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {emp.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: INCIDENCIAS */}
        {tab === 'incidencias' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Registro de Asistencias e Incidencias</h2>
              <p className="text-xs text-slate-400">Impactan directamente en el cálculo automático de prenómina</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Tipo Incidencia</th>
                    <th className="py-3 px-4 text-center">Horas</th>
                    <th className="py-3 px-4 text-center">Justificada</th>
                    <th className="py-3 px-4">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {incidencias.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No hay incidencias registradas.
                      </td>
                    </tr>
                  ) : (
                    incidencias.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-xs font-mono text-slate-400">
                          {new Date(inc.fecha).toLocaleDateString('es-MX')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {inc.empleado?.nombre} {inc.empleado?.apellidoPaterno}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              inc.tipo === 'FALTA'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : inc.tipo === 'HORA_EXTRA'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {inc.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono">{inc.horas || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          {inc.justificada ? (
                            <span className="text-emerald-400 text-xs">Sí</span>
                          ) : (
                            <span className="text-rose-400 text-xs">No</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">{inc.observaciones || '---'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL NUEVO PERIODO */}
        {modalPeriodoOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">Apertura de Periodo de Nómina</h3>
                <button onClick={() => setModalPeriodoOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCrearPeriodo} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha Inicio Periodo</label>
                  <input
                    type="date"
                    required
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha Fin Periodo</label>
                  <input
                    type="date"
                    required
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha de Pago Programada</label>
                  <input
                    type="date"
                    required
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalPeriodoOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
                  >
                    Abrir Periodo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NUEVO EMPLEADO */}
        {modalEmpleadoOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">Alta de Colaborador (Expediente Digital)</h3>
                <button onClick={() => setModalEmpleadoOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCrearEmpleado} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">No. Empleado</label>
                    <input
                      type="text"
                      required
                      placeholder="EMP-001"
                      value={empData.numeroEmpleado}
                      onChange={(e) => setEmpData({ ...empData, numeroEmpleado: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre(s)</label>
                    <input
                      type="text"
                      required
                      value={empData.nombre}
                      onChange={(e) => setEmpData({ ...empData, nombre: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Apellido Paterno</label>
                    <input
                      type="text"
                      required
                      value={empData.apellidoPaterno}
                      onChange={(e) => setEmpData({ ...empData, apellidoPaterno: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">RFC Fiscal</label>
                    <input
                      type="text"
                      required
                      placeholder="XAXX010101000"
                      value={empData.rfc}
                      onChange={(e) => setEmpData({ ...empData, rfc: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">CURP</label>
                    <input
                      type="text"
                      required
                      value={empData.curp}
                      onChange={(e) => setEmpData({ ...empData, curp: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">NSS (Seguro Social)</label>
                    <input
                      type="text"
                      value={empData.nss}
                      onChange={(e) => setEmpData({ ...empData, nss: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Puesto</label>
                    <input
                      type="text"
                      required
                      value={empData.puesto}
                      onChange={(e) => setEmpData({ ...empData, puesto: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Departamento</label>
                    <select
                      value={empData.departamento}
                      onChange={(e) => setEmpData({ ...empData, departamento: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      <option value="ADMINISTRACION">ADMINISTRACION</option>
                      <option value="VENTAS">VENTAS</option>
                      <option value="ALMACEN">ALMACEN</option>
                      <option value="PRODUCCION">PRODUCCION</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Salario Diario ($ MXN)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="350.00"
                      value={empData.salarioDiario}
                      onChange={(e) => setEmpData({ ...empData, salarioDiario: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Banco Dispersor</label>
                    <input
                      type="text"
                      value={empData.bancoNombre}
                      onChange={(e) => setEmpData({ ...empData, bancoNombre: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">CLABE Interbancaria (18 dígitos)</label>
                    <input
                      type="text"
                      maxLength={18}
                      value={empData.cuentaClabe}
                      onChange={(e) => setEmpData({ ...empData, cuentaClabe: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalEmpleadoOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
                  >
                    Guardar Colaborador
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NUEVA INCIDENCIA */}
        {modalIncidenciaOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">Registrar Incidencia de Nómina</h3>
                <button onClick={() => setModalIncidenciaOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCrearIncidencia} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Colaborador</label>
                  <select
                    required
                    value={incData.empleadoId}
                    onChange={(e) => setIncData({ ...incData, empleadoId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="">Selecciona colaborador...</option>
                    {empleados.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        [{emp.numeroEmpleado}] {emp.nombre} {emp.apellidoPaterno}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha</label>
                    <input
                      type="date"
                      required
                      value={incData.fecha}
                      onChange={(e) => setIncData({ ...incData, fecha: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo</label>
                    <select
                      value={incData.tipo}
                      onChange={(e) => setIncData({ ...incData, tipo: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      <option value="FALTA">FALTA</option>
                      <option value="HORA_EXTRA">HORA EXTRA</option>
                      <option value="RETARDO">RETARDO</option>
                      <option value="VACACIONES">VACACIONES</option>
                      <option value="INCAPACIDAD">INCAPACIDAD</option>
                    </select>
                  </div>
                </div>

                {incData.tipo === 'HORA_EXTRA' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Cantidad de Horas</label>
                    <input
                      type="number"
                      step="0.5"
                      value={incData.horas}
                      onChange={(e) => setIncData({ ...incData, horas: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Observaciones</label>
                  <input
                    type="text"
                    value={incData.observaciones}
                    onChange={(e) => setIncData({ ...incData, observaciones: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalIncidenciaOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
                  >
                    Registrar Incidencia
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
