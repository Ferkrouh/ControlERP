'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Users, 
  Plus, 
  ShieldAlert, 
  CreditCard, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  Lock,
  Eye
} from 'lucide-react';

export default function ClientesPage() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal Nuevo Cliente
  const [showModal, setShowModal] = useState(false);
  const [razonSocial, setRazonSocial] = useState('');
  const [rfc, setRfc] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [diasCredito, setDiasCredito] = useState(30);
  const [limiteCredito, setLimiteCredito] = useState(50000);
  const [saving, setSaving] = useState(false);

  // Modal Simular Cargo / Validación de Crédito
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [cargoMonto, setCargoMonto] = useState(10000);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    if (user?.tenantId) {
      fetchClientes();
    }
  }, [user]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clientes?tenantId=${user?.tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setClientes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) return;

    setSaving(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: user.tenantId,
          razonSocial,
          rfc,
          email,
          telefono,
          diasCredito: Number(diasCredito),
          limiteCredito: Number(limiteCredito),
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setRazonSocial('');
        setRfc('');
        setEmail('');
        setTelefono('');
        fetchClientes();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Simulación de Facturación y Validación en tiempo real del límite de crédito
  const handleSimularCargo = async () => {
    if (!selectedCliente || !user?.tenantId) return;
    setValidationResult(null);

    try {
      const res = await fetch('/api/cxc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: user.tenantId,
          clienteId: selectedCliente.id,
          montoTotal: Number(cargoMonto),
          diasCredito: selectedCliente.diasCredito,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setValidationResult({
          error: true,
          message: data.error || 'Operación bloqueada por control de crédito',
        });
      } else {
        setValidationResult({
          success: true,
          message: `Factura ${data.folio} generada exitosamente. Se afectó el saldo de crédito del cliente.`,
        });
        fetchClientes();
      }
    } catch (err) {
      setValidationResult({ error: true, message: 'Error al simular cargo.' });
    }
  };

  const filteredClientes = clientes.filter((c) =>
    c.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
    (c.rfc && c.rfc.toLowerCase().includes(search.toLowerCase())) ||
    c.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const isReadOnly = user?.rol === 'AUDITOR';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Cartera de Clientes & Límites de Crédito
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Control de términos de pago, saldo utilizado, crédito disponible y motor de bloqueo automático.
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium">
          <Eye className="w-4 h-4 text-amber-600" />
          Modo Auditoría: Tienes permisos de solo lectura para consultar cartera y límites de crédito sin modificar datos.
        </div>
      )}

      {/* Barra de Búsqueda y Filtro */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente, RFC o código CLI..."
          className="w-full text-sm outline-none bg-transparent"
        />
      </div>

      {/* Listado de Clientes con Monitor de Crédito */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando cartera de clientes...</div>
        ) : filteredClientes.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No se encontraron clientes registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Código & Cliente</th>
                  <th className="py-3 px-4">RFC Fiscal</th>
                  <th className="py-3 px-4">Plazo</th>
                  <th className="py-3 px-4 text-right">Límite Crédito</th>
                  <th className="py-3 px-4 text-right">Saldo Actual</th>
                  <th className="py-3 px-4 text-right">Crédito Disponible</th>
                  <th className="py-3 px-4 w-48">Salud de Crédito</th>
                  <th className="py-3 px-4 text-center">Estatus</th>
                  {!isReadOnly && <th className="py-3 px-4 text-center">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClientes.map((cli) => {
                  const saldo = cli.saldoActual || 0;
                  const limite = cli.limiteCredito || 0;
                  const disponible = Math.max(0, limite - saldo);
                  const porcentajeUso = limite > 0 ? Math.min(100, (saldo / limite) * 100) : 0;

                  return (
                    <tr key={cli.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{cli.razonSocial}</div>
                        <span className="text-[11px] font-mono text-slate-400">{cli.codigo}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {cli.rfc || 'Sin RFC'}
                      </td>

                      <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                        {cli.diasCredito} días
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        ${limite.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        ${disponible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                porcentajeUso >= 100
                                  ? 'bg-rose-500'
                                  : porcentajeUso >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${porcentajeUso}%` }}
                            ></div>
                          </div>
                          <p className="text-[10px] text-right font-semibold text-slate-500">
                            {porcentajeUso.toFixed(1)}% utilizado
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {cli.estadoCredito === 'BLOQUEADO' ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" /> Bloqueado
                          </span>
                        ) : cli.cxc?.some((x: any) => (x.estado === 'VENCIDA' || new Date(x.fechaVencimiento) < new Date()) && x.saldoPendiente > 0) ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center gap-1" title="Tiene facturas con plazo vencido en CxC">
                            <Clock className="w-3 h-3 text-amber-600" /> En Mora ({cli.cxc?.filter((x: any) => (x.estado === 'VENCIDA' || new Date(x.fechaVencimiento) < new Date()) && x.saldoPendiente > 0).length})
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Al Corriente
                          </span>
                        )}
                      </td>

                      {!isReadOnly && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedCliente(cli);
                              setValidationResult(null);
                            }}
                            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Validar Venta
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Alta de Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Alta de Nuevo Cliente
            </h3>

            <form onSubmit={handleCreateCliente} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre o Razón Social *
                </label>
                <input
                  type="text"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RFC Fiscal
                  </label>
                  <input
                    type="text"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    maxLength={13}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico para Facturación
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Límite de Crédito ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={limiteCredito}
                    onChange={(e) => setLimiteCredito(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Días de Crédito
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={diasCredito}
                    onChange={(e) => setDiasCredito(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Simulador de Validación de Crédito */}
      {selectedCliente && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Validar Venta a Crédito</h3>
                <p className="text-xs text-slate-500 font-medium">{selectedCliente.razonSocial}</p>
              </div>
              <button
                onClick={() => setSelectedCliente(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Diagnóstico de crédito */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Límite Asignado:</span>
                <span className="font-bold text-slate-900">
                  ${selectedCliente.limiteCredito.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Actual Adeudado:</span>
                <span className="font-bold text-slate-900">
                  ${selectedCliente.saldoActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-500">Crédito Disponible:</span>
                <span className="font-bold text-emerald-600">
                  ${Math.max(0, selectedCliente.limiteCredito - selectedCliente.saldoActual).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monto de la Venta a Simular ($)
              </label>
              <input
                type="number"
                min="1"
                step="500"
                value={cargoMonto}
                onChange={(e) => setCargoMonto(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                El motor evaluará si el saldo resultante excede el límite y aplicará la política configurada.
              </p>
            </div>

            {validationResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium ${
                  validationResult.error
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {validationResult.error ? (
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{validationResult.message}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{validationResult.message}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCliente(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSimularCargo}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm"
              >
                Ejecutar Validación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
