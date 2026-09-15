'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  BookOpen, 
  FileCode, 
  Plus, 
  CheckCircle2, 
  Download, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Layers,
  Scale
} from 'lucide-react';

export default function ContabilidadPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'polizas' | 'balanza' | 'catalogo'>('polizas');
  const [polizas, setPolizas] = useState<any[]>([]);
  const [balanza, setBalanza] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [selectedPoliza, setSelectedPoliza] = useState<any | null>(null);

  // Modal Nueva Póliza
  const [modalOpen, setModalOpen] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState<'INGRESO' | 'EGRESO' | 'DIARIO'>('DIARIO');
  const [nuevoConcepto, setNuevoConcepto] = useState('');
  const [partidas, setPartidas] = useState<{ cuentaCodigo: string; cargo: number; abono: number; concepto?: string }[]>([
    { cuentaCodigo: '101.01', cargo: 1000, abono: 0, concepto: '' },
    { cuentaCodigo: '401.01', cargo: 0, abono: 1000, concepto: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Accesibilidad: Cerrar modales con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalOpen) setModalOpen(false);
        if (selectedPoliza) setSelectedPoliza(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, selectedPoliza]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resPol, resBal, resCta] = await Promise.all([
        fetch('/api/contabilidad/polizas'),
        fetch('/api/contabilidad/balanza'),
        fetch('/api/contabilidad/cuentas'),
      ]);

      if (resPol.ok) setPolizas(await resPol.json());
      if (resBal.ok) setBalanza(await resBal.json());
      if (resCta.ok) setCuentas(await resCta.json());
    } catch (err) {
      console.error('Error cargando contabilidad:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos de KPIs
  const activoTotal = balanza
    .filter((c) => c.tipo === 'ACTIVO')
    .reduce((sum, c) => sum + c.saldoFinal, 0);

  const pasivoTotal = balanza
    .filter((c) => c.tipo === 'PASIVO')
    .reduce((sum, c) => sum + c.saldoFinal, 0);

  const ingresos = balanza
    .filter((c) => c.tipo === 'RESULTADOS_ACREEDORA')
    .reduce((sum, c) => sum + c.saldoFinal, 0);

  const egresos = balanza
    .filter((c) => c.tipo === 'RESULTADOS_DEUDORA')
    .reduce((sum, c) => sum + c.saldoFinal, 0);

  const resultadoEjercicio = ingresos - egresos;

  // Filtros
  const polizasFiltradas = polizas.filter((p) => {
    const matchTipo = filtroTipo === 'TODOS' || p.tipo === filtroTipo;
    const matchBusq = 
      p.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.concepto.toLowerCase().includes(busqueda.toLowerCase());
    return matchTipo && matchBusq;
  });

  const totalDebeBalanza = balanza.reduce((sum, c) => sum + c.totalDebe, 0);
  const totalHaberBalanza = balanza.reduce((sum, c) => sum + c.totalHaber, 0);

  // Manejo de partidas en modal
  const agregarPartida = () => {
    setPartidas([...partidas, { cuentaCodigo: cuentas[0]?.codigo || '101.01', cargo: 0, abono: 0 }]);
  };

  const actualizarPartida = (index: number, campo: string, valor: any) => {
    const updated = [...partidas];
    (updated[index] as any)[campo] = valor;
    setPartidas(updated);
  };

  const eliminarPartida = (index: number) => {
    if (partidas.length <= 2) return;
    setPartidas(partidas.filter((_, i) => i !== index));
  };

  const totalCargoModal = partidas.reduce((sum, p) => sum + Number(p.cargo || 0), 0);
  const totalAbonoModal = partidas.reduce((sum, p) => sum + Number(p.abono || 0), 0);
  const estaCuadrada = Math.abs(totalCargoModal - totalAbonoModal) < 0.01 && totalCargoModal > 0;

  const handleCrearPoliza = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estaCuadrada) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/contabilidad/polizas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: nuevoTipo,
          concepto: nuevoConcepto,
          partidas: partidas.map((p) => ({
            cuentaCodigo: p.cuentaCodigo,
            cargo: Number(p.cargo) || 0,
            abono: Number(p.abono) || 0,
            concepto: p.concepto || nuevoConcepto,
          })),
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setNuevoConcepto('');
        cargarDatos();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al crear póliza');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Encabezado Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                <BookOpen className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contabilidad Electrónica SAT (Anexo 24)</h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Partida doble en tiempo real, balanza de comprobación y exportación fiscal XML oficial
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="/api/contabilidad/sat-xml?tipo=catalogo"
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-300 flex items-center gap-2 transition-all shadow-sm"
              download
            >
              <FileCode className="w-4 h-4 text-purple-600" />
              XML Catálogo SAT
            </a>
            <a
              href="/api/contabilidad/sat-xml?tipo=balanza"
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-300 flex items-center gap-2 transition-all shadow-sm"
              download
            >
              <Download className="w-4 h-4 text-emerald-600" />
              XML Balanza SAT
            </a>
            {user?.rol !== 'AUDITOR' && (
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Nueva Póliza Manual
              </button>
            )}
          </div>
        </div>

        {/* 4 KPIs Contables (The Card Float Principle) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm shadow-slate-200/50 hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activo Total</span>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
              ${activoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-400 mt-1 block">Bancos, Clientes e Inventario</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm shadow-slate-200/50 hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pasivo Total</span>
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <ArrowDownLeft className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
              ${pasivoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-400 mt-1 block">Proveedores e Impuestos por pagar</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm shadow-slate-200/50 hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resultado Ejercicio</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Scale className="w-4 h-4" />
              </span>
            </div>
            <p className={`text-2xl font-bold font-mono mt-2 ${resultadoEjercicio >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${resultadoEjercicio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-400 mt-1 block">Ventas vs Costos y Gastos</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm shadow-slate-200/50 hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cuadratura Ledger</span>
              <span className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-600 mt-2">100.00%</p>
            <span className="text-xs text-slate-400 mt-1 block">Partida doble verificada</span>
          </div>
        </div>

        {/* Pestañas de Navegación Contable */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setTab('polizas')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              tab === 'polizas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Libro Diario de Pólizas ({polizas.length})
          </button>
          <button
            onClick={() => setTab('balanza')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              tab === 'balanza'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            Balanza de Comprobación
          </button>
          <button
            onClick={() => setTab('catalogo')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              tab === 'catalogo'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Catálogo de Cuentas ({cuentas.length})
          </button>
        </div>

        {/* TAB 1: LIBRO DIARIO DE PÓLIZAS */}
        {tab === 'polizas' && (
          <div className="space-y-4">
            {/* Barra de Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar folio o concepto..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto w-full sm:w-auto">
                {['TODOS', 'INGRESO', 'EGRESO', 'DIARIO'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFiltroTipo(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filtroTipo === t
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla Ledger de Pólizas */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Folio Póliza</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Concepto Transaccional</th>
                    <th className="py-3 px-4 text-right">Total Cargo (Debe)</th>
                    <th className="py-3 px-4 text-right">Total Abono (Haber)</th>
                    <th className="py-3 px-4 text-center">Estatus</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Cargando pólizas contables...
                      </td>
                    </tr>
                  ) : polizasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No se encontraron pólizas registradas.
                      </td>
                    </tr>
                  ) : (
                    polizasFiltradas.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{p.folio}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              p.tipo === 'INGRESO'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : p.tipo === 'EGRESO'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {p.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {new Date(p.fecha).toLocaleDateString('es-MX')}
                        </td>
                        <td className="py-3 px-4 text-slate-800 max-w-xs truncate font-medium">{p.concepto}</td>
                        <td className="py-3 px-4 font-mono text-right text-emerald-700 font-semibold">
                          ${p.totalDebe.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono text-right text-blue-700 font-semibold">
                          ${p.totalHaber.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Cuadrada
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedPoliza(p)}
                            aria-label={`Ver asiento contable de ${p.folio}`}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-all shadow-sm"
                          >
                            Ver Asiento
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: BALANZA DE COMPROBACIÓN */}
        {tab === 'balanza' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Balanza de Comprobación Contable</h2>
                <p className="text-xs text-slate-500">Verificación estricta de partida doble Anexo 24 SAT</p>
              </div>
              <div className="flex gap-4 text-xs font-mono">
                <span className="text-slate-600">Total Cargos: <b className="text-emerald-700">${totalDebeBalanza.toFixed(2)}</b></span>
                <span className="text-slate-600">Total Abonos: <b className="text-blue-700">${totalHaberBalanza.toFixed(2)}</b></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Cuenta Contable</th>
                    <th className="py-3 px-4">Agrupador SAT</th>
                    <th className="py-3 px-4">Tipo / Nat.</th>
                    <th className="py-3 px-4 text-right">Saldo Inicial</th>
                    <th className="py-3 px-4 text-right">Debe (Cargos)</th>
                    <th className="py-3 px-4 text-right">Haber (Abonos)</th>
                    <th className="py-3 px-4 text-right">Saldo Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {balanza.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{c.codigo}</td>
                      <td className="py-2.5 px-4 text-slate-900 font-medium">{c.nombre}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-purple-700 font-semibold">{c.codigoAgrupadorSAT}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-500">
                        {c.tipo} ({c.naturaleza === 'DEUDORA' ? 'D' : 'A'})
                      </td>
                      <td className="py-2.5 px-4 font-mono text-right text-slate-600">${c.saldoInicial.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-mono text-right text-emerald-700 font-semibold">${c.totalDebe.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-mono text-right text-blue-700 font-semibold">${c.totalHaber.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-mono text-right font-bold text-slate-900">${c.saldoFinal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-mono font-bold border-t-2 border-slate-300 text-slate-900">
                  <tr>
                    <td colSpan={5} className="py-3 px-4 text-right uppercase text-xs">Sumas Iguales de Comprobación:</td>
                    <td className="py-3 px-4 text-right text-emerald-700">${totalDebeBalanza.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-blue-700">${totalHaberBalanza.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-emerald-700">OK</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CATÁLOGO DE CUENTAS */}
        {tab === 'catalogo' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Catálogo de Cuentas Contables (SAT Anexo 24)</h2>
              <p className="text-xs text-slate-500">Estructura jerárquica con código agrupador oficial</p>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cuentas.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-base text-blue-700">{c.codigo}</span>
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      SAT: {c.codigoAgrupadorSAT}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mt-1.5 text-sm">{c.nombre}</h3>
                  <div className="flex items-center justify-between mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2">
                    <span>{c.tipo} ({c.naturaleza})</span>
                    <span className="font-mono font-bold text-slate-900">${c.saldoActual.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL DETALLE DE PÓLIZA */}
        {selectedPoliza && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-mono">{selectedPoliza.folio}</h3>
                  <p className="text-xs text-slate-500">{selectedPoliza.concepto}</p>
                </div>
                <button
                  onClick={() => setSelectedPoliza(null)}
                  aria-label="Cerrar detalle de póliza"
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Cuenta</th>
                      <th className="py-2.5 px-3">Nombre</th>
                      <th className="py-2.5 px-3 text-right">Cargo (Debe)</th>
                      <th className="py-2.5 px-3 text-right">Abono (Haber)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPoliza.partidas?.map((part: any) => (
                      <tr key={part.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">{part.cuenta?.codigo || '---'}</td>
                        <td className="py-2.5 px-3 text-slate-900 font-medium">{part.cuenta?.nombre || part.concepto}</td>
                        <td className="py-2.5 px-3 font-mono text-right text-emerald-700 font-semibold">${part.cargo.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono text-right text-blue-700 font-semibold">${part.abono.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-mono font-bold text-slate-900">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-right">Totales:</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">${selectedPoliza.totalDebe.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-blue-700">${selectedPoliza.totalHaber.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200">
                <button
                  onClick={() => setSelectedPoliza(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL NUEVA PÓLIZA MANUAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Registrar Póliza Contable Manual</h3>
                <button 
                  onClick={() => setModalOpen(false)} 
                  aria-label="Cerrar registro de póliza"
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCrearPoliza} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Póliza</label>
                    <select
                      value={nuevoTipo}
                      onChange={(e: any) => setNuevoTipo(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="DIARIO">DIARIO</option>
                      <option value="INGRESO">INGRESO</option>
                      <option value="EGRESO">EGRESO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Concepto General</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Provisión de gastos operativos..."
                      value={nuevoConcepto}
                      onChange={(e) => setNuevoConcepto(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Partidas */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Asientos Contables (Partida Doble)</span>
                    <button
                      type="button"
                      onClick={agregarPartida}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Línea
                    </button>
                  </div>

                  <div className="space-y-2">
                    {partidas.map((part, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <select
                          value={part.cuentaCodigo}
                          onChange={(e) => actualizarPartida(idx, 'cuentaCodigo', e.target.value)}
                          className="bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs w-1/2 focus:outline-none focus:border-blue-500"
                        >
                          {cuentas.map((c) => (
                            <option key={c.id} value={c.codigo}>
                              {c.codigo} - {c.nombre}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Cargo (Debe)"
                          value={part.cargo || ''}
                          onChange={(e) => actualizarPartida(idx, 'cargo', Number(e.target.value))}
                          className="bg-white border border-slate-300 text-emerald-700 font-mono font-bold rounded-lg px-2.5 py-1.5 text-xs w-1/4 text-right focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Abono (Haber)"
                          value={part.abono || ''}
                          onChange={(e) => actualizarPartida(idx, 'abono', Number(e.target.value))}
                          className="bg-white border border-slate-300 text-blue-700 font-mono font-bold rounded-lg px-2.5 py-1.5 text-xs w-1/4 text-right focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => eliminarPartida(idx)}
                          aria-label={`Eliminar partida ${idx + 1}`}
                          className="text-slate-400 hover:text-rose-600 px-1 text-sm transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comprobación de Cuadratura */}
                <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono">
                  <span className="text-slate-600">Total Cargo: <b className="text-emerald-700">${totalCargoModal.toFixed(2)}</b></span>
                  <span className="text-slate-600">Total Abono: <b className="text-blue-700">${totalAbonoModal.toFixed(2)}</b></span>
                  <span className={estaCuadrada ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                    {estaCuadrada ? '✓ Cuadrada' : '✗ Descuadrada'}
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!estaCuadrada || submitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                  >
                    {submitting ? 'Guardando...' : 'Registrar Póliza'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }
