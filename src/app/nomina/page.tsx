'use client';

import React, { useState, useEffect } from 'react';
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
  Stamp,
  X
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

  // Cierre accesible con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalPeriodoOpen(false);
        setModalEmpleadoOpen(false);
        setModalIncidenciaOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        await cargarTodo();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al contabilizar nómina');
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
        setFechaInicio('');
        setFechaFin('');
        setFechaPago('');
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <Users className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recursos Humanos & Nómina CFDI 1.2</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Cálculo fiscal de ISR Art. 96, cuotas IMSS, timbrado digital SAT y dispersión bancaria
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {user?.rol !== 'AUDITOR' && (
            <>
              <button
                type="button"
                onClick={() => setModalIncidenciaOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-300 shadow-sm flex items-center gap-2 transition-all"
              >
                <Clock className="w-4 h-4 text-amber-500" />
                Registrar Incidencia
              </button>
              <button
                type="button"
                onClick={() => setModalEmpleadoOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-300 shadow-sm flex items-center gap-2 transition-all"
              >
                <UserPlus className="w-4 h-4 text-emerald-600" />
                Alta Empleado
              </button>
              <button
                type="button"
                onClick={() => setModalPeriodoOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center gap-2 transition-all"
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
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaboradores Activos</span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{totalEmpleadosActivos} Empleados</p>
          <span className="text-xs text-slate-400 mt-1 block">Plantilla con alta patronal</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Neto Nómina Periodo</span>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-2">
            ${nominaPeriodoActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">{selectedPeriodo?.folio || 'Sin periodo'}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retenciones Fiscales</span>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-2">
            ${retencionesFiscales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">ISR retenido + IMSS obrero</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Carga Social Patronal</span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
            ${cargasPatronales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">IMSS Empresa + Infonavit + ISN</span>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setTab('periodos')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            tab === 'periodos' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Periodos & Prenómina ({periodos.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('empleados')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            tab === 'empleados' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Directorio de Colaboradores ({empleados.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('incidencias')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            tab === 'incidencias' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
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
                type="button"
                key={p.id}
                onClick={() => setSelectedPeriodo(p)}
                className={`px-4 py-3 rounded-2xl border text-left min-w-[220px] transition-all ${
                  selectedPeriodo?.id === p.id
                    ? 'bg-blue-50 border-blue-400 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm">{p.folio}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      p.estado === 'TIMBRADA'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : p.estado === 'AUTORIZADA'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {p.estado}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(p.fechaInicio).toLocaleDateString('es-MX')} al {new Date(p.fechaFin).toLocaleDateString('es-MX')}
                </p>
                <p className="text-sm font-mono font-bold text-slate-900 mt-2">
                  ${(p.totalNeto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </button>
            ))}
          </div>

          {/* Detalle y Operaciones del Periodo Seleccionado */}
          {selectedPeriodo ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-mono flex items-center gap-2">
                    Prenómina {selectedPeriodo.folio}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Fecha de dispersión programada: {new Date(selectedPeriodo.fechaPago).toLocaleDateString('es-MX')}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {user?.rol !== 'AUDITOR' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCalcularPrenomina(selectedPeriodo.id)}
                        disabled={processing}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
                        Calcular Prenómina
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTimbrarNomina(selectedPeriodo.id)}
                        disabled={processing || selectedPeriodo.estado === 'TIMBRADA'}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                      >
                        <Stamp className="w-3.5 h-3.5" />
                        Timbrar CFDI 1.2
                      </button>
                      <button
                        type="button"
                        onClick={() => handleContabilizarNomina(selectedPeriodo.id)}
                        disabled={processing || !!selectedPeriodo.polizaContableId}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {selectedPeriodo.polizaContableId ? 'Póliza Generada' : 'Generar Póliza'}
                      </button>
                    </>
                  )}
                  <a
                    href={`/api/nomina/periodos/${selectedPeriodo.id}/dispersion`}
                    download
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    Dispersión Bancaria
                  </a>
                </div>
              </div>

              {/* Tabla de Recibos */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
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
                  <tbody className="divide-y divide-slate-100">
                    {selectedPeriodo.recibos?.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-slate-400">
                          No hay recibos calculados para este periodo. Haz clic en "Calcular Prenómina".
                        </td>
                      </tr>
                    ) : (
                      selectedPeriodo.recibos?.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">
                              {r.empleado?.nombre} {r.empleado?.apellidoPaterno}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              [{r.empleado?.numeroEmpleado}] {r.empleado?.rfc}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {r.empleado?.puesto}
                            <span className="block text-slate-400">{r.empleado?.departamento}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono">{r.diasTrabajados}</td>
                          <td className="py-3 px-4 font-mono text-right text-emerald-700 font-semibold">
                            ${r.totalPercepciones.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono text-right text-rose-600">
                            ${r.retencionISR.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono text-right text-amber-700">
                            ${r.imssObrero.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono text-right font-bold text-slate-900">
                            ${r.netoAPagar.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {r.uuidSAT ? (
                              <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> Timbrado
                              </span>
                            ) : (
                              <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <a
                              href={`/api/nomina/recibos/${r.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-700 rounded-lg text-xs font-semibold border border-slate-300 shadow-sm transition-all inline-flex items-center gap-1"
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
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              Selecciona o crea un periodo de nómina para comenzar.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DIRECTORIO DE COLABORADORES */}
      {tab === 'empleados' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Plantilla Laboral Activa</h2>
              <p className="text-xs text-slate-500">Expediente fiscal y bancario para dispersión</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100">
                {empleados.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{emp.numeroEmpleado}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {emp.nombre} {emp.apellidoPaterno} {emp.apellidoMaterno || ''}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {emp.rfc}
                      <span className="block text-slate-400">{emp.curp}</span>
                      <span className="block text-indigo-600">{emp.nss || 'Sin NSS'}</span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="text-slate-900 font-medium">{emp.puesto}</span>
                      <span className="block text-slate-400">{emp.departamento}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-emerald-700 font-bold">
                      ${emp.salarioDiario.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-indigo-700 font-bold">
                      ${emp.salarioDiarioIntegrado.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {emp.bancoNombre}
                      <span className="block text-slate-400">{emp.cuentaClabe || 'Efectivo'}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Registro de Asistencias e Incidencias</h2>
            <p className="text-xs text-slate-500">Impactan directamente en el cálculo automático de prenómina</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Tipo Incidencia</th>
                  <th className="py-3 px-4 text-center">Horas</th>
                  <th className="py-3 px-4 text-center">Justificada</th>
                  <th className="py-3 px-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidencias.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No hay incidencias registradas.
                    </td>
                  </tr>
                ) : (
                  incidencias.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">
                        {new Date(inc.fecha).toLocaleDateString('es-MX')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {inc.empleado?.nombre} {inc.empleado?.apellidoPaterno}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            inc.tipo === 'FALTA'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : inc.tipo === 'HORA_EXTRA'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {inc.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{inc.horas || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {inc.justificada ? (
                          <span className="text-emerald-700 text-xs font-medium">Sí</span>
                        ) : (
                          <span className="text-rose-700 text-xs font-medium">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{inc.observaciones || '---'}</td>
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
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-periodo-title" 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 id="modal-periodo-title" className="text-lg font-bold text-slate-900">Apertura de Periodo de Nómina</h3>
              <button 
                type="button" 
                onClick={() => setModalPeriodoOpen(false)} 
                aria-label="Cerrar modal" 
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearPeriodo} className="space-y-4">
              <div>
                <label htmlFor="per-fecha-inicio" className="block text-xs font-semibold text-slate-700 mb-1">Fecha Inicio Periodo</label>
                <input
                  id="per-fecha-inicio"
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor="per-fecha-fin" className="block text-xs font-semibold text-slate-700 mb-1">Fecha Fin Periodo</label>
                <input
                  id="per-fecha-fin"
                  type="date"
                  required
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor="per-fecha-pago" className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Pago Programada</label>
                <input
                  id="per-fecha-pago"
                  type="date"
                  required
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalPeriodoOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm"
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
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-empleado-title" 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 id="modal-empleado-title" className="text-lg font-bold text-slate-900">Alta de Colaborador (Expediente Digital)</h3>
              <button 
                type="button" 
                onClick={() => setModalEmpleadoOpen(false)} 
                aria-label="Cerrar modal" 
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearEmpleado} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="emp-numero" className="block text-xs font-semibold text-slate-700 mb-1">No. Empleado</label>
                  <input
                    id="emp-numero"
                    type="text"
                    required
                    placeholder="EMP-001"
                    value={empData.numeroEmpleado}
                    onChange={(e) => setEmpData({ ...empData, numeroEmpleado: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="emp-nombre" className="block text-xs font-semibold text-slate-700 mb-1">Nombre(s)</label>
                  <input
                    id="emp-nombre"
                    type="text"
                    required
                    value={empData.nombre}
                    onChange={(e) => setEmpData({ ...empData, nombre: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="emp-paterno" className="block text-xs font-semibold text-slate-700 mb-1">Apellido Paterno</label>
                  <input
                    id="emp-paterno"
                    type="text"
                    required
                    value={empData.apellidoPaterno}
                    onChange={(e) => setEmpData({ ...empData, apellidoPaterno: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="emp-rfc" className="block text-xs font-semibold text-slate-700 mb-1">RFC Fiscal</label>
                  <input
                    id="emp-rfc"
                    type="text"
                    required
                    placeholder="XAXX010101000"
                    value={empData.rfc}
                    onChange={(e) => setEmpData({ ...empData, rfc: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="emp-curp" className="block text-xs font-semibold text-slate-700 mb-1">CURP</label>
                  <input
                    id="emp-curp"
                    type="text"
                    required
                    value={empData.curp}
                    onChange={(e) => setEmpData({ ...empData, curp: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="emp-nss" className="block text-xs font-semibold text-slate-700 mb-1">NSS (Seguro Social)</label>
                  <input
                    id="emp-nss"
                    type="text"
                    value={empData.nss}
                    onChange={(e) => setEmpData({ ...empData, nss: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="emp-puesto" className="block text-xs font-semibold text-slate-700 mb-1">Puesto</label>
                  <input
                    id="emp-puesto"
                    type="text"
                    required
                    value={empData.puesto}
                    onChange={(e) => setEmpData({ ...empData, puesto: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="emp-departamento" className="block text-xs font-semibold text-slate-700 mb-1">Departamento</label>
                  <select
                    id="emp-departamento"
                    value={empData.departamento}
                    onChange={(e) => setEmpData({ ...empData, departamento: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="ADMINISTRACION">ADMINISTRACION</option>
                    <option value="VENTAS">VENTAS</option>
                    <option value="ALMACEN">ALMACEN</option>
                    <option value="PRODUCCION">PRODUCCION</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="emp-salario" className="block text-xs font-semibold text-slate-700 mb-1">Salario Diario ($ MXN)</label>
                  <input
                    id="emp-salario"
                    type="number"
                    step="0.01"
                    required
                    placeholder="350.00"
                    value={empData.salarioDiario}
                    onChange={(e) => setEmpData({ ...empData, salarioDiario: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-emerald-700 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="emp-banco" className="block text-xs font-semibold text-slate-700 mb-1">Banco Dispersor</label>
                  <input
                    id="emp-banco"
                    type="text"
                    value={empData.bancoNombre}
                    onChange={(e) => setEmpData({ ...empData, bancoNombre: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="emp-clabe" className="block text-xs font-semibold text-slate-700 mb-1">CLABE Interbancaria (18 dígitos)</label>
                  <input
                    id="emp-clabe"
                    type="text"
                    maxLength={18}
                    value={empData.cuentaClabe}
                    onChange={(e) => setEmpData({ ...empData, cuentaClabe: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalEmpleadoOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm"
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
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-incidencia-title" 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 id="modal-incidencia-title" className="text-lg font-bold text-slate-900">Registrar Incidencia de Nómina</h3>
              <button 
                type="button" 
                onClick={() => setModalIncidenciaOpen(false)} 
                aria-label="Cerrar modal" 
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearIncidencia} className="space-y-4">
              <div>
                <label htmlFor="inc-empleado" className="block text-xs font-semibold text-slate-700 mb-1">Colaborador</label>
                <select
                  id="inc-empleado"
                  required
                  value={incData.empleadoId}
                  onChange={(e) => setIncData({ ...incData, empleadoId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  <label htmlFor="inc-fecha" className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                  <input
                    id="inc-fecha"
                    type="date"
                    required
                    value={incData.fecha}
                    onChange={(e) => setIncData({ ...incData, fecha: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="inc-tipo" className="block text-xs font-semibold text-slate-700 mb-1">Tipo</label>
                  <select
                    id="inc-tipo"
                    value={incData.tipo}
                    onChange={(e) => setIncData({ ...incData, tipo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  <label htmlFor="inc-horas" className="block text-xs font-semibold text-slate-700 mb-1">Cantidad de Horas</label>
                  <input
                    id="inc-horas"
                    type="number"
                    step="0.5"
                    value={incData.horas}
                    onChange={(e) => setIncData({ ...incData, horas: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

              <div>
                <label htmlFor="inc-obs" className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
                <input
                  id="inc-obs"
                  type="text"
                  value={incData.observaciones}
                  onChange={(e) => setIncData({ ...incData, observaciones: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalIncidenciaOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  Registrar Incidencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
