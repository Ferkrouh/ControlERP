'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Building2, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Clock, 
  Edit3, 
  Trash2, 
  PauseCircle, 
  PlayCircle, 
  Calendar, 
  Users, 
  Boxes, 
  Search, 
  RefreshCw, 
  KeyRound, 
  Sliders,
  DollarSign,
  ShoppingCart,
  Receipt,
  Truck,
  Landmark,
  Factory,
  Kanban,
  FileText,
  Copy,
  Download,
  LayoutGrid,
  Table as TableIcon,
  HardDrive,
  AlertTriangle,
  History,
  ArrowUpDown,
  Check,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function NegociosPage() {
  const { user, switchUser } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'ACTIVOS' | 'POR_VENCER' | 'MOROSOS' | 'PAUSADOS'>('TODOS');
  const [viewMode, setViewMode] = useState<'GRID' | 'LEDGER'>('GRID');
  
  // Ordenamiento de la tabla
  const [sortField, setSortField] = useState<'nombre' | 'vencimiento' | 'plan' | 'usuarios'>('vencimiento');
  const [sortAsc, setSortAsc] = useState(true);

  // Reloj de tiempo real
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Modales
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [showModalRenovar, setShowModalRenovar] = useState(false);
  const [showModalClonar, setShowModalClonar] = useState(false);

  // Tenant seleccionado
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // Formulario Crear / Editar / Clonar
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'SUSCRIPCION' | 'MODULOS' | 'AUDITORIA'>('GENERAL');
  const [formData, setFormData] = useState({
    nombreComercial: '',
    razonSocial: '',
    identificacionFiscal: '',
    regimenFiscal: '601',
    codigoPostal: '',
    giro: 'DISTRIBUCION_MAYOREO',
    moneda: 'MXN',
    colorPrimario: '#1e40af',
    textoEncabezadoDoc: '',
    diasGraciaCredito: 0,
    alertaVencimientoDias: 5,
    politicaBloqueoCredito: 'ESTRICTO',
    
    // Suscripción SaaS
    planSuscripcion: 'PROFESIONAL',
    fechaInicioPlan: new Date().toISOString().split('T')[0],
    fechaVencimientoPlan: '',
    diasGraciaSuscripcion: 3,
    bloqueadoPorSuscripcion: false,
    limiteUsuarios: 10,
    limiteAlmacenes: 5,
    notasSuperadmin: '',

    // Módulos
    moduloMultiAlmacen: true,
    moduloTraspasos: true,
    moduloCredito: true,
    moduloCxC: true,
    moduloProveedores: true,
    moduloCxP: true,
    moduloReportes: true,
    moduloFacturacionSAT: true,
    moduloTesoreria: true,
    moduloManufactura: true,
    moduloCrm: true,

    // Admin inicial (solo creación)
    adminNombre: '',
    adminEmail: '',
    adminPassword: 'admin123'
  });

  // Confirmación de eliminación
  const [confirmName, setConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tenants');
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Helper de cálculo de tiempo y estado de suscripción (Modo Flexible)
  const getSubscriptionStatus = (t: any) => {
    if (!t.activo) {
      return { 
        status: 'PAUSADO', 
        label: 'Pausado', 
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-300', 
        isExpired: false,
        isBlocked: true,
        daysDiff: 0,
        text: 'Servicio suspendido manualmente' 
      };
    }

    if (t.bloqueadoPorSuscripcion) {
      return { 
        status: 'MOROSOS', 
        label: 'Bloqueado (Corte)', 
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-300', 
        isExpired: true,
        isBlocked: true,
        daysDiff: -1,
        text: 'Acceso bloqueado por Superadmin' 
      };
    }

    if (!t.fechaVencimientoPlan) {
      return { 
        status: 'ACTIVO', 
        label: 'Permanente', 
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-300', 
        isExpired: false,
        isBlocked: false,
        daysDiff: 9999,
        text: 'Sin fecha de vencimiento configurada' 
      };
    }

    const fechaVenc = new Date(t.fechaVencimientoPlan).getTime();
    const diffMs = fechaVenc - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diasGracia = t.diasGraciaSuscripcion || 0;

    if (diffDays < 0) {
      const vencidoHace = Math.abs(diffDays);
      const enGracia = vencidoHace <= diasGracia;
      return {
        status: enGracia ? 'POR_VENCER' : 'MOROSOS',
        label: enGracia ? `En Gracia (+${vencidoHace}d)` : `Moroso (+${vencidoHace}d)`,
        badgeBg: enGracia ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-rose-100 text-rose-800 border-rose-300',
        isExpired: true,
        isBlocked: false, // Modo Flexible: no bloquea automáticamente, marca como moroso
        daysDiff: diffDays,
        text: enGracia 
          ? `Venció hace ${vencidoHace} días. En gracia (+${diasGracia}d).` 
          : `Venció hace ${vencidoHace} días. Pendiente de pago/renovación.`
      };
    }

    if (diffDays <= 7) {
      return {
        status: 'POR_VENCER',
        label: diffDays === 0 ? 'Vence Hoy' : `Por Vencer (${diffDays}d)`,
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
        isExpired: false,
        isBlocked: false,
        daysDiff: diffDays,
        text: `Quedan ${diffDays} días para renovar el plan`
      };
    }

    return {
      status: 'ACTIVO',
      label: `Vigente (${diffDays}d)`,
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      isExpired: false,
      isBlocked: false,
      daysDiff: diffDays,
      text: `Vence el ${new Date(t.fechaVencimientoPlan).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`
    };
  };

  // Estimador de tamaño de base de datos / almacenamiento por negocio
  const getTenantStorageEstimate = (t: any) => {
    const totalRecords = 
      (t._count?.ventas || 0) * 1.5 + 
      (t._count?.compras || 0) * 1.5 + 
      (t._count?.productos || 0) * 0.8 + 
      (t._count?.clientes || 0) * 0.5 + 
      (t._count?.traspasos || 0) * 0.5 + 20;
    
    const sizeMB = Math.max(0.2, Math.round(totalRecords * 0.04 * 10) / 10);
    return `${sizeMB} MB`;
  };

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    const hoy = new Date();
    const vencimiento30 = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    setFormData({
      nombreComercial: '',
      razonSocial: '',
      identificacionFiscal: '',
      regimenFiscal: '601',
      codigoPostal: '',
      giro: 'DISTRIBUCION_MAYOREO',
      moneda: 'MXN',
      colorPrimario: '#1e40af',
      textoEncabezadoDoc: '',
      diasGraciaCredito: 0,
      alertaVencimientoDias: 5,
      politicaBloqueoCredito: 'ESTRICTO',
      planSuscripcion: 'PROFESIONAL',
      fechaInicioPlan: hoy.toISOString().split('T')[0],
      fechaVencimientoPlan: vencimiento30,
      diasGraciaSuscripcion: 3,
      bloqueadoPorSuscripcion: false,
      limiteUsuarios: 10,
      limiteAlmacenes: 5,
      notasSuperadmin: '',
      moduloMultiAlmacen: true,
      moduloTraspasos: true,
      moduloCredito: true,
      moduloCxC: true,
      moduloProveedores: true,
      moduloCxP: true,
      moduloReportes: true,
      moduloFacturacionSAT: true,
      moduloTesoreria: true,
      moduloManufactura: true,
      moduloCrm: true,
      adminNombre: 'Administrador General',
      adminEmail: '',
      adminPassword: 'admin123'
    });
    setActiveTab('GENERAL');
    setShowModalCrear(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (tenant: any) => {
    setSelectedTenant(tenant);
    setFormData({
      nombreComercial: tenant.nombreComercial || '',
      razonSocial: tenant.razonSocial || '',
      identificacionFiscal: tenant.identificacionFiscal || '',
      regimenFiscal: tenant.regimenFiscal || '601',
      codigoPostal: tenant.codigoPostal || '',
      giro: tenant.giro || 'DISTRIBUCION_MAYOREO',
      moneda: tenant.moneda || 'MXN',
      colorPrimario: tenant.colorPrimario || '#1e40af',
      textoEncabezadoDoc: tenant.textoEncabezadoDoc || '',
      diasGraciaCredito: tenant.diasGraciaCredito ?? 0,
      alertaVencimientoDias: tenant.alertaVencimientoDias ?? 5,
      politicaBloqueoCredito: tenant.politicaBloqueoCredito || 'ESTRICTO',
      planSuscripcion: tenant.planSuscripcion || 'PROFESIONAL',
      fechaInicioPlan: tenant.fechaInicioPlan ? new Date(tenant.fechaInicioPlan).toISOString().split('T')[0] : '',
      fechaVencimientoPlan: tenant.fechaVencimientoPlan ? new Date(tenant.fechaVencimientoPlan).toISOString().split('T')[0] : '',
      diasGraciaSuscripcion: tenant.diasGraciaSuscripcion ?? 3,
      bloqueadoPorSuscripcion: tenant.bloqueadoPorSuscripcion ?? false,
      limiteUsuarios: tenant.limiteUsuarios ?? 10,
      limiteAlmacenes: tenant.limiteAlmacenes ?? 5,
      notasSuperadmin: tenant.notasSuperadmin || '',
      moduloMultiAlmacen: tenant.moduloMultiAlmacen ?? true,
      moduloTraspasos: tenant.moduloTraspasos ?? true,
      moduloCredito: tenant.moduloCredito ?? true,
      moduloCxC: tenant.moduloCxC ?? true,
      moduloProveedores: tenant.moduloProveedores ?? true,
      moduloCxP: tenant.moduloCxP ?? true,
      moduloReportes: tenant.moduloReportes ?? true,
      moduloFacturacionSAT: tenant.moduloFacturacionSAT ?? false,
      moduloTesoreria: tenant.moduloTesoreria ?? true,
      moduloManufactura: tenant.moduloManufactura ?? true,
      moduloCrm: tenant.moduloCrm ?? true,
      adminNombre: '',
      adminEmail: '',
      adminPassword: ''
    });
    setActiveTab('GENERAL');
    setShowModalEditar(true);
  };

  // Abrir Modal de Clonación
  const handleOpenClone = (tenant: any) => {
    setSelectedTenant(tenant);
    const hoy = new Date();
    const vencimiento30 = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setFormData({
      nombreComercial: `${tenant.nombreComercial} (Copia)`,
      razonSocial: `${tenant.razonSocial || tenant.nombreComercial} (Sucursal 2)`,
      identificacionFiscal: '',
      regimenFiscal: tenant.regimenFiscal || '601',
      codigoPostal: tenant.codigoPostal || '',
      giro: tenant.giro || 'DISTRIBUCION_MAYOREO',
      moneda: tenant.moneda || 'MXN',
      colorPrimario: tenant.colorPrimario || '#1e40af',
      textoEncabezadoDoc: tenant.textoEncabezadoDoc || '',
      diasGraciaCredito: tenant.diasGraciaCredito ?? 0,
      alertaVencimientoDias: tenant.alertaVencimientoDias ?? 5,
      politicaBloqueoCredito: tenant.politicaBloqueoCredito || 'ESTRICTO',
      planSuscripcion: tenant.planSuscripcion || 'PROFESIONAL',
      fechaInicioPlan: hoy.toISOString().split('T')[0],
      fechaVencimientoPlan: vencimiento30,
      diasGraciaSuscripcion: tenant.diasGraciaSuscripcion ?? 3,
      bloqueadoPorSuscripcion: false,
      limiteUsuarios: tenant.limiteUsuarios ?? 10,
      limiteAlmacenes: tenant.limiteAlmacenes ?? 5,
      notasSuperadmin: `Clonado a partir de ${tenant.nombreComercial} (${tenant.identificacionFiscal})`,
      moduloMultiAlmacen: tenant.moduloMultiAlmacen ?? true,
      moduloTraspasos: tenant.moduloTraspasos ?? true,
      moduloCredito: tenant.moduloCredito ?? true,
      moduloCxC: tenant.moduloCxC ?? true,
      moduloProveedores: tenant.moduloProveedores ?? true,
      moduloCxP: tenant.moduloCxP ?? true,
      moduloReportes: tenant.moduloReportes ?? true,
      moduloFacturacionSAT: tenant.moduloFacturacionSAT ?? false,
      moduloTesoreria: tenant.moduloTesoreria ?? true,
      moduloManufactura: tenant.moduloManufactura ?? true,
      moduloCrm: tenant.moduloCrm ?? true,
      adminNombre: 'Administrador',
      adminEmail: '',
      adminPassword: 'admin123'
    });
    setShowModalClonar(true);
  };

  // Guardar Alta de Negocio (o clonación)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModalCrear(false);
        setShowModalClonar(false);
        fetchTenants();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al registrar el negocio');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Guardar Edición de Negocio
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setSaving(true);
    try {
      const { adminNombre, adminEmail, adminPassword, ...tenantUpdatePayload } = formData;
      const res = await fetch(`/api/tenants/${selectedTenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantUpdatePayload),
      });

      if (res.ok) {
        setShowModalEditar(false);
        setSelectedTenant(null);
        fetchTenants();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar el negocio');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Alternar Pausa/Reactivación Manual
  const handleToggleActivo = async (tenant: any) => {
    try {
      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !tenant.activo }),
      });
      if (res.ok) {
        fetchTenants();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Renovación Rápida (+días)
  const handleQuickExtend = async (tenant: any, daysToAdd: number) => {
    try {
      setSaving(true);
      const baseDate = tenant.fechaVencimientoPlan ? new Date(tenant.fechaVencimientoPlan) : new Date();
      const inicioCalculo = baseDate < now ? now : baseDate;
      const nuevaFecha = new Date(inicioCalculo.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaVencimientoPlan: nuevaFecha.toISOString(),
          bloqueadoPorSuscripcion: false,
          activo: true
        }),
      });

      if (res.ok) {
        setShowModalRenovar(false);
        fetchTenants();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Confirmar Eliminación
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setDeleteError('');

    if (confirmName.trim().toUpperCase() !== selectedTenant.identificacionFiscal.toUpperCase() && 
        confirmName.trim().toLowerCase() !== selectedTenant.nombreComercial.toLowerCase()) {
      setDeleteError(`Escribe exactamente "${selectedTenant.identificacionFiscal}" o "${selectedTenant.nombreComercial}" para confirmar.`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${selectedTenant.id}?force=true`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setShowModalEliminar(false);
        setSelectedTenant(null);
        setConfirmName('');
        fetchTenants();
      } else {
        const data = await res.json();
        setDeleteError(data.error || 'Error al eliminar el negocio.');
      }
    } catch (e) {
      console.error(e);
      setDeleteError('Error de red al conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  // Impersonar Admin del Negocio
  const handleImpersonate = async (tenant: any) => {
    const adminUser = tenant.usuarios?.find((u: any) => u.rol === 'ADMIN') || tenant.usuarios?.[0];
    if (!adminUser) {
      alert('Este negocio no tiene usuarios registrados para impersonar.');
      return;
    }

    if (confirm(`¿Deseas ingresar a la vista de "${tenant.nombreComercial}" como ${adminUser.nombre} (${adminUser.email})?`)) {
      await switchUser(adminUser.email);
      window.location.href = '/';
    }
  };

  // Exportar Reporte de Suscripciones (CSV)
  const handleExportReport = () => {
    const headers = ['Nombre Comercial', 'RFC', 'Plan', 'Estado', 'Vence', 'Usuarios Activos', 'Limite Usuarios', 'Almacenes', 'Almacenamiento Est.', 'Giro'];
    const rows = tenants.map((t) => {
      const sub = getSubscriptionStatus(t);
      const userCount = t._count?.usuarios || t.usuarios?.length || 0;
      const almCount = t._count?.almacenes || t.almacenes?.length || 0;
      const fechaVencStr = t.fechaVencimientoPlan ? new Date(t.fechaVencimientoPlan).toLocaleDateString('es-MX') : 'Permanente';
      return [
        `"${t.nombreComercial}"`,
        `"${t.identificacionFiscal}"`,
        `"${t.planSuscripcion || 'PROFESIONAL'}"`,
        `"${sub.label}"`,
        `"${fechaVencStr}"`,
        userCount,
        t.limiteUsuarios || 10,
        almCount,
        `"${getTenantStorageEstimate(t)}"`,
        `"${t.giro}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_suscripciones_controlerp_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado y Ordenamiento
  const filteredAndSortedTenants = useMemo(() => {
    let result = tenants.filter((t) => {
      const matchesSearch = 
        t.nombreComercial.toLowerCase().includes(search.toLowerCase()) ||
        t.identificacionFiscal.toLowerCase().includes(search.toLowerCase()) ||
        (t.razonSocial && t.razonSocial.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      const sub = getSubscriptionStatus(t);
      if (filtroEstado === 'TODOS') return true;
      if (filtroEstado === 'ACTIVOS') return sub.status === 'ACTIVO';
      if (filtroEstado === 'POR_VENCER') return sub.status === 'POR_VENCER';
      if (filtroEstado === 'MOROSOS') return sub.status === 'MOROSOS';
      if (filtroEstado === 'PAUSADOS') return sub.status === 'PAUSADO';
      return true;
    });

    result.sort((a, b) => {
      if (sortField === 'nombre') {
        return sortAsc 
          ? a.nombreComercial.localeCompare(b.nombreComercial)
          : b.nombreComercial.localeCompare(a.nombreComercial);
      }
      if (sortField === 'vencimiento') {
        const timeA = a.fechaVencimientoPlan ? new Date(a.fechaVencimientoPlan).getTime() : 9999999999999;
        const timeB = b.fechaVencimientoPlan ? new Date(b.fechaVencimientoPlan).getTime() : 9999999999999;
        return sortAsc ? timeA - timeB : timeB - timeA;
      }
      if (sortField === 'plan') {
        return sortAsc
          ? (a.planSuscripcion || '').localeCompare(b.planSuscripcion || '')
          : (b.planSuscripcion || '').localeCompare(a.planSuscripcion || '');
      }
      if (sortField === 'usuarios') {
        const countA = a._count?.usuarios || a.usuarios?.length || 0;
        const countB = b._count?.usuarios || b.usuarios?.length || 0;
        return sortAsc ? countA - countB : countB - countA;
      }
      return 0;
    });

    return result;
  }, [tenants, search, filtroEstado, sortField, sortAsc, now]);

  // Métricas Globales
  const totalTenants = tenants.length;
  const totalActivos = tenants.filter(t => t.activo && !t.bloqueadoPorSuscripcion).length;
  const totalPorVencer = tenants.filter(t => getSubscriptionStatus(t).status === 'POR_VENCER').length;
  const totalMorosos = tenants.filter(t => getSubscriptionStatus(t).status === 'MOROSOS').length;

  if (user?.rol !== 'SUPERADMIN') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-10 h-10 text-purple-600 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">Acceso Restringido al Superadmin</h3>
        <p className="text-sm text-slate-500 mt-1">
          La gestión de negocios, suscripciones y asignación de licencias está reservada exclusivamente para el Superadmin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera Ejecutiva - The Fintech Ledger */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-400" /> Mesa de Control Inquilinos SaaS
            </span>
            <span className="text-xs text-slate-400">
              Multi-tenant Aislado • Modo Flexible con Facturación Externa
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2 tracking-tight">Gestión de Negocios, Planes & Licencias</h2>
          <p className="text-slate-400 text-sm mt-1">
            Supervisa empresas clientes, vigencia de planes, estado de cobranza morosa y cuotas de consumo en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Exportar CSV */}
          <button
            onClick={handleExportReport}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            title="Exportar reporte de suscripciones y cobranza en CSV"
          >
            <Download className="w-4 h-4 text-purple-400" /> Exportar Reporte
          </button>

          {/* Alta Nuevo Negocio */}
          <button
            onClick={handleOpenCreate}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Registrar Nuevo Negocio
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Inquilinos</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{totalTenants}</p>
          <p className="text-xs text-slate-500 mt-1">Empresas en la plataforma</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Suscripción Vigente</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2 font-mono">{totalActivos}</p>
          <p className="text-xs text-slate-500 mt-1">Al corriente en pagos</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Por Vencer (&lt; 7 días)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2 font-mono">{totalPorVencer}</p>
          <p className="text-xs text-slate-500 mt-1">Próximos a facturar</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Morosos / Por Renovar</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2 font-mono">{totalMorosos}</p>
          <p className="text-xs text-slate-500 mt-1">Operando en modo moroso</p>
        </div>
      </div>

      {/* Barra Unificada de Filtros, Búsqueda y Conmutador de Vista (Grid / Ledger) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por nombre, razón social o RFC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 outline-none"
            />
          </div>

          {/* Filtro de Estado */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            {(['TODOS', 'ACTIVOS', 'POR_VENCER', 'MOROSOS', 'PAUSADOS'] as const).map((filtro) => (
              <button
                key={filtro}
                onClick={() => setFiltroEstado(filtro)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                  filtroEstado === filtro
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filtro === 'TODOS' && 'Todos'}
                {filtro === 'ACTIVOS' && 'Vigentes'}
                {filtro === 'POR_VENCER' && 'Por Vencer'}
                {filtro === 'MOROSOS' && 'Morosos'}
                {filtro === 'PAUSADOS' && 'Pausados'}
              </button>
            ))}
          </div>
        </div>

        {/* Conmutador de Vista (Cards ↔ Ledger Table) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-end md:self-auto">
          <button
            onClick={() => setViewMode('GRID')}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
              viewMode === 'GRID' 
                ? 'bg-white text-purple-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Vista de Cuadrícula / Tarjetas"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Tarjetas</span>
          </button>
          <button
            onClick={() => setViewMode('LEDGER')}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
              viewMode === 'LEDGER' 
                ? 'bg-white text-purple-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Vista de Tabla Contable (Ledger)"
          >
            <TableIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Tabla Ledger</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: MODO GRID O MODO LEDGER */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Cargando catálogo de negocios...</div>
      ) : filteredAndSortedTenants.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
          <Building2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-slate-700">No se encontraron negocios con los filtros aplicados.</p>
        </div>
      ) : viewMode === 'GRID' ? (
        /* VISTA 1: GRID DE TARJETAS FLOTANTES (CARDS) */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredAndSortedTenants.map((t) => {
            const sub = getSubscriptionStatus(t);
            const userCount = t._count?.usuarios || t.usuarios?.length || 0;
            const maxUsers = t.limiteUsuarios || 10;
            const almCount = t._count?.almacenes || t.almacenes?.length || 0;
            const maxAlm = t.limiteAlmacenes || 5;
            const storageEst = getTenantStorageEstimate(t);

            return (
              <div 
                key={t.id} 
                className={`bg-white rounded-2xl border shadow-sm p-6 space-y-5 transition-all hover:shadow-md ${
                  sub.isBlocked 
                    ? 'border-rose-300 ring-1 ring-rose-200' 
                    : sub.isExpired 
                      ? 'border-amber-300' 
                      : 'border-slate-200'
                }`}
              >
                {/* Cabecera Tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-md shrink-0"
                      style={{ backgroundColor: t.colorPrimario || '#1e40af' }}
                    >
                      {t.nombreComercial.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base leading-snug">{t.nombreComercial}</h3>
                        {!t.activo && (
                          <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                            PAUSADO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        RFC: {t.identificacionFiscal} • {t.moneda}
                      </p>
                      {t.razonSocial && t.razonSocial !== t.nombreComercial && (
                        <p className="text-xs text-slate-500 italic truncate max-w-xs">{t.razonSocial}</p>
                      )}
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${sub.badgeBg}`}>
                    {sub.label}
                  </span>
                </div>

                {/* Banner de Suscripción con Contador Regresivo */}
                <div className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  sub.isBlocked 
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                    : sub.isExpired 
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Plan: {t.planSuscripcion || 'PROFESIONAL'}</span>
                    </div>
                    <p className="text-xs text-slate-500">{sub.text}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedTenant(t);
                        setShowModalRenovar(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs transition-all flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Extender / Renovar
                    </button>
                  </div>
                </div>

                {/* Cuotas de Uso: Usuarios, Almacenes y Almacenamiento */}
                <div className="grid grid-cols-3 gap-2.5 text-xs pt-1">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span className="font-semibold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> Usuarios:
                      </span>
                      <strong className="font-mono text-slate-800">{userCount} / {maxUsers}</strong>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${userCount >= maxUsers ? 'bg-rose-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min((userCount / maxUsers) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span className="font-semibold flex items-center gap-1">
                        <Boxes className="w-3.5 h-3.5 text-slate-400" /> Almacenes:
                      </span>
                      <strong className="font-mono text-slate-800">{almCount} / {maxAlm}</strong>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${almCount >= maxAlm ? 'bg-rose-500' : 'bg-amber-600'}`}
                        style={{ width: `${Math.min((almCount / maxAlm) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" /> Espacio BD:
                    </span>
                    <strong className="font-mono text-slate-800 text-xs mt-0.5">{storageEst}</strong>
                  </div>
                </div>

                {/* Módulos Habilitados */}
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400 mb-1.5">Módulos Habilitados:</p>
                  <div className="flex flex-wrap gap-1">
                    {t.moduloCredito && <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-200/50">Crédito</span>}
                    {t.moduloCxC && <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-200/50">CxC</span>}
                    {t.moduloCxP && <span className="text-xs bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded border border-purple-200/50">CxP</span>}
                    {t.moduloMultiAlmacen && <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded border border-amber-200/50">Almacenes</span>}
                    {t.moduloTraspasos && <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200/50">Traspasos</span>}
                    {t.moduloFacturacionSAT && <span className="text-xs bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded border border-rose-200/50">CFDI 4.0</span>}
                    {t.moduloTesoreria && <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200/50">Tesorería</span>}
                    {t.moduloManufactura && <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-200/50">MRP</span>}
                    {t.moduloCrm && <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-200/50">CRM</span>}
                  </div>
                </div>

                {/* Barra de Acciones del Superadmin */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Editar */}
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
                      title="Editar información completa y módulos"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Clonar Plantilla */}
                    <button
                      onClick={() => handleOpenClone(t)}
                      className="p-2 text-slate-500 hover:text-purple-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
                      title="Clonar este negocio como plantilla para una nueva empresa"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Pausar / Reactivar */}
                    <button
                      onClick={() => handleToggleActivo(t)}
                      className={`p-2 rounded-xl transition-all border ${
                        t.activo 
                          ? 'text-slate-500 hover:text-amber-600 hover:bg-slate-100 border-slate-200' 
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                      }`}
                      title={t.activo ? 'Pausar servicio temporalmente' : 'Reanudar servicio'}
                    >
                      {t.activo ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                    </button>

                    {/* Eliminar */}
                    <button
                      onClick={() => {
                        setSelectedTenant(t);
                        setConfirmName('');
                        setDeleteError('');
                        setShowModalEliminar(true);
                      }}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
                      title="Eliminar negocio de la plataforma"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Acceso de Soporte */}
                  <button
                    onClick={() => handleImpersonate(t)}
                    className="text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border border-purple-200/60"
                    title="Acceder al entorno de este negocio con perfil Admin para asistencia técnica"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                    <span>Acceso de Soporte</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA 2: TABLA CONTABLE DENSE (LEDGER VIEW) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => { setSortField('nombre'); setSortAsc(!sortAsc); }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Negocio / Razón Social</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => { setSortField('plan'); setSortAsc(!sortAsc); }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Plan SaaS</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => { setSortField('vencimiento'); setSortAsc(!sortAsc); }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Vigencia & Estatus</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => { setSortField('usuarios'); setSortAsc(!sortAsc); }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Usuarios</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Almacenes</th>
                  <th className="py-3 px-4">Consumo BD</th>
                  <th className="py-3 px-4">Módulos</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedTenants.map((t) => {
                  const sub = getSubscriptionStatus(t);
                  const userCount = t._count?.usuarios || t.usuarios?.length || 0;
                  const maxUsers = t.limiteUsuarios || 10;
                  const almCount = t._count?.almacenes || t.almacenes?.length || 0;
                  const maxAlm = t.limiteAlmacenes || 5;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nombre y RFC */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                            style={{ backgroundColor: t.colorPrimario || '#1e40af' }}
                          >
                            {t.nombreComercial.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight">{t.nombreComercial}</p>
                            <p className="text-xs text-slate-400 font-mono">RFC: {t.identificacionFiscal}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                          {t.planSuscripcion || 'PROFESIONAL'}
                        </span>
                      </td>

                      {/* Vigencia y Estatus */}
                      <td className="py-3 px-4">
                        <div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sub.badgeBg}`}>
                            {sub.label}
                          </span>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {t.fechaVencimientoPlan 
                              ? new Date(t.fechaVencimientoPlan).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                              : 'Permanente'}
                          </p>
                        </div>
                      </td>

                      {/* Usuarios */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {userCount} / {maxUsers}
                      </td>

                      {/* Almacenes */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {almCount} / {maxAlm}
                      </td>

                      {/* Consumo de Almacenamiento */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {getTenantStorageEstimate(t)}
                      </td>

                      {/* Módulos (Conteo) */}
                      <td className="py-3 px-4">
                        <div className="flex gap-1 text-slate-600 text-xs font-semibold">
                          {[
                            t.moduloCredito,
                            t.moduloCxC,
                            t.moduloCxP,
                            t.moduloMultiAlmacen,
                            t.moduloTraspasos,
                            t.moduloFacturacionSAT,
                            t.moduloTesoreria,
                            t.moduloManufactura,
                            t.moduloCrm,
                            t.moduloReportes
                          ].filter(Boolean).length} / 10 activos
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedTenant(t);
                              setShowModalRenovar(true);
                            }}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                            title="Renovar / Extender"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Modificar Negocio"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenClone(t)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Clonar Plantilla"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleImpersonate(t)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Ingreso de Soporte Directo"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedTenant(t);
                              setConfirmName('');
                              setDeleteError('');
                              setShowModalEliminar(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Eliminar Negocio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* MODAL CREAR / EDITAR / CLONAR NEGOCIO */}
      {(showModalCrear || showModalEditar || showModalClonar) && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  {showModalClonar ? <Copy className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {showModalCrear 
                      ? 'Alta de Nuevo Negocio Inquilino' 
                      : showModalClonar 
                        ? `Clonar Plantilla desde: ${selectedTenant?.nombreComercial}` 
                        : `Editar: ${selectedTenant?.nombreComercial}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {showModalClonar 
                      ? 'Copia los módulos y configuraciones del negocio origen hacia una nueva empresa' 
                      : 'Configuración global de empresa, vigencia de plan y módulos'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModalCrear(false);
                  setShowModalEditar(false);
                  setShowModalClonar(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Pestañas del Modal */}
            <div className="flex gap-2 pt-4 border-b border-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('GENERAL')}
                className={`pb-2.5 px-3 border-b-2 transition-all ${
                  activeTab === 'GENERAL' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                1. Datos Generales & Fiscales
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SUSCRIPCION')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'SUSCRIPCION' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> 2. Suscripción & Cuotas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('MODULOS')}
                className={`pb-2.5 px-3 border-b-2 transition-all ${
                  activeTab === 'MODULOS' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                3. Módulos Autorizados
              </button>
              {showModalEditar && (
                <button
                  type="button"
                  onClick={() => setActiveTab('AUDITORIA')}
                  className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'AUDITORIA' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <History className="w-3.5 h-3.5" /> 4. Bitácora & Consumo
                </button>
              )}
            </div>

            <form onSubmit={showModalEditar ? handleEditSubmit : handleCreateSubmit} className="pt-4 space-y-4">
              {/* TAB 1: DATOS GENERALES */}
              {activeTab === 'GENERAL' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nombre Comercial *</label>
                      <input
                        type="text"
                        required
                        value={formData.nombreComercial}
                        onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500 text-xs"
                        placeholder="Ej. Distribuidora Mayorista"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Razón Social</label>
                      <input
                        type="text"
                        value={formData.razonSocial}
                        onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500 text-xs"
                        placeholder="Ej. Distribuidora S.A. de C.V."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">RFC / ID Fiscal *</label>
                      <input
                        type="text"
                        required
                        value={formData.identificacionFiscal}
                        onChange={(e) => setFormData({ ...formData, identificacionFiscal: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500 font-mono text-xs"
                        placeholder="DMN180524ABC"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Código Postal</label>
                      <input
                        type="text"
                        value={formData.codigoPostal}
                        onChange={(e) => setFormData({ ...formData, codigoPostal: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500 font-mono text-xs"
                        placeholder="64000"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Moneda Base</label>
                      <select
                        value={formData.moneda}
                        onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500 bg-white text-xs"
                      >
                        <option value="MXN">MXN ($)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Giro Comercial</label>
                      <select
                        value={formData.giro}
                        onChange={(e) => setFormData({ ...formData, giro: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500 bg-white text-xs"
                      >
                        <option value="DISTRIBUCION_MAYOREO">Distribución y Mayoreo</option>
                        <option value="COMERCIAL_RETAIL">Comercio Minorista / Retail</option>
                        <option value="SERVICIOS">Empresa de Servicios</option>
                        <option value="MANUFACTURA">Manufactura / Ensamble</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Color Corporativo</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.colorPrimario}
                          onChange={(e) => setFormData({ ...formData, colorPrimario: e.target.value })}
                          className="w-9 h-9 p-0 border border-slate-200 rounded-lg cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={formData.colorPrimario}
                          onChange={(e) => setFormData({ ...formData, colorPrimario: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono uppercase text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campos de Admin inicial (solo Crear o Clonar) */}
                  {(showModalCrear || showModalClonar) && (
                    <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-2">
                      <p className="font-bold text-purple-900 text-xs">Cuenta Administrador Inicial para la Empresa:</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 mb-0.5">Nombre del Admin</label>
                          <input
                            type="text"
                            value={formData.adminNombre}
                            onChange={(e) => setFormData({ ...formData, adminNombre: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                            placeholder="Ej. Roberto Martínez"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-0.5">Correo Electrónico *</label>
                          <input
                            type="email"
                            required
                            value={formData.adminEmail}
                            onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                            placeholder="admin@empresa.com"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SUSCRIPCIÓN & CUOTAS */}
              {activeTab === 'SUSCRIPCION' && (
                <div className="space-y-3.5 text-xs">
                  <div className="p-3 bg-purple-50 border border-purple-200/80 rounded-2xl">
                    <p className="font-bold text-purple-900">Control de Vigencia y Cuotas de Uso</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Política Flexible con Facturación Externa: Al llegar la fecha de corte, el sistema marca el negocio en estado moroso y notifica al Superadmin sin bloquear la operación de venta o inventario del cliente.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Plan de Suscripción</label>
                      <select
                        value={formData.planSuscripcion}
                        onChange={(e) => setFormData({ ...formData, planSuscripcion: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                      >
                        <option value="DEMO">Demo Gratuita</option>
                        <option value="BASICO">Plan Básico</option>
                        <option value="PROFESIONAL">Plan Profesional</option>
                        <option value="ENTERPRISE">Plan Enterprise</option>
                        <option value="PERSONALIZADO">Plan Personalizado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Fecha de Inicio</label>
                      <input
                        type="date"
                        value={formData.fechaInicioPlan}
                        onChange={(e) => setFormData({ ...formData, fechaInicioPlan: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Fecha de Vencimiento</label>
                      <input
                        type="date"
                        value={formData.fechaVencimientoPlan}
                        onChange={(e) => setFormData({ ...formData, fechaVencimientoPlan: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-purple-700 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Días de Gracia</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={formData.diasGraciaSuscripcion}
                        onChange={(e) => setFormData({ ...formData, diasGraciaSuscripcion: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Límite de Usuarios</label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={formData.limiteUsuarios}
                        onChange={(e) => setFormData({ ...formData, limiteUsuarios: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Límite de Almacenes</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.limiteAlmacenes}
                        onChange={(e) => setFormData({ ...formData, limiteAlmacenes: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.bloqueadoPorSuscripcion}
                        onChange={(e) => setFormData({ ...formData, bloqueadoPorSuscripcion: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <div>
                        <span className="font-bold text-slate-800">Forzar Bloqueo Administrativo Manual</span>
                        <p className="text-xs text-slate-500">
                          Suspende el acceso inmediato a los usuarios del negocio redirigiéndolos a la pantalla de pago.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Notas Privadas de Facturación / Acuerdos</label>
                    <textarea
                      rows={2}
                      value={formData.notasSuperadmin}
                      onChange={(e) => setFormData({ ...formData, notasSuperadmin: e.target.value })}
                      placeholder="Folio de factura externa, comprobante bancario, acuerdos o prórrogas autorizadas..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    ></textarea>
                  </div>
                </div>
              )}

              {/* TAB 3: MÓDULOS AUTORIZADOS */}
              {activeTab === 'MODULOS' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">
                    Controla qué módulos y subsistemas están activados para este negocio:
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formData.moduloCredito} onChange={(e) => setFormData({ ...formData, moduloCredito: e.target.checked })} />
                      <div>
                        <span className="font-bold text-slate-800">Control de Crédito</span>
                        <p className="text-xs text-slate-500">Límites y bloqueo de cartera</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formData.moduloCxC} onChange={(e) => setFormData({ ...formData, moduloCxC: e.target.checked })} />
                      <div>
                        <span className="font-bold text-slate-800">Cuentas por Cobrar (CxC)</span>
                        <p className="text-xs text-slate-500">Gestión de cobros y abonos</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formData.moduloCxP} onChange={(e) => setFormData({ ...formData, moduloCxP: e.target.checked })} />
                      <div>
                        <span className="font-bold text-slate-800">Cuentas por Pagar (CxP)</span>
                        <p className="text-xs text-slate-500">Pagos a proveedores</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formData.moduloMultiAlmacen} onChange={(e) => setFormData({ ...formData, moduloMultiAlmacen: e.target.checked })} />
                      <div>
                        <span className="font-bold text-slate-800">Multi-Almacén</span>
                        <p className="text-xs text-slate-500">Bodegas y sucursales</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formData.moduloTraspasos} onChange={(e) => setFormData({ ...formData, moduloTraspasos: e.target.checked })} />
                      <div>
                        <span className="font-bold text-slate-800">Traspasos de Stock</span>
                        <p className="text-xs text-slate-500">Envíos entre almacenes</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formData.moduloFacturacionSAT} onChange={(e) => setFormData({ ...formData, moduloFacturacionSAT: e.target.checked })} />
                      <div>
                        <span className="font-bold text-slate-800">Facturación SAT CFDI 4.0</span>
                        <p className="text-xs text-slate-500">Timbrado fiscal multi-PAC</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formData.moduloTesoreria} onChange={(e) => setFormData({ ...formData, moduloTesoreria: e.target.checked })} />
                      <div>
                        <span className="font-bold text-slate-800">Tesorería & Bancos</span>
                        <p className="text-xs text-slate-500">Cuentas y conciliación</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formData.moduloManufactura} onChange={(e) => setFormData({ ...formData, moduloManufactura: e.target.checked })} />
                      <div>
                        <span className="font-bold text-slate-800">Manufactura (MRP)</span>
                        <p className="text-xs text-slate-500">Listas BOM y órdenes prod.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formData.moduloCrm} onChange={(e) => setFormData({ ...formData, moduloCrm: e.target.checked })} />
                      <div>
                        <span className="font-bold text-slate-800">CRM Comercial</span>
                        <p className="text-xs text-slate-500">Pipeline Kanban de ventas</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={formData.moduloReportes} onChange={(e) => setFormData({ ...formData, moduloReportes: e.target.checked })} />
                      <div>
                        <span className="font-bold text-slate-800">Reportes Mensuales</span>
                        <p className="text-xs text-slate-500">Dictamen contable</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 4: BITÁCORA & CONSUMO (SOLO EN EDICIÓN) */}
              {activeTab === 'AUDITORIA' && selectedTenant && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-800">Estadísticas de Infraestructura y Datos:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1 font-mono">
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 font-sans">Ventas</p>
                        <p className="font-bold text-slate-800 text-sm">{selectedTenant._count?.ventas || 0}</p>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 font-sans">Compras</p>
                        <p className="font-bold text-slate-800 text-sm">{selectedTenant._count?.compras || 0}</p>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 font-sans">Productos</p>
                        <p className="font-bold text-slate-800 text-sm">{selectedTenant._count?.productos || 0}</p>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 font-sans">Almacenamiento</p>
                        <p className="font-bold text-purple-700 text-sm">{getTenantStorageEstimate(selectedTenant)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="font-bold text-slate-700 mb-1">Usuarios Registrados:</p>
                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {selectedTenant.usuarios?.map((u: any) => (
                        <div key={u.id} className="p-2 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-800">{u.nombre}</p>
                            <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {u.rol}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Botones Pie del Modal */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalCrear(false);
                    setShowModalEditar(false);
                    setShowModalClonar(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all"
                >
                  {saving ? 'Guardando...' : showModalCrear || showModalClonar ? 'Guardar Nuevo Negocio' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RENOVACIÓN RÁPIDA */}
      {showModalRenovar && selectedTenant && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Extender Suscripción</h3>
                <p className="text-xs text-slate-500">{selectedTenant.nombreComercial}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p className="text-slate-500">Vigencia actual:</p>
              <p className="font-mono font-bold text-slate-800">
                {selectedTenant.fechaVencimientoPlan 
                  ? new Date(selectedTenant.fechaVencimientoPlan).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
                  : 'Sin fecha registrada'}
              </p>
            </div>

            <p className="text-xs font-semibold text-slate-700">Selecciona el periodo a renovar:</p>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={() => handleQuickExtend(selectedTenant, 15)}
                disabled={saving}
                className="p-3 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all text-center"
              >
                + 15 Días (Demo)
              </button>
              <button
                onClick={() => handleQuickExtend(selectedTenant, 30)}
                disabled={saving}
                className="p-3 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all text-center"
              >
                + 30 Días (1 Mes)
              </button>
              <button
                onClick={() => handleQuickExtend(selectedTenant, 90)}
                disabled={saving}
                className="p-3 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all text-center"
              >
                + 90 Días (Trimestral)
              </button>
              <button
                onClick={() => handleQuickExtend(selectedTenant, 365)}
                disabled={saving}
                className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all text-center"
              >
                + 365 Días (1 Año)
              </button>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowModalRenovar(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR NEGOCIO */}
      {showModalEliminar && selectedTenant && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Eliminar Negocio Permanentemente</h3>
                <p className="text-xs text-rose-600 font-semibold">Acción destructiva e irreversible</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1.5">
              <p className="font-bold">¡Advertencia de Integridad!</p>
              <p className="leading-relaxed">
                Estás a punto de eliminar permanentemente a <strong>{selectedTenant.nombreComercial}</strong> ({selectedTenant.identificacionFiscal}). Se borrarán todos los productos, clientes, ventas, inventarios y usuarios vinculados a este inquilino.
              </p>
              <p className="text-xs text-rose-700 font-medium pt-1">
                Tip: Si solo deseas suspender el servicio, puedes usar <strong>Pausar</strong> para no perder la contabilidad histórica.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-700 font-medium">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Escribe el RFC (<span className="font-mono text-purple-700">{selectedTenant.identificacionFiscal}</span>) o nombre para confirmar:
                </label>
                <input
                  type="text"
                  required
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={selectedTenant.identificacionFiscal}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono outline-none focus:border-rose-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalEliminar(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {saving ? 'Eliminando...' : 'Eliminar Definitivamente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
