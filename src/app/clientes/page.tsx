'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Eye,
  Download,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit3,
  ShieldCheck,
  Phone,
  Mail,
  FileText,
  FileDown,
  X,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Building2
} from 'lucide-react';

interface ClienteItem {
  id: string;
  codigo: string;
  razonSocial: string;
  rfc?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  diasCredito: number;
  limiteCredito: number;
  saldoActual: number;
  estadoCredito: string;
  regimenFiscal?: string | null;
  usoCfdi?: string | null;
  codigoPostal?: string | null;
  cxc?: Array<{
    id: string;
    folio: string;
    total: number;
    saldoPendiente: number;
    fechaVencimiento: string;
    estado: string;
  }>;
}

type ViewMode = 'GRID' | 'LEDGER';
type FilterStatus = 'TODOS' | 'AL_CORRIENTE' | 'ALERTA_LIMITE' | 'EN_MORA' | 'BLOQUEADO';
type SortField = 'razonSocial' | 'codigo' | 'limiteCredito' | 'saldoActual' | 'disponible' | 'diasCredito';

export default function ClientesPage() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<ClienteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('TODOS');
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [sortField, setSortField] = useState<SortField>('razonSocial');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal Nuevo Cliente
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [razonSocial, setRazonSocial] = useState('');
  const [rfc, setRfc] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [diasCredito, setDiasCredito] = useState(30);
  const [limiteCredito, setLimiteCredito] = useState(50000);
  const [regimenFiscal, setRegimenFiscal] = useState('601');
  const [usoCfdi, setUsoCfdi] = useState('G01');
  const [codigoPostal, setCodigoPostal] = useState('64000');
  const [saving, setSaving] = useState(false);

  // Modal Editar Cliente / Límite de Crédito
  const [editingCliente, setEditingCliente] = useState<ClienteItem | null>(null);
  const [editRazonSocial, setEditRazonSocial] = useState('');
  const [editRfc, setEditRfc] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editDireccion, setEditDireccion] = useState('');
  const [editDiasCredito, setEditDiasCredito] = useState(30);
  const [editLimiteCredito, setEditLimiteCredito] = useState(0);
  const [editEstadoCredito, setEditEstadoCredito] = useState('ACTIVO');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Simular Cargo / Validación de Crédito
  const [selectedCliente, setSelectedCliente] = useState<ClienteItem | null>(null);
  const [cargoMonto, setCargoMonto] = useState(10000);
  const [validationResult, setValidationResult] = useState<{ error?: boolean; success?: boolean; message: string } | null>(null);
  const [validating, setValidating] = useState(false);

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
      console.error('Error fetching clientes:', e);
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
          rfc: rfc.trim().toUpperCase(),
          email,
          telefono,
          direccion,
          diasCredito: Number(diasCredito),
          limiteCredito: Number(limiteCredito),
          regimenFiscal,
          usoCfdi,
          codigoPostal,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setRazonSocial('');
        setRfc('');
        setEmail('');
        setTelefono('');
        setDireccion('');
        setDiasCredito(30);
        setLimiteCredito(50000);
        fetchClientes();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (cli: ClienteItem) => {
    setEditingCliente(cli);
    setEditRazonSocial(cli.razonSocial);
    setEditRfc(cli.rfc || '');
    setEditEmail(cli.email || '');
    setEditTelefono(cli.telefono || '');
    setEditDireccion(cli.direccion || '');
    setEditDiasCredito(cli.diasCredito || 0);
    setEditLimiteCredito(cli.limiteCredito || 0);
    setEditEstadoCredito(cli.estadoCredito || 'ACTIVO');
  };

  const handleUpdateCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCliente) return;

    setSavingEdit(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCliente.id,
          razonSocial: editRazonSocial,
          rfc: editRfc.trim().toUpperCase(),
          email: editEmail,
          telefono: editTelefono,
          direccion: editDireccion,
          diasCredito: Number(editDiasCredito),
          limiteCredito: Number(editLimiteCredito),
          estadoCredito: editEstadoCredito,
        }),
      });

      if (res.ok) {
        setEditingCliente(null);
        fetchClientes();
      }
    } catch (e) {
      console.error('Error updating cliente:', e);
    } finally {
      setSavingEdit(false);
    }
  };

  // Simulación de Facturación y Validación en tiempo real del límite de crédito
  const handleSimularCargo = async () => {
    if (!selectedCliente || !user?.tenantId) return;
    setValidationResult(null);
    setValidating(true);

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
          message: data.error || 'Operación bloqueada por control de crédito institucional.',
        });
      } else {
        setValidationResult({
          success: true,
          message: `Factura ${data.folio} autorizada y registrada. El cupo de crédito se actualizó en tiempo real.`,
        });
        fetchClientes();
      }
    } catch (err) {
      setValidationResult({ error: true, message: 'Error de comunicación al simular validación de crédito.' });
    } finally {
      setValidating(false);
    }
  };

  // Exportar Cartera a CSV
  const handleExportCSV = () => {
    const headers = [
      'Codigo',
      'Razon Social',
      'RFC',
      'Telefono',
      'Email',
      'Dias Credito',
      'Limite Credito',
      'Saldo Actual',
      'Credito Disponible',
      'Porcentaje Uso',
      'Estado Credito',
      'Facturas Vencidas'
    ];

    const rows = filteredClientes.map(c => {
      const saldo = c.saldoActual || 0;
      const limite = c.limiteCredito || 0;
      const disponible = Math.max(0, limite - saldo);
      const porcentaje = limite > 0 ? ((saldo / limite) * 100).toFixed(1) : '0.0';
      const facturasVencidas = c.cxc?.filter(x => (x.estado === 'VENCIDA' || new Date(x.fechaVencimiento) < new Date()) && x.saldoPendiente > 0).length || 0;

      return [
        `"${c.codigo}"`,
        `"${c.razonSocial.replace(/"/g, '""')}"`,
        `"${c.rfc || ''}"`,
        `"${c.telefono || ''}"`,
        `"${c.email || ''}"`,
        c.diasCredito,
        limite.toFixed(2),
        saldo.toFixed(2),
        disponible.toFixed(2),
        `${porcentaje}%`,
        c.estadoCredito,
        facturasVencidas
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cartera_clientes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Indicador de morosidad
  const hasFacturasVencidas = (c: ClienteItem) => {
    return !!c.cxc?.some(x => (x.estado === 'VENCIDA' || new Date(x.fechaVencimiento) < new Date()) && x.saldoPendiente > 0);
  };

  // Conteo de facturas vencidas
  const countFacturasVencidas = (c: ClienteItem) => {
    return c.cxc?.filter(x => (x.estado === 'VENCIDA' || new Date(x.fechaVencimiento) < new Date()) && x.saldoPendiente > 0).length || 0;
  };

  // KPIs consolidados
  const kpis = useMemo(() => {
    let carteraTotal = 0;
    let saldoColocado = 0;
    let clientesEnMora = 0;
    let clientesBloqueados = 0;
    let clientesAlertaLimite = 0;

    clientes.forEach(c => {
      carteraTotal += (c.limiteCredito || 0);
      saldoColocado += (c.saldoActual || 0);
      if (c.estadoCredito === 'BLOQUEADO' || c.estadoCredito === 'SUSPENDIDO') {
        clientesBloqueados++;
      }
      if (hasFacturasVencidas(c)) {
        clientesEnMora++;
      }
      const uso = c.limiteCredito > 0 ? (c.saldoActual / c.limiteCredito) : 0;
      if (uso >= 0.8 && c.limiteCredito > 0) {
        clientesAlertaLimite++;
      }
    });

    const disponibleTotal = Math.max(0, carteraTotal - saldoColocado);
    const porcentajeColocacion = carteraTotal > 0 ? ((saldoColocado / carteraTotal) * 100) : 0;

    return {
      totalClientes: clientes.length,
      carteraTotal,
      saldoColocado,
      disponibleTotal,
      porcentajeColocacion,
      clientesEnMora,
      clientesBloqueados,
      clientesAlertaLimite,
    };
  }, [clientes]);

  // Filtrado y ordenamiento
  const filteredClientes = useMemo(() => {
    return clientes.filter((c) => {
      const matchesSearch = 
        c.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
        (c.rfc && c.rfc.toLowerCase().includes(search.toLowerCase())) ||
        c.codigo.toLowerCase().includes(search.toLowerCase()) ||
        (c.telefono && c.telefono.includes(search));

      if (!matchesSearch) return false;

      const uso = c.limiteCredito > 0 ? (c.saldoActual / c.limiteCredito) : 0;
      const isMora = hasFacturasVencidas(c);
      const isBlocked = c.estadoCredito === 'BLOQUEADO' || c.estadoCredito === 'SUSPENDIDO';

      if (statusFilter === 'AL_CORRIENTE') {
        return !isBlocked && !isMora && uso < 0.8;
      }
      if (statusFilter === 'ALERTA_LIMITE') {
        return uso >= 0.8 && !isBlocked;
      }
      if (statusFilter === 'EN_MORA') {
        return isMora;
      }
      if (statusFilter === 'BLOQUEADO') {
        return isBlocked;
      }

      return true;
    }).sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'disponible') {
        valA = Math.max(0, (a.limiteCredito || 0) - (a.saldoActual || 0));
        valB = Math.max(0, (b.limiteCredito || 0) - (b.saldoActual || 0));
      } else {
        valA = (a as any)[sortField];
        valB = (b as any)[sortField];
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA - valB) : (valB - valA);
    });
  }, [clientes, search, statusFilter, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const isReadOnly = user?.rol === 'AUDITOR';

  return (
    <div className="space-y-6">
      {/* Cabecera Soberana Ejecutiva */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/30 border border-blue-500/30 rounded-2xl text-blue-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Cartera de Clientes & Políticas de Crédito
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Control institucional de cupos crediticios, saldos en calle, plazos de pago y evaluación de riesgo de cobranza.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold transition-all shadow-sm"
              title="Descargar padrón y métricas crediticias en formato CSV"
            >
              <Download className="w-4 h-4" />
              Exportar Cartera
            </button>

            {!isReadOnly && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Nuevo Cliente
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notificación de Modo Auditor */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-4 rounded-2xl flex items-center gap-3 font-medium">
          <Eye className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Modo Auditoría Activo:</strong> Permisos de solo lectura para consulta de estados de cuenta, límites aprobados y líneas concedidas sin autorización de edición.
          </span>
        </div>
      )}

      {/* KPIs Ejecutivos (The Card Float Principle) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cartera Total Autorizada */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Cartera Autorizada</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
            ${kpis.carteraTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>{kpis.totalClientes} clientes registrados</span>
          </p>
        </div>

        {/* Saldo Colocado en Calle (CxC) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Saldo Colocado (CxC)</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
            ${kpis.saldoColocado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {kpis.porcentajeColocacion.toFixed(1)}% de colocación de cupo global
          </p>
        </div>

        {/* Crédito Disponible Global */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Crédito Disponible</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-2">
            ${kpis.disponibleTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Capacidad disponible para colocación
          </p>
        </div>

        {/* Alerta de Riesgo / En Mora */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">En Riesgo / En Mora</span>
            {kpis.clientesEnMora > 0 || kpis.clientesBloqueados > 0 ? (
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-2 bg-slate-100 text-slate-500 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={`text-2xl font-bold font-mono ${kpis.clientesEnMora > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {kpis.clientesEnMora}
            </p>
            <span className="text-xs text-slate-500 font-medium">en mora</span>
            {kpis.clientesBloqueados > 0 && (
              <span className="text-xs font-bold text-rose-600 ml-auto">
                {kpis.clientesBloqueados} bloqueados
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {kpis.clientesAlertaLimite} clientes con cupo &gt; 80%
          </p>
        </div>
      </div>

      {/* Barra de Filtros Multifactor & Conmutador de Vistas */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razón social, RFC, código CLI o teléfono..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros de Estatus */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter('TODOS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'TODOS'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({clientes.length})
          </button>
          <button
            onClick={() => setStatusFilter('AL_CORRIENTE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'AL_CORRIENTE'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Al Corriente
          </button>
          <button
            onClick={() => setStatusFilter('ALERTA_LIMITE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'ALERTA_LIMITE'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cupo &gt; 80%
          </button>
          <button
            onClick={() => setStatusFilter('EN_MORA')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'EN_MORA'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            En Mora ({kpis.clientesEnMora})
          </button>
          <button
            onClick={() => setStatusFilter('BLOQUEADO')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'BLOQUEADO'
                ? 'bg-white text-rose-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bloqueados ({kpis.clientesBloqueados})
          </button>
        </div>

        {/* Conmutador Grid ↔ Ledger */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end md:self-auto shrink-0">
          <button
            onClick={() => setViewMode('GRID')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'GRID'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Vista Espacial de Tarjetas"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('LEDGER')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'LEDGER'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Vista Contable Densa (Ledger)"
          >
            <TableIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Ledger</span>
          </button>
        </div>
      </div>

      {/* Visualización de Clientes */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
          <p className="text-sm font-medium">Cargando cartera de clientes y cupos de crédito...</p>
        </div>
      ) : filteredClientes.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No se encontraron clientes</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search || statusFilter !== 'TODOS'
              ? 'Prueba modificando tus términos de búsqueda o cambiando el filtro de estado.'
              : 'Empieza registrando tu primer cliente para habilitar crédito, cuentas por cobrar y facturación.'}
          </p>
          {!isReadOnly && !search && statusFilter === 'TODOS' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" /> Registrar Cliente
            </button>
          )}
        </div>
      ) : viewMode === 'GRID' ? (
        /* VISTA ESPACIAL EN GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClientes.map((cli) => {
            const saldo = cli.saldoActual || 0;
            const limite = cli.limiteCredito || 0;
            const disponible = Math.max(0, limite - saldo);
            const porcentajeUso = limite > 0 ? Math.min(100, (saldo / limite) * 100) : 0;
            const facturasVencidas = countFacturasVencidas(cli);
            const isBlocked = cli.estadoCredito === 'BLOQUEADO' || cli.estadoCredito === 'SUSPENDIDO';

            return (
              <div
                key={cli.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Fila superior de la tarjeta */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {cli.razonSocial.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate" title={cli.razonSocial}>
                          {cli.razonSocial}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-medium text-slate-500">{cli.codigo}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-xs text-slate-600 font-semibold">{cli.rfc || 'Sin RFC'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Badge de Estatus */}
                    {isBlocked ? (
                      <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3" /> Bloqueado
                      </span>
                    ) : facturasVencidas > 0 ? (
                      <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0" title="Tiene facturas con plazo vencido en CxC">
                        <Clock className="w-3 h-3 text-amber-700" /> Mora ({facturasVencidas})
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Al Corriente
                      </span>
                    )}
                  </div>

                  {/* Barra de progreso de cupo crediticio */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Uso de Línea ({cli.diasCredito}d plazo)</span>
                      <span className={`font-bold font-mono ${
                        porcentajeUso >= 90 ? 'text-rose-700' : porcentajeUso >= 70 ? 'text-amber-700' : 'text-slate-700'
                      }`}>
                        {porcentajeUso.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          porcentajeUso >= 90
                            ? 'bg-rose-500'
                            : porcentajeUso >= 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${porcentajeUso}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Grid de 3 cifras contables */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-xs text-slate-500 block uppercase font-medium">Límite</span>
                      <span className="text-xs font-bold font-mono text-slate-800 mt-0.5 block truncate">
                        ${limite.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block uppercase font-medium">Adeudado</span>
                      <span className="text-xs font-bold font-mono text-slate-900 mt-0.5 block truncate">
                        ${saldo.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block uppercase font-medium">Disponible</span>
                      <span className="text-xs font-bold font-mono text-emerald-600 mt-0.5 block truncate">
                        ${disponible.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Contacto rápido */}
                  {(cli.telefono || cli.email) && (
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 truncate">
                      {cli.telefono && (
                        <div className="flex items-center gap-1 truncate">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{cli.telefono}</span>
                        </div>
                      )}
                      {cli.email && (
                        <div className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{cli.email}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedCliente(cli);
                      setValidationResult(null);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Validar Venta
                  </button>

                  <a
                    href={`/api/clientes/${cli.id}/estado-cuenta/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                    title="Descargar Estado de Cuenta PDF"
                  >
                    <FileDown className="w-4 h-4" />
                  </a>

                  {!isReadOnly && (
                    <button
                      onClick={() => openEditModal(cli)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Editar política de crédito y contacto"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA LEDGER CONTABLE DENSA */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th 
                    onClick={() => handleSort('codigo')} 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Código & Cliente</span>
                      {sortField === 'codigo' ? (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                    </div>
                  </th>
                  <th className="py-3 px-4">RFC Fiscal</th>
                  <th 
                    onClick={() => handleSort('diasCredito')} 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Plazo</span>
                      {sortField === 'diasCredito' ? (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('limiteCredito')} 
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Límite Crédito</span>
                      {sortField === 'limiteCredito' ? (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('saldoActual')} 
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Saldo Actual</span>
                      {sortField === 'saldoActual' ? (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('disponible')} 
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Disponible</span>
                      {sortField === 'disponible' ? (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                    </div>
                  </th>
                  <th className="py-3 px-4 w-44">Salud de Cupo</th>
                  <th className="py-3 px-4 text-center">Estatus</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClientes.map((cli) => {
                  const saldo = cli.saldoActual || 0;
                  const limite = cli.limiteCredito || 0;
                  const disponible = Math.max(0, limite - saldo);
                  const porcentajeUso = limite > 0 ? Math.min(100, (saldo / limite) * 100) : 0;
                  const facturasVencidas = countFacturasVencidas(cli);
                  const isBlocked = cli.estadoCredito === 'BLOQUEADO' || cli.estadoCredito === 'SUSPENDIDO';

                  return (
                    <tr key={cli.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{cli.razonSocial}</div>
                        <span className="text-xs font-mono text-slate-500">{cli.codigo}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-slate-700 font-semibold">
                        {cli.rfc || 'Sin RFC'}
                      </td>

                      <td className="py-3 px-4 text-xs font-semibold text-slate-700 text-center">
                        {cli.diasCredito} días
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        ${limite.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ${saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        ${disponible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                porcentajeUso >= 90
                                  ? 'bg-rose-500'
                                  : porcentajeUso >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${porcentajeUso}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-right font-mono font-semibold text-slate-500">
                            {porcentajeUso.toFixed(1)}% utilizado
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isBlocked ? (
                          <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" /> Bloqueado
                          </span>
                        ) : facturasVencidas > 0 ? (
                          <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center justify-center gap-1" title="Tiene facturas con plazo vencido en CxC">
                            <Clock className="w-3 h-3 text-amber-700" /> En Mora ({facturasVencidas})
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Al Corriente
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedCliente(cli);
                              setValidationResult(null);
                            }}
                            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Validar
                          </button>
                          <a
                            href={`/api/clientes/${cli.id}/estado-cuenta/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="Descargar Estado de Cuenta PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </a>
                          {!isReadOnly && (
                            <button
                              onClick={() => openEditModal(cli)}
                              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              title="Editar cliente y política"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL ALTA DE NUEVO CLIENTE (The Sovereign Lift) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Alta de Nuevo Cliente</h3>
                  <p className="text-xs text-slate-500">Expediente fiscal y cupo de crédito asignado</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCliente} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre o Razón Social *
                </label>
                <input
                  type="text"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Ej. Comercializadora del Norte S.A. de C.V."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RFC Fiscal
                  </label>
                  <input
                    type="text"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    maxLength={13}
                    placeholder="XAXX010101000"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    placeholder="81 8000 0000"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo para Facturación
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="facturacion@empresa.com"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código Postal (SAT)
                  </label>
                  <input
                    type="text"
                    value={codigoPostal}
                    onChange={(e) => setCodigoPostal(e.target.value)}
                    maxLength={5}
                    placeholder="64000"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección Fiscal
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle, Número, Colonia, Ciudad"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Política Crediticia Institucional
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Límite de Crédito ($ MXN)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={limiteCredito}
                      onChange={(e) => setLimiteCredito(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold font-mono text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Días de Crédito (Plazo)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={diasCredito}
                      onChange={(e) => setDiasCredito(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold font-mono text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95"
                >
                  {saving ? 'Registrando...' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CLIENTE Y LÍMITES DE CRÉDITO (The Sovereign Lift) */}
      {editingCliente && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Editar Política de Crédito & Cliente</h3>
                  <p className="text-xs text-slate-500 font-mono">{editingCliente.codigo} • {editingCliente.razonSocial}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCliente(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCliente} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Razón Social *
                </label>
                <input
                  type="text"
                  value={editRazonSocial}
                  onChange={(e) => setEditRazonSocial(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RFC
                  </label>
                  <input
                    type="text"
                    value={editRfc}
                    onChange={(e) => setEditRfc(e.target.value.toUpperCase())}
                    maxLength={13}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={editTelefono}
                    onChange={(e) => setEditTelefono(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  Ajuste de Línea de Crédito & Estado Contable
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Límite ($ MXN)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={editLimiteCredito}
                      onChange={(e) => setEditLimiteCredito(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold font-mono text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Plazo (Días)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={editDiasCredito}
                      onChange={(e) => setEditDiasCredito(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold font-mono text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Estado de Crédito
                    </label>
                    <select
                      value={editEstadoCredito}
                      onChange={(e) => setEditEstadoCredito(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-semibold bg-white text-slate-900"
                    >
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="BLOQUEADO">BLOQUEADO</option>
                      <option value="EN_REVISION">EN REVISIÓN</option>
                      <option value="SUSPENDIDO">SUSPENDIDO</option>
                    </select>
                  </div>
                </div>

                <p className="text-xs text-slate-500 italic">
                  * Cualquier ajuste a este límite o estado se registrará automáticamente con sello criptográfico en la bitácora de auditoría.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCliente(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95"
                >
                  {savingEdit ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SIMULADOR DE VALIDACIÓN DE CRÉDITO (The Sovereign Lift) */}
      {selectedCliente && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Validar Venta a Crédito</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedCliente.codigo} • {selectedCliente.razonSocial}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCliente(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Diagnóstico de crédito */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Límite Aprobado:</span>
                <span className="font-bold font-mono text-slate-900 text-sm">
                  ${selectedCliente.limiteCredito.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Saldo Actual Adeudado:</span>
                <span className="font-bold font-mono text-slate-900 text-sm">
                  ${selectedCliente.saldoActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                <span className="text-slate-600 font-medium">Crédito Disponible:</span>
                <span className="font-bold font-mono text-emerald-600 text-sm">
                  ${Math.max(0, selectedCliente.limiteCredito - selectedCliente.saldoActual).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monto de la Venta a Simular ($ MXN)
              </label>
              <input
                type="number"
                min="1"
                step="500"
                value={cargoMonto}
                onChange={(e) => setCargoMonto(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                El motor transaccional simula la adición a CxC evaluando si excede el cupo o si la empresa tiene política restrictiva activa.
              </p>
            </div>

            {validationResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-medium ${
                  validationResult.error
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {validationResult.error ? (
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{validationResult.message}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{validationResult.message}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <a
                href={`/api/clientes/${selectedCliente.id}/estado-cuenta/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" /> Estado de Cuenta PDF
              </a>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCliente(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSimularCargo}
                  disabled={validating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95"
                >
                  {validating ? 'Validando...' : 'Ejecutar Validación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
