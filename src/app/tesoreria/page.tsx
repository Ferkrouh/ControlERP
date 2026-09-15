'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Landmark, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Filter, 
  Search, 
  Building2, 
  Check, 
  X,
  CreditCard,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function TesoreriaPage() {
  const { user } = useAuth();
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCuentaId, setSelectedCuentaId] = useState<string>('TODAS');

  // Modal Nueva Cuenta
  const [showModalCuenta, setShowModalCuenta] = useState(false);
  const [banco, setBanco] = useState('BBVA');
  const [nombreCuenta, setNombreCuenta] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [clabe, setClabe] = useState('');
  const [saldoInicial, setSaldoInicial] = useState(0);

  // Modal Nuevo Movimiento
  const [showModalMov, setShowModalMov] = useState(false);
  const [movCuentaId, setMovCuentaId] = useState('');
  const [movTipo, setMovTipo] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [movMonto, setMovMonto] = useState(1000);
  const [movConcepto, setMovConcepto] = useState('');
  const [movReferencia, setMovReferencia] = useState('');
  const [movCategoria, setMovCategoria] = useState('OPERATIVO');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.tenantId || user?.rol === 'SUPERADMIN') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resCuentas, resMovs] = await Promise.all([
        fetch('/api/bancos'),
        fetch('/api/bancos/movimientos'),
      ]);

      if (resCuentas.ok) {
        const cData = await resCuentas.json();
        setCuentas(cData);
        if (cData.length > 0 && !movCuentaId) {
          setMovCuentaId(cData[0].id);
        }
      }
      if (resMovs.ok) {
        setMovimientos(await resMovs.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setSaving(true);
      const res = await fetch('/api/bancos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banco,
          nombreCuenta,
          numeroCuenta,
          clabe,
          saldoInicial: Number(saldoInicial),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear cuenta bancaria');

      setShowModalCuenta(false);
      setNombreCuenta('');
      setNumeroCuenta('');
      setClabe('');
      setSaldoInicial(0);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCrearMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setSaving(true);
      const res = await fetch('/api/bancos/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuentaBancariaId: movCuentaId,
          tipo: movTipo,
          monto: Number(movMonto),
          concepto: movConcepto,
          referencia: movReferencia,
          categoria: movCategoria,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar movimiento bancario');

      setShowModalMov(false);
      setMovConcepto('');
      setMovReferencia('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleConciliado = async (movId: string, actual: boolean) => {
    try {
      const res = await fetch('/api/bancos/movimientos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movimientoId: movId,
          conciliado: !actual,
        }),
      });

      if (res.ok) {
        setMovimientos((prev) =>
          prev.map((m) =>
            m.id === movId ? { ...m, conciliado: !actual, fechaConciliacion: !actual ? new Date() : null } : m
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saldoTotalGlobal = cuentas.reduce((acc, c) => acc + (c.saldoActual || 0), 0);

  const movimientosFiltrados = movimientos.filter((m) => {
    const matchCuenta = selectedCuentaId === 'TODAS' || m.cuentaBancariaId === selectedCuentaId;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      m.concepto.toLowerCase().includes(term) ||
      (m.referencia && m.referencia.toLowerCase().includes(term)) ||
      m.cuentaBancaria?.nombreCuenta?.toLowerCase().includes(term);
    return matchCuenta && matchSearch;
  });

  const getBancoBadge = (banco: string) => {
    switch (banco) {
      case 'BBVA':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'BANAMEX':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'SANTANDER':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'BANORTE':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'MERCADO_PAGO':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <Landmark className="w-7 h-7 text-emerald-600" />
              Tesorería, Bancos & Conciliación
            </h1>
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
              Cash Flow
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Gestión de liquidez multicuenta, dispersión de egresos, abonos de cobranza y conciliación con extractos bancarios.
          </p>
        </div>

        {user?.rol !== 'AUDITOR' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModalCuenta(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Cuenta</span>
            </button>
            <button
              onClick={() => setShowModalMov(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Registrar Movimiento</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Global de Liquidez y Tarjetas de Cuentas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Liquidez */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 hover:shadow-md transition-all flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Liquidez Disponible Total
          </span>
          <div className="mt-2">
            <h2 className="text-2xl font-mono font-black text-emerald-600">
              ${saldoTotalGlobal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h2>
            <span className="text-xs text-slate-400 mt-1 block">
              En {cuentas.length} cuentas bancarias activas
            </span>
          </div>
        </div>

        {/* Cuentas Bancarias Individuales */}
        {cuentas.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelectedCuentaId(selectedCuentaId === c.id ? 'TODAS' : c.id)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-sm ${
              selectedCuentaId === c.id
                ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getBancoBadge(c.banco)}`}>
                {c.banco}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {c.numeroCuenta ? `•••${c.numeroCuenta.slice(-4)}` : 'Cuenta'}
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-bold text-slate-900 truncate">{c.nombreCuenta}</h3>
              <p className="text-lg font-mono font-bold text-slate-800 mt-0.5">
                ${c.saldoActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* FILTROS Y HISTORIAL DE MOVIMIENTOS */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2 w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por concepto, clave de rastreo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">Filtrando:</span>
            <select
              value={selectedCuentaId}
              onChange={(e) => setSelectedCuentaId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="TODAS">Todas las cuentas</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>{c.banco} - {c.nombreCuenta}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Cuenta Bancaria</th>
                <th className="p-3">Concepto & Referencia</th>
                <th className="p-3">Categoría</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-right">Saldo Resultante</th>
                <th className="p-3 text-center">Conciliación Bancaria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Cargando libro de bancos...
                  </td>
                </tr>
              ) : movimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No hay movimientos bancarios registrados en esta selección.
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-slate-500 font-mono">
                      {new Date(m.fecha).toLocaleDateString('es-MX')}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">{m.cuentaBancaria?.nombreCuenta}</span>
                      <span className="text-xs text-slate-400 font-mono">{m.cuentaBancaria?.banco}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-slate-900 block">{m.concepto}</span>
                      {m.referencia && (
                        <span className="text-xs font-mono text-slate-500">Ref: {m.referencia}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {m.categoria}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      {m.tipo === 'INGRESO' ? (
                        <span className="text-emerald-600 flex items-center justify-end gap-1">
                          <ArrowDownLeft className="w-3 h-3" /> +${m.monto.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center justify-end gap-1">
                          <ArrowUpRight className="w-3 h-3" /> -${m.monto.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-slate-900">
                      ${m.saldoResultante.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleConciliado(m.id, m.conciliado)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                          m.conciliado
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200/70'
                        }`}
                      >
                        {m.conciliado ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Conciliado
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-slate-400" /> Pendiente
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: AÑADIR CUENTA BANCARIA */}
      {showModalCuenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-400" />
                Nueva Cuenta Bancaria
              </h3>
              <button
                onClick={() => setShowModalCuenta(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearCuenta} className="p-6 space-y-4 text-xs bg-slate-50/50">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Institución Bancaria *</label>
                <select
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="BBVA">BBVA México</option>
                  <option value="BANAMEX">Citibanamex</option>
                  <option value="SANTANDER">Santander</option>
                  <option value="BANORTE">Banorte</option>
                  <option value="HSBC">HSBC México</option>
                  <option value="INBURSA">Inbursa</option>
                  <option value="MERCADO_PAGO">Mercado Pago / FinTech</option>
                  <option value="CAJA_CHICA">Caja Chica de Efectivo</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nombre / Identificador de la Cuenta *</label>
                <input
                  type="text"
                  placeholder="ej. Operativa Principal o Pagos Nómina"
                  value={nombreCuenta}
                  onChange={(e) => setNombreCuenta(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Número de Cuenta</label>
                <input
                  type="text"
                  placeholder="10 dígitos"
                  value={numeroCuenta}
                  onChange={(e) => setNumeroCuenta(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">CLABE Interbancaria (18 dígitos)</label>
                <input
                  type="text"
                  placeholder="18 dígitos para SPEI"
                  value={clabe}
                  onChange={(e) => setClabe(e.target.value)}
                  maxLength={18}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Saldo Inicial de Apertura ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModalCuenta(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-all"
                >
                  {saving ? 'Guardando...' : 'Guardar Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR MOVIMIENTO BANCARIO */}
      {showModalMov && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Registrar Movimiento Bancario
              </h3>
              <button
                onClick={() => setShowModalMov(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearMovimiento} className="p-6 space-y-4 text-xs bg-slate-50/50">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Cuenta Bancaria *</label>
                <select
                  value={movCuentaId}
                  onChange={(e) => setMovCuentaId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.banco} — {c.nombreCuenta} (Saldo: ${c.saldoActual.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tipo de Flujo *</label>
                  <select
                    value={movTipo}
                    onChange={(e) => setMovTipo(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="INGRESO">🟢 Ingreso / Depósito</option>
                    <option value="EGRESO">🔴 Egreso / Dispersión</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Monto ($) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={movMonto}
                    onChange={(e) => setMovMonto(Number(e.target.value))}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Concepto / Motivo *</label>
                <input
                  type="text"
                  placeholder="ej. Pago servicio de hosting, Cobranza externa, etc."
                  value={movConcepto}
                  onChange={(e) => setMovConcepto(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Referencia / Rastreo</label>
                  <input
                    type="text"
                    placeholder="Clave SPEI o cheque"
                    value={movReferencia}
                    onChange={(e) => setMovReferencia(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Categoría</label>
                  <select
                    value={movCategoria}
                    onChange={(e) => setMovCategoria(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="GASTO_OPERATIVO">Gasto Operativo</option>
                    <option value="COBRANZA_CLIENTE">Cobranza Cliente</option>
                    <option value="PAGO_PROVEEDOR">Pago Proveedor</option>
                    <option value="NOMINA">Nómina / Sueldos</option>
                    <option value="IMPUESTOS">Impuestos SAT</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModalMov(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-all"
                >
                  {saving ? 'Aplicando...' : 'Aplicar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
