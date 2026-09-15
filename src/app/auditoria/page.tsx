'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  ShieldAlert,
  FileSpreadsheet, 
  Calendar,
  Eye,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Lock,
  Fingerprint,
  Clock,
  X,
  Building2
} from 'lucide-react';

interface AuditRecord {
  id: string;
  tenantId: string;
  usuarioId: string;
  usuarioNombre: string;
  modulo: string;
  accion: string;
  nivelRiesgo: 'NORMAL' | 'ADVERTENCIA' | 'CRITICO';
  detalles: string;
  hashPrevio?: string | null;
  hashEvento?: string | null;
  ipAddress?: string | null;
  metadataJson?: string | null;
  fecha: string;
}

interface IntegrityReport {
  isIntact: boolean;
  totalChecked: number;
  compromisedCount: number;
  compromisedRecordId: string | null;
  latestHash: string;
  verifiedAt: string;
}

export default function AuditoriaPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [integrity, setIntegrity] = useState<IntegrityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [search, setSearch] = useState('');
  const [moduloFiltro, setModuloFiltro] = useState('TODOS');
  const [riesgoFiltro, setRiesgoFiltro] = useState<'TODOS' | 'CRITICO' | 'ADVERTENCIA' | 'NORMAL'>('TODOS');
  const [periodoFiltro, setPeriodoFiltro] = useState<'TODOS' | 'HOY' | '7_DIAS' | '30_DIAS'>('TODOS');
  const [viewMode, setViewMode] = useState<'TIMELINE' | 'LEDGER'>('TIMELINE');
  const [sortField, setSortField] = useState<'fecha' | 'modulo' | 'riesgo'>('fecha');
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auditoria');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data);
        } else if (data.logs) {
          setLogs(data.logs);
          if (data.integrity) {
            setIntegrity(data.integrity);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching auditoria:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/auditoria');
      if (res.ok) {
        const data = await res.json();
        if (data.integrity) {
          setIntegrity(data.integrity);
        }
        if (data.logs) {
          setLogs(data.logs);
        }
      }
    } catch (e) {
      console.error('Error verificando cadena criptográfica:', e);
    } finally {
      setTimeout(() => setVerifying(false), 400);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Módulos dinámicos para el filtro
  const modulosDisponibles = useMemo(() => {
    return ['TODOS', ...Array.from(new Set(logs.map((l) => l.modulo)))];
  }, [logs]);

  // Filtrado y Ordenamiento
  const filteredAndSortedLogs = useMemo(() => {
    const now = new Date().getTime();

    let result = logs.filter((l) => {
      const matchSearch =
        l.detalles.toLowerCase().includes(search.toLowerCase()) ||
        l.usuarioNombre.toLowerCase().includes(search.toLowerCase()) ||
        l.modulo.toLowerCase().includes(search.toLowerCase()) ||
        l.accion.toLowerCase().includes(search.toLowerCase()) ||
        (l.hashEvento && l.hashEvento.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      if (moduloFiltro !== 'TODOS' && l.modulo !== moduloFiltro) return false;
      if (riesgoFiltro !== 'TODOS' && (l.nivelRiesgo || 'NORMAL') !== riesgoFiltro) return false;

      if (periodoFiltro !== 'TODOS') {
        const itemTime = new Date(l.fecha).getTime();
        const diffDays = (now - itemTime) / (1000 * 3600 * 24);
        if (periodoFiltro === 'HOY' && diffDays > 1) return false;
        if (periodoFiltro === '7_DIAS' && diffDays > 7) return false;
        if (periodoFiltro === '30_DIAS' && diffDays > 30) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortField === 'fecha') {
        const timeA = new Date(a.fecha).getTime();
        const timeB = new Date(b.fecha).getTime();
        return sortAsc ? timeA - timeB : timeB - timeA;
      }
      if (sortField === 'modulo') {
        return sortAsc 
          ? a.modulo.localeCompare(b.modulo)
          : b.modulo.localeCompare(a.modulo);
      }
      if (sortField === 'riesgo') {
        const weight: Record<string, number> = { CRITICO: 3, ADVERTENCIA: 2, NORMAL: 1 };
        const weightA = weight[a.nivelRiesgo || 'NORMAL'] || 1;
        const weightB = weight[b.nivelRiesgo || 'NORMAL'] || 1;
        return sortAsc ? weightA - weightB : weightB - weightA;
      }
      return 0;
    });

    return result;
  }, [logs, search, moduloFiltro, riesgoFiltro, periodoFiltro, sortField, sortAsc]);

  // Métricas calculadas para los KPIs
  const stats = useMemo(() => {
    const total = logs.length;
    const criticos = logs.filter((l) => (l.nivelRiesgo || 'NORMAL') === 'CRITICO').length;
    const advertencias = logs.filter((l) => (l.nivelRiesgo || 'NORMAL') === 'ADVERTENCIA').length;
    const normales = logs.filter((l) => (l.nivelRiesgo || 'NORMAL') === 'NORMAL').length;
    const operadores = new Set(logs.map((l) => l.usuarioNombre)).size;
    return { total, criticos, advertencias, normales, operadores };
  }, [logs]);

  // Agrupación de Timeline por Fechas
  const timelineGroups = useMemo(() => {
    const groups: { [dateStr: string]: AuditRecord[] } = {};
    filteredAndSortedLogs.forEach((item) => {
      const dateKey = new Date(item.fecha).toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  }, [filteredAndSortedLogs]);

  // Exportar Certificación Forense en CSV
  const handleExportAuditCSV = () => {
    if (filteredAndSortedLogs.length === 0) return;
    
    const headers = [
      'ID_Registro',
      'Fecha_Hora',
      'Operador',
      'Modulo',
      'Accion',
      'Nivel_Riesgo',
      'Detalles',
      'Hash_Evento_SHA256',
      'Hash_Previo_SHA256'
    ];

    const rows = filteredAndSortedLogs.map((l) => {
      const fechaStr = new Date(l.fecha).toLocaleString('es-MX').replace(',', '');
      return [
        `"${l.id}"`,
        `"${fechaStr}"`,
        `"${l.usuarioNombre}"`,
        `"${l.modulo}"`,
        `"${l.accion}"`,
        `"${l.nivelRiesgo || 'NORMAL'}"`,
        `"${(l.detalles || '').replace(/"/g, '""')}"`,
        `"${l.hashEvento || 'N/A'}"`,
        `"${l.hashPrevio || 'GENESIS'}"`
      ];
    });

    const csvContent = 
      'data:text/csv;charset=utf-8,\uFEFF' +
      `# EXPEDIENTE FORENSE DE AUDITORÍA TRANSACCIONAL - CONTROL ERP\n` +
      `# FECHA DE CORTE: ${new Date().toISOString()}\n` +
      `# ESTADO CRIPTOGRÁFICO: ${integrity?.isIntact ? 'CADENA_INTEGRA_VERIFICADA' : 'CADENA_CON_ANOMALIAS'}\n` +
      `# ÚLTIMO HASH SELLO: ${integrity?.latestHash || 'N/A'}\n\n` +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Expediente_Forense_Auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función de renderizado de badges de severidad
  const renderRiskBadge = (risk: 'NORMAL' | 'ADVERTENCIA' | 'CRITICO') => {
    switch (risk) {
      case 'CRITICO':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Crítico
          </span>
        );
      case 'ADVERTENCIA':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2 py-0.5 rounded-full">
            <ShieldAlert className="w-3 h-3 text-amber-600" /> Advertencia
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Regular
          </span>
        );
    }
  };

  // Verificación estricta de permisos de acceso
  if (user?.rol !== 'SUPERADMIN' && user?.rol !== 'ADMIN' && user?.rol !== 'AUDITOR') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-md max-w-md mx-auto mt-12">
        <ShieldAlert className="w-12 h-12 text-purple-600 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">Acceso Restringido</h3>
        <p className="text-sm text-slate-500 mt-2">
          La bitácora de auditoría y análisis forense está reservada exclusivamente para Auditores, Administradores y Superadmin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Cabecera Ejecutiva Criptográfica - The Fintech Ledger */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-purple-400" /> Trazabilidad & Forense Contable
            </span>
            <span className="text-xs text-slate-400">
              Protocolo Inmutable SHA-256 • Conforme a Normativa SAT
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <History className="w-7 h-7 text-purple-400" />
            Bitácora de Auditoría & Trazabilidad Transaccional
          </h1>
          <p className="text-slate-400 text-sm max-w-3xl leading-relaxed">
            Supervisa en tiempo real el registro criptográfico inmutable de operaciones críticas: modificaciones de crédito, cancelaciones de ventas, ajustes de existencias y movimientos bancarios.
          </p>
        </div>

        {/* Panel Criptográfico de Integridad */}
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              integrity?.isIntact !== false 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Cadena Criptográfica
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  integrity?.isIntact !== false 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {integrity?.isIntact !== false ? '100% Íntegra' : 'Comprometida'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Sello: <span className="text-purple-300">{integrity?.latestHash ? `${integrity.latestHash.slice(0, 16)}...` : 'Verificando...'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
            <button
              onClick={handleVerifyChain}
              disabled={verifying}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all border border-slate-700 flex items-center gap-1.5 text-xs font-semibold"
              title="Re-calcular y auditar matemáticamente todos los bloques de la bitácora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin text-purple-400' : ''}`} />
              <span>Verificar</span>
            </button>

            <button
              onClick={handleExportAuditCSV}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all font-semibold text-xs flex items-center gap-1.5 shadow-sm"
              title="Exportar expediente forense oficial en CSV con firma criptográfica"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas Flotantes KPI de Auditoría */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Eventos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Registros</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-1">Transacciones auditadas</p>
        </div>

        {/* Eventos Críticos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Eventos Críticos</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-700 mt-2">{stats.criticos}</p>
          <p className="text-xs text-slate-500 mt-1">Cancelaciones o ajustes negativos</p>
        </div>

        {/* Advertencias */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Advertencias</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-2">{stats.advertencias}</p>
          <p className="text-xs text-slate-500 mt-1">Cambios de crédito y precios</p>
        </div>

        {/* Operadores Responsables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Operadores Activos</span>
            <Lock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{stats.operadores}</p>
          <p className="text-xs text-slate-500 mt-1">Usuarios ejecutores registrados</p>
        </div>
      </div>

      {/* 3. Barra Unificada de Filtros y Conmutador de Vistas */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Buscador Multi-campo */}
        <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por operador, folio, cliente, detalle o hash SHA-256..."
            className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="p-0.5 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros Selectivos y Conmutador */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Módulo */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Módulo:</span>
            <select
              value={moduloFiltro}
              onChange={(e) => setModuloFiltro(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
            >
              {modulosDisponibles.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Severidad / Nivel de Riesgo */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Riesgo:</span>
            <select
              value={riesgoFiltro}
              onChange={(e) => setRiesgoFiltro(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="TODOS">Todos</option>
              <option value="CRITICO">Solo Críticos</option>
              <option value="ADVERTENCIA">Advertencias</option>
              <option value="NORMAL">Regulares</option>
            </select>
          </div>

          {/* Rango Temporal */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={periodoFiltro}
              onChange={(e) => setPeriodoFiltro(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="TODOS">Histórico Completo</option>
              <option value="HOY">Hoy</option>
              <option value="7_DIAS">Últimos 7 días</option>
              <option value="30_DIAS">Últimos 30 días</option>
            </select>
          </div>

          {/* Conmutador de Vista (Timeline vs Ledger) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('TIMELINE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'TIMELINE' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('LEDGER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'LEDGER' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Contenido Principal */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Verificando y cargando bitácora criptográfica...</p>
          <p className="text-xs text-slate-400 mt-1">Calculando hashes SHA-256 y evaluando encadenamiento transaccional.</p>
        </div>
      ) : filteredAndSortedLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm max-w-md mx-auto">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">Sin Registros Coincidentes</h3>
          <p className="text-xs text-slate-500 mt-1">
            No se encontraron eventos de auditoría con los filtros o términos de búsqueda seleccionados.
          </p>
          <button
            onClick={() => { setSearch(''); setModuloFiltro('TODOS'); setRiesgoFiltro('TODOS'); setPeriodoFiltro('TODOS'); }}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            Limpiar Filtros
          </button>
        </div>
      ) : viewMode === 'TIMELINE' ? (
        /* VISTA 1: FEED TIMELINE FORENSE */
        <div className="space-y-6">
          {Object.entries(timelineGroups).map(([dateLabel, items]) => (
            <div key={dateLabel} className="space-y-3">
              {/* Separador de Fecha */}
              <div className="flex items-center gap-3">
                <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                  {dateLabel}
                </span>
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-xs font-mono text-slate-400">{items.length} eventos</span>
              </div>

              {/* Lista de Tarjetas del Timeline */}
              <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {items.map((log) => {
                  const risk = log.nivelRiesgo || 'NORMAL';
                  const isCritico = risk === 'CRITICO';
                  const isAdvertencia = risk === 'ADVERTENCIA';

                  return (
                    <div
                      key={log.id}
                      className={`relative bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all ${
                        isCritico
                          ? 'border-rose-200 bg-rose-50/20'
                          : isAdvertencia
                          ? 'border-amber-200 bg-amber-50/20'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Nodo del Timeline */}
                      <span className={`absolute -left-6 top-5 w-3 h-3 rounded-full border-2 border-white shadow-xs ${
                        isCritico ? 'bg-rose-600' : isAdvertencia ? 'bg-amber-500' : 'bg-blue-600'
                      }`} />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500">
                            {new Date(log.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{log.usuarioNombre}</span>
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                            {log.modulo}
                          </span>
                          <span className="font-mono text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold border border-purple-200">
                            {log.accion}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {renderRiskBadge(risk)}
                          <button
                            onClick={() => setSelectedRecord(log)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                            title="Ver peritaje forense detallado"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Detalles del Evento */}
                      <p className="text-slate-800 text-xs mt-2.5 leading-relaxed font-medium">
                        {log.detalles}
                      </p>

                      {/* Pie de Tarjeta con Sello Hash */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-400 font-mono">
                          <Lock className="w-3 h-3 text-purple-600" />
                          <span>Hash:</span>
                          <span className="text-slate-600 font-semibold">
                            {log.hashEvento ? `${log.hashEvento.slice(0, 20)}...` : 'Génesis sellado'}
                          </span>
                          {log.hashEvento && (
                            <button
                              onClick={() => handleCopyHash(log.hashEvento!)}
                              className="text-slate-400 hover:text-purple-600 p-0.5 rounded transition-all"
                              title="Copiar hash SHA-256 completo"
                            >
                              {copiedHash === log.hashEvento ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedRecord(log)}
                          className="text-purple-700 hover:text-purple-900 font-semibold hover:underline"
                        >
                          Inspeccionar Bloque &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VISTA 2: TABLA CONTABLE DENSA (LEDGER VIEW) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => { setSortField('fecha'); setSortAsc(!sortAsc); }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Fecha & Hora</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Sello Hash SHA-256</th>
                  <th className="py-3 px-4">Operador</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => { setSortField('modulo'); setSortAsc(!sortAsc); }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Módulo</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => { setSortField('riesgo'); setSortAsc(!sortAsc); }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Riesgo</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Acción</th>
                  <th className="py-3 px-4">Detalle del Evento</th>
                  <th className="py-3 px-4 text-right">Peritaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedLogs.map((log) => {
                  const risk = log.nivelRiesgo || 'NORMAL';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Fecha y Hora */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono">
                        {new Date(log.fecha).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>

                      {/* Sello Hash */}
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{log.hashEvento ? `${log.hashEvento.slice(0, 10)}...` : 'Sellado'}</span>
                          {log.hashEvento && (
                            <button
                              onClick={() => handleCopyHash(log.hashEvento!)}
                              className="text-slate-400 hover:text-purple-600 p-0.5 rounded transition-all"
                              title="Copiar Hash"
                            >
                              {copiedHash === log.hashEvento ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Operador */}
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {log.usuarioNombre}
                      </td>

                      {/* Módulo */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {log.modulo}
                      </td>

                      {/* Nivel de Riesgo */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderRiskBadge(risk)}
                      </td>

                      {/* Acción */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-purple-700 font-semibold">
                        {log.accion}
                      </td>

                      {/* Detalle */}
                      <td className="py-3 px-4 text-slate-700 max-w-md font-medium truncate" title={log.detalles}>
                        {log.detalles}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRecord(log)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-all"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modal de Inspección Pericial Criptográfica (The Sovereign Lift) */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header del Modal */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Inspección Forense de Transacción</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ID Registro: {selectedRecord.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Pericial */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Severidad y Resumen */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evaluación de Riesgo</span>
                  <div className="mt-1">{renderRiskBadge(selectedRecord.nivelRiesgo || 'NORMAL')}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp Certificado</span>
                  <p className="font-mono text-xs font-bold text-slate-800 mt-1">
                    {new Date(selectedRecord.fecha).toLocaleString('es-MX', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Ficha del Operador y Módulo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Operador Responsable</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedRecord.usuarioNombre}</p>
                  <p className="text-xs font-mono text-slate-400">UID: {selectedRecord.usuarioId}</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Módulo & Acción</span>
                  <p className="font-bold text-blue-700 text-sm">{selectedRecord.modulo}</p>
                  <p className="text-xs font-mono font-bold text-purple-700 uppercase">{selectedRecord.accion}</p>
                </div>
              </div>

              {/* Detalle Descriptivo de la Transacción */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Detalles de la Operación</span>
                <p className="text-slate-800 text-xs font-medium leading-relaxed">
                  {selectedRecord.detalles}
                </p>
              </div>

              {/* Enlace de Cadena Criptográfica (SHA-256) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-white space-y-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Sellado Criptográfico Inmutable</span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 block text-xs">Hash Evento (SHA-256):</span>
                    <div className="flex items-center justify-between gap-2 mt-0.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-purple-300 break-all">{selectedRecord.hashEvento || 'Sello génesis'}</span>
                      {selectedRecord.hashEvento && (
                        <button
                          onClick={() => handleCopyHash(selectedRecord.hashEvento!)}
                          className="p-1 text-slate-400 hover:text-white shrink-0"
                          title="Copiar Hash"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-xs">Hash Bloque Previo:</span>
                    <div className="flex items-center justify-between gap-2 mt-0.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 break-all">{selectedRecord.hashPrevio || 'GENESIS_ANCHOR'}</span>
                      {selectedRecord.hashPrevio && (
                        <button
                          onClick={() => handleCopyHash(selectedRecord.hashPrevio!)}
                          className="p-1 text-slate-400 hover:text-white shrink-0"
                          title="Copiar Hash Previo"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  if (selectedRecord.hashEvento) handleCopyHash(selectedRecord.hashEvento);
                }}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Sello Probatorio</span>
              </button>

              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
              >
                Cerrar Peritaje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
