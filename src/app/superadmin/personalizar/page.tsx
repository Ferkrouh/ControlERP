'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Sliders,
  Building2,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Search,
  Save,
  Zap,
  ShoppingCart,
  FileText,
  CreditCard,
  Truck,
  Boxes,
  ArrowLeftRight,
  Landmark,
  Factory,
  Kanban,
  BookOpen,
  UserCheck,
  BarChart3,
  Receipt,
  RotateCcw,
  Sparkles,
  Layers,
  Palette,
  Eye,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronDown,
  Check,
  Tag,
  Shield,
  Coins
} from 'lucide-react';

interface TenantData {
  id: string;
  nombreComercial: string;
  razonSocial: string;
  identificacionFiscal: string;
  regimenFiscal?: string;
  codigoPostal?: string;
  giro: string;
  moneda: string;
  activo: boolean;
  logoUrl?: string;
  colorPrimario: string;
  textoEncabezadoDoc?: string;
  diasGraciaCredito: number;
  alertaVencimientoDias: number;
  politicaBloqueoCredito: string;
  planSuscripcion: string;
  fechaInicioPlan: string;
  fechaVencimientoPlan?: string;
  diasGraciaSuscripcion: number;
  bloqueadoPorSuscripcion: boolean;
  limiteUsuarios: number;
  limiteAlmacenes: number;
  notasSuperadmin?: string;

  // Módulos booleanos de primer nivel
  moduloPos: boolean;
  moduloCotizaciones: boolean;
  moduloCredito: boolean;
  moduloCxC: boolean;
  moduloListasPrecio: boolean;
  moduloOrdenesCompra: boolean;
  moduloProveedores: boolean;
  moduloCxP: boolean;
  moduloMultiAlmacen: boolean;
  moduloTraspasos: boolean;
  moduloLotes: boolean;
  moduloReportes: boolean;
  moduloFacturacionSAT: boolean;
  moduloTesoreria: boolean;
  moduloManufactura: boolean;
  moduloCrm: boolean;
  moduloContabilidad: boolean;
  moduloNomina: boolean;

  // JSON con flags de microfunciones
  funcionesHabilitadas?: string;

  // Configuración PAC
  pacProveedor?: string;
  pacUsuario?: string;
  pacPassword?: string;
  pacModoProduccion?: boolean;
  serieFactura?: string;
  seriePagoRep?: string;
  serieCartaPorte?: string;

  _count?: {
    usuarios: number;
    almacenes: number;
    ventas: number;
    productos: number;
  };
}

// Microfunciones por defecto
const DEFAULT_SUBFUNCTIONS: Record<string, boolean> = {
  // POS
  posCorteZCaja: true,
  posFondoInicialObligatorio: false,
  posEscaneoRapido: true,
  posCalculadoraCambio: true,
  posImpresionTickets: true,
  posVentaSinStock: false,
  posDescuentosDirectos: true,
  // Cotizaciones
  cotizacionesConversionDirecta: true,
  cotizacionesVigencia: true,
  cotizacionesExportarPDF: true,
  // Ventas & Facturación
  ventasBloqueoMorosos: true,
  ventasRegistroComisiones: true,
  // CxC
  cxcAbonosParciales: true,
  cxcComplementoREP: true,
  cxcInteresesMoratorios: false,
  // Compras & CxP
  compras3WayMatch: true,
  comprasEntregasParciales: true,
  comprasRegistroFactura: true,
  cxpProgramacionPagos: true,
  cxpDatosBancarios: true,
  // Inventario & Logística
  traspasosCartaPorte: true,
  inventarioAjustesManuales: true,
  inventarioAlertaStockMinimo: true,
  inventarioOcultarCostosAlmacen: true,
  // Tesorería
  tesoreriaCuentasMultimoneda: true,
  tesoreriaCajaChica: true,
  tesoreriaConciliacionBancaria: true,
  tesoreriaTransferenciasInternas: true,
  // Manufactura
  mrpListasMateriales: true,
  mrpOrdenesProduccion: true,
  mrpCosteoPonderado: true,
  // CRM
  crmTableroKanban: true,
  crmForecasting: true,
  crmBitacoraInteracciones: true,
  // Contabilidad
  contabilidadCatalogoSAT: true,
  contabilidadPolizasAutomaticas: true,
  contabilidadExportacionXML: true,
  // Nómina
  nominaCalculoFiscal: true,
  nominaTimbradoDigital: true,
  nominaLayoutDispersion: true,
  // Reportes
  repBalanzaCxC: true,
  repAntiguedadSaldos: true,
  repIngresosRecaudacion: true,
  repConciliacionFacturas: true,
  repForecasting: true,
  repLtvClientes: true,
  repVentasProducto: true,
  repComisiones: true,
  repCumplimientoCuotas: true,
  repNotasCredito: true,
};

const PALETAS_COLOR = [
  { name: 'Azul Finanzas (Default)', hex: '#1e40af' },
  { name: 'Índigo Corporativo', hex: '#4338ca' },
  { name: 'Esmeralda Retail', hex: '#059669' },
  { name: 'Zafiro Deep Navy', hex: '#0f172a' },
  { name: 'Púrpura Sovereign', hex: '#7c3aed' },
  { name: 'Teal Tecnológico', hex: '#0d9488' },
  { name: 'Ámbar Industrial', hex: '#d97706' },
  { name: 'Rosa Ejecutivo', hex: '#db2777' },
  { name: 'Rojo Carmesí', hex: '#dc2626' },
];

export default function SuperadminPersonalizarPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTenant, setSearchTenant] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Pestaña activa del formulario
  const [activeTab, setActiveTab] = useState<'MATRIZ_MODULOS' | 'LIMITES' | 'CREDITO' | 'PAC' | 'BRANDING'>('MATRIZ_MODULOS');

  // Estado del Tenant editado
  const [formData, setFormData] = useState<TenantData | null>(null);
  const [subfunctions, setSubfunctions] = useState<Record<string, boolean>>(DEFAULT_SUBFUNCTIONS);

  // Cargar lista de Tenants
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tenants');
      if (!res.ok) throw new Error('Error al obtener lista de negocios');
      const data = await res.json();
      setTenants(data);
      if (data.length > 0 && !selectedTenantId) {
        setSelectedTenantId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast('Error cargando los negocios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.rol === 'SUPERADMIN') {
      fetchTenants();
    }
  }, [user]);

  // Al cambiar el Tenant seleccionado, cargar datos al estado
  useEffect(() => {
    if (!selectedTenantId || tenants.length === 0) return;
    const t = tenants.find(it => it.id === selectedTenantId);
    if (t) {
      setFormData({
        ...t,
        moduloPos: t.moduloPos ?? true,
        moduloCotizaciones: t.moduloCotizaciones ?? true,
        moduloCredito: t.moduloCredito ?? true,
        moduloCxC: t.moduloCxC ?? true,
        moduloListasPrecio: t.moduloListasPrecio ?? true,
        moduloOrdenesCompra: t.moduloOrdenesCompra ?? true,
        moduloProveedores: t.moduloProveedores ?? true,
        moduloCxP: t.moduloCxP ?? true,
        moduloMultiAlmacen: t.moduloMultiAlmacen ?? true,
        moduloTraspasos: t.moduloTraspasos ?? true,
        moduloLotes: t.moduloLotes ?? true,
        moduloReportes: t.moduloReportes ?? true,
        moduloFacturacionSAT: t.moduloFacturacionSAT ?? false,
        moduloTesoreria: t.moduloTesoreria ?? true,
        moduloManufactura: t.moduloManufactura ?? true,
        moduloCrm: t.moduloCrm ?? true,
        moduloContabilidad: t.moduloContabilidad ?? true,
        moduloNomina: t.moduloNomina ?? true,
      });

      // Parsear microfunciones guardadas en JSON
      try {
        if (t.funcionesHabilitadas) {
          const parsed = JSON.parse(t.funcionesHabilitadas);
          setSubfunctions({ ...DEFAULT_SUBFUNCTIONS, ...parsed });
        } else {
          setSubfunctions({ ...DEFAULT_SUBFUNCTIONS });
        }
      } catch (e) {
        setSubfunctions({ ...DEFAULT_SUBFUNCTIONS });
      }
    }
  }, [selectedTenantId, tenants]);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleModule = (key: keyof TenantData) => {
    if (!formData) return;
    setFormData(prev => prev ? ({ ...prev, [key]: !prev[key] }) : null);
  };

  const handleToggleSubfunction = (key: string) => {
    setSubfunctions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Presets rápidos en 1 clic
  const applyPreset = (preset: 'RETAIL' | 'MAYORISTA' | 'MANUFACTURA' | 'FULL_ENTERPRISE' | 'MINIMO') => {
    if (!formData) return;

    if (preset === 'RETAIL') {
      setFormData(prev => prev ? ({
        ...prev,
        moduloPos: true,
        moduloCotizaciones: false,
        moduloCredito: false,
        moduloCxC: false,
        moduloListasPrecio: false,
        moduloOrdenesCompra: false,
        moduloProveedores: true,
        moduloCxP: false,
        moduloMultiAlmacen: false,
        moduloTraspasos: false,
        moduloLotes: false,
        moduloTesoreria: false,
        moduloManufactura: false,
        moduloCrm: false,
        moduloContabilidad: false,
        moduloNomina: false,
        moduloReportes: true,
        moduloFacturacionSAT: false,
      }) : null);
      setSubfunctions(prev => ({
        ...prev,
        posCorteZCaja: true,
        posCalculadoraCambio: true,
        posImpresionTickets: true,
        repVentasProducto: true,
        repIngresosRecaudacion: true,
      }));
      showToast('Preset Retail / Mostrador aplicado', 'success');
    } else if (preset === 'MAYORISTA') {
      setFormData(prev => prev ? ({
        ...prev,
        moduloPos: true,
        moduloCotizaciones: true,
        moduloCredito: true,
        moduloCxC: true,
        moduloListasPrecio: true,
        moduloOrdenesCompra: true,
        moduloProveedores: true,
        moduloCxP: true,
        moduloMultiAlmacen: true,
        moduloTraspasos: true,
        moduloLotes: true,
        moduloTesoreria: true,
        moduloManufactura: false,
        moduloCrm: true,
        moduloContabilidad: true,
        moduloNomina: false,
        moduloReportes: true,
        moduloFacturacionSAT: true,
      }) : null);
      showToast('Preset Distribuidora Mayorista aplicado', 'success');
    } else if (preset === 'MANUFACTURA') {
      setFormData(prev => prev ? ({
        ...prev,
        moduloPos: false,
        moduloCotizaciones: true,
        moduloCredito: true,
        moduloCxC: true,
        moduloListasPrecio: true,
        moduloOrdenesCompra: true,
        moduloProveedores: true,
        moduloCxP: true,
        moduloMultiAlmacen: true,
        moduloTraspasos: true,
        moduloLotes: true,
        moduloTesoreria: true,
        moduloManufactura: true,
        moduloCrm: false,
        moduloContabilidad: true,
        moduloNomina: true,
        moduloReportes: true,
        moduloFacturacionSAT: true,
      }) : null);
      showToast('Preset Manufactura & MRP aplicado', 'success');
    } else if (preset === 'FULL_ENTERPRISE') {
      setFormData(prev => prev ? ({
        ...prev,
        moduloPos: true,
        moduloCotizaciones: true,
        moduloCredito: true,
        moduloCxC: true,
        moduloListasPrecio: true,
        moduloOrdenesCompra: true,
        moduloProveedores: true,
        moduloCxP: true,
        moduloMultiAlmacen: true,
        moduloTraspasos: true,
        moduloLotes: true,
        moduloTesoreria: true,
        moduloManufactura: true,
        moduloCrm: true,
        moduloContabilidad: true,
        moduloNomina: true,
        moduloReportes: true,
        moduloFacturacionSAT: true,
      }) : null);
      const allActive: Record<string, boolean> = {};
      Object.keys(DEFAULT_SUBFUNCTIONS).forEach(k => { allActive[k] = true; });
      setSubfunctions(allActive);
      showToast('Preset Corporativo Full Suite (Enterprise) activado al 100%', 'success');
    } else if (preset === 'MINIMO') {
      setFormData(prev => prev ? ({
        ...prev,
        moduloPos: true,
        moduloCotizaciones: false,
        moduloCredito: false,
        moduloCxC: false,
        moduloListasPrecio: false,
        moduloOrdenesCompra: false,
        moduloProveedores: false,
        moduloCxP: false,
        moduloMultiAlmacen: false,
        moduloTraspasos: false,
        moduloLotes: false,
        moduloTesoreria: false,
        moduloManufactura: false,
        moduloCrm: false,
        moduloContabilidad: false,
        moduloNomina: false,
        moduloReportes: false,
        moduloFacturacionSAT: false,
      }) : null);
      showToast('Preset Mínimo Viable aplicado', 'success');
    }
  };

  // Guardar cambios en el backend
  const handleSaveChanges = async () => {
    if (!formData || !selectedTenantId) return;

    try {
      setSaving(true);
      const payload = {
        ...formData,
        funcionesHabilitadas: JSON.stringify(subfunctions),
      };

      const res = await fetch(`/api/tenants/${selectedTenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar la configuración');
      }

      const updatedTenant = await res.json();

      // Actualizar en el estado local de tenants
      setTenants(prev => prev.map(t => t.id === updatedTenant.id ? { ...t, ...updatedTenant } : t));
      showToast('Configuración extrema del negocio guardada exitosamente', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Conteo de funciones activas
  const totalModulosActivos = useMemo(() => {
    if (!formData) return 0;
    const moduleKeys: (keyof TenantData)[] = [
      'moduloPos', 'moduloCotizaciones', 'moduloCredito', 'moduloCxC', 'moduloListasPrecio',
      'moduloOrdenesCompra', 'moduloProveedores', 'moduloCxP', 'moduloMultiAlmacen', 'moduloTraspasos',
      'moduloLotes', 'moduloTesoreria', 'moduloManufactura', 'moduloCrm', 'moduloContabilidad',
      'moduloNomina', 'moduloReportes', 'moduloFacturacionSAT'
    ];
    const subActive = Object.values(subfunctions).filter(Boolean).length;
    const modActive = moduleKeys.filter(k => !!formData[k]).length;
    return modActive + subActive;
  }, [formData, subfunctions]);

  const totalPosibles = 18 + Object.keys(DEFAULT_SUBFUNCTIONS).length;

  if (user?.rol !== 'SUPERADMIN') {
    return (
      <div className="p-8 max-w-lg mx-auto mt-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-300">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-1">Acceso Restringido</h2>
        <p className="text-sm text-slate-400">
          Esta consola de personalización extrema es exclusiva para el <strong>SUPERADMIN</strong> de plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* TOAST FLOTANTE */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-sm font-semibold transition-all ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-950 border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950 border-rose-500/50 text-rose-200'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ENCABEZADO SOVEREIGN */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-950 border border-slate-800/80 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">
            <Shield className="w-4 h-4" /> Consola Maestra SaaS — Configuración Quirúrgica
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Sliders className="w-6 h-6 text-purple-400" />
            Personalización Extrema de Espacios de Negocio
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Control total sobre cada módulo, componente operativo, micro-función, política de crédito y aspecto visual que cada empresa tiene autorizado en el sistema.
          </p>
        </div>

        {/* SELECTOR MAESTRO DE TENANT */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-8 py-2.5 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none appearance-none cursor-pointer"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombreComercial} ({t.identificacionFiscal})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={fetchTenants}
            title="Recargar negocios"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FICHA EJECUTIVA DEL TENANT SELECCIONADO */}
      {formData && (
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div 
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: formData.colorPrimario || '#1e40af' }}
          />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-1">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md border border-white/10 shrink-0"
                style={{ backgroundColor: formData.colorPrimario || '#1e40af' }}
              >
                {formData.nombreComercial.substring(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{formData.nombreComercial}</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {formData.planSuscripcion}
                  </span>
                  {formData.bloqueadoPorSuscripcion ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                      SUSPENDIDO
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      ACTIVO
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1 font-mono">
                  <span>RFC: <strong className="text-slate-200">{formData.identificacionFiscal}</strong></span>
                  <span>•</span>
                  <span>Razón: {formData.razonSocial}</span>
                  <span>•</span>
                  <span>Giro: {formData.giro}</span>
                </div>
              </div>
            </div>

            {/* MÉTRICAS DE CAPACIDAD Y AUDITORÍA RÁPIDA */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Usuarios</span>
                <span className="text-xs font-mono font-bold text-white">
                  {formData._count?.usuarios ?? 0} / {formData.limiteUsuarios}
                </span>
              </div>
              <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Almacenes</span>
                <span className="text-xs font-mono font-bold text-white">
                  {formData._count?.almacenes ?? 0} / {formData.limiteAlmacenes}
                </span>
              </div>
              <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Ventas</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formData._count?.ventas ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE PRESETS EN 1 CLIC */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Plantillas Instantáneas:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => applyPreset('RETAIL')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            Retail / Mostrador
          </button>
          <button
            onClick={() => applyPreset('MAYORISTA')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            Distribuidora Mayorista
          </button>
          <button
            onClick={() => applyPreset('MANUFACTURA')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <Factory className="w-3.5 h-3.5 text-teal-400" />
            Manufactura & MRP
          </button>
          <button
            onClick={() => applyPreset('FULL_ENTERPRISE')}
            className="px-3 py-1.5 bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            Corporativo Full Suite (100%)
          </button>
          <button
            onClick={() => applyPreset('MINIMO')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition-all"
          >
            Mínimo
          </button>
        </div>
      </div>

      {/* PESTAÑAS DE PERSONALIZACIÓN */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('MATRIZ_MODULOS')}
          className={`pb-3 px-4 text-xs font-bold tracking-wide border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'MATRIZ_MODULOS'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          1. Matriz de Módulos & Subfunciones ({totalModulosActivos}/{totalPosibles})
        </button>

        <button
          onClick={() => setActiveTab('LIMITES')}
          className={`pb-3 px-4 text-xs font-bold tracking-wide border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'LIMITES'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          2. Cuotas & Suscripción SaaS
        </button>

        <button
          onClick={() => setActiveTab('CREDITO')}
          className={`pb-3 px-4 text-xs font-bold tracking-wide border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'CREDITO'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          3. Políticas de Crédito
        </button>

        <button
          onClick={() => setActiveTab('PAC')}
          className={`pb-3 px-4 text-xs font-bold tracking-wide border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'PAC'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Coins className="w-4 h-4" />
          4. Facturación SAT & PAC
        </button>

        <button
          onClick={() => setActiveTab('BRANDING')}
          className={`pb-3 px-4 text-xs font-bold tracking-wide border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'BRANDING'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          5. Marca & Identidad Visual
        </button>
      </div>

      {formData && (
        <div className="space-y-6">
          {/* TAB 1: MATRIZ DE MÓDULOS & SUBFUNCIONES (EXTREMA) */}
          {activeTab === 'MATRIZ_MODULOS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* SECCIÓN 1: CICLO COMERCIAL & POS */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                    <ShoppingCart className="w-4 h-4" />
                    Ciclo Comercial & Mostrador (POS)
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    Comercial
                  </span>
                </div>

                {/* Switch Maestro POS */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Punto de Venta de Mostrador (POS)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Terminal rápida para ventas en mostrador y tickets.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloPos}
                      onChange={() => handleToggleModule('moduloPos')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Microfunciones POS */}
                {formData.moduloPos && (
                  <div className="pl-4 space-y-2 border-l-2 border-emerald-500/30 py-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Microfunciones del POS:</div>

                    {[
                      { key: 'posCorteZCaja', label: 'Arqueo y Corte Z por Turno', desc: 'Control de caja con diferencias de efectivo' },
                      { key: 'posFondoInicialObligatorio', label: 'Fondo Inicial Obligatorio', desc: 'Exigir declarar fondo en efectivo al abrir turno' },
                      { key: 'posEscaneoRapido', label: 'Modo Escaneo Rápido de Códigos', desc: 'Añadir producto automáticamente al leer código' },
                      { key: 'posCalculadoraCambio', label: 'Calculadora de Cambio en Efectivo', desc: 'Desglose exacto de cambio para el cliente' },
                      { key: 'posImpresionTickets', label: 'Tickets Térmicos (80mm / 58mm)', desc: 'Generación de recibo térmico con tipografía mono' },
                      { key: 'posVentaSinStock', label: 'Permitir Venta sin Existencias', desc: 'Vender aun si el stock físico está en cero' },
                      { key: 'posDescuentosDirectos', label: 'Descuentos Manuales en Mostrador', desc: 'Permitir al cajero aplicar descuentos' },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between text-xs py-1">
                        <div>
                          <span className="text-slate-200 font-medium">{f.label}</span>
                          <span className="text-[10px] text-slate-500 block">{f.desc}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!subfunctions[f.key]}
                          onChange={() => handleToggleSubfunction(f.key)}
                          className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Switch Maestro Cotizaciones */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold text-white">Cotizaciones & Presupuestos</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Emisión de cotizaciones previas a la venta.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloCotizaciones}
                      onChange={() => handleToggleModule('moduloCotizaciones')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>

                {/* Microfunciones Cotizaciones */}
                {formData.moduloCotizaciones && (
                  <div className="pl-4 space-y-2 border-l-2 border-sky-500/30 py-1">
                    {[
                      { key: 'cotizacionesConversionDirecta', label: 'Conversión a Venta en 1 Clic', desc: 'Aprobar cotización y descontar inventario inmediatamente' },
                      { key: 'cotizacionesVigencia', label: 'Vigencia de Precios Pactados', desc: 'Validar días de vigencia antes de autorizar venta' },
                      { key: 'cotizacionesExportarPDF', label: 'Generación Formal de Presupuesto PDF', desc: 'Descarga con logotipo y desglose legal' },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between text-xs py-1">
                        <div>
                          <span className="text-slate-200 font-medium">{f.label}</span>
                          <span className="text-[10px] text-slate-500 block">{f.desc}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!subfunctions[f.key]}
                          onChange={() => handleToggleSubfunction(f.key)}
                          className="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Listas de Precios & Políticas de Venta */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white">Listas de Precios Múltiples</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Precios por Mayoreo, Menudeo, VIP y Distribuidor.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloListasPrecio}
                      onChange={() => handleToggleModule('moduloListasPrecio')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* SECCIÓN 2: CRÉDITO & COBRANZA (CxC) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
                    <CreditCard className="w-4 h-4" />
                    Crédito, Cartera & Cobranza (CxC)
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Financiero
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Líneas de Crédito a Clientes</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Asignación de saldo límite y días de plazo.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloCredito}
                      onChange={() => handleToggleModule('moduloCredito')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Gestión de Cobranza (CxC)</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Control de saldos vivos, abonos y estados de cuenta.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloCxC}
                      onChange={() => handleToggleModule('moduloCxC')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {formData.moduloCxC && (
                  <div className="pl-4 space-y-2 border-l-2 border-amber-500/30 py-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Microfunciones de Cobranza:</div>

                    {[
                      { key: 'cxcAbonosParciales', label: 'Registro de Abonos y Pagos Parciales', desc: 'Amortización continua con saldo insoluto en vivo' },
                      { key: 'cxcComplementoREP', label: 'Complemento de Pago REP 2.0 (SAT)', desc: 'Generación del CFDI oficial al liquidar parcialidades' },
                      { key: 'ventasBloqueoMorosos', label: 'Bloqueo Automático a Clientes Morosos', desc: 'Impedir nuevas ventas si el cliente superó su plazo' },
                      { key: 'cxcInteresesMoratorios', label: 'Cálculo de Recargos por Mora', desc: 'Tasa mensual automática sobre días de retraso' },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between text-xs py-1">
                        <div>
                          <span className="text-slate-200 font-medium">{f.label}</span>
                          <span className="text-[10px] text-slate-500 block">{f.desc}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!subfunctions[f.key]}
                          onChange={() => handleToggleSubfunction(f.key)}
                          className="rounded bg-slate-800 border-slate-700 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECCIÓN 3: COMPRAS & CADENA DE SUMINISTRO (CxP) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-amber-500 font-bold text-sm">
                    <Truck className="w-4 h-4" />
                    Compras, Proveedores & CxP
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Suministro
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Órdenes de Compra Formales</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Control previo de pedidos a proveedores.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloOrdenesCompra}
                      onChange={() => handleToggleModule('moduloOrdenesCompra')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {formData.moduloOrdenesCompra && (
                  <div className="pl-4 space-y-2 border-l-2 border-amber-500/30 py-1">
                    {[
                      { key: 'compras3WayMatch', label: 'Validación de 3 Vías (3-Way Matching)', desc: 'Validar OC = Factura Proveedor = Picking Almacén' },
                      { key: 'comprasEntregasParciales', label: 'Recepciones Físicas Parciales', desc: 'Permitir surtido en múltiples envíos de proveedor' },
                      { key: 'comprasRegistroFactura', label: 'Registro Fiscal de Remisión/Factura', desc: 'Captura de folio fiscal y validación SAT' },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between text-xs py-1">
                        <div>
                          <span className="text-slate-200 font-medium">{f.label}</span>
                          <span className="text-[10px] text-slate-500 block">{f.desc}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!subfunctions[f.key]}
                          onChange={() => handleToggleSubfunction(f.key)}
                          className="rounded bg-slate-800 border-slate-700 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Catálogo de Proveedores</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Expedientes y datos de contacto de suplidores.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloProveedores}
                      onChange={() => handleToggleModule('moduloProveedores')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Cuentas por Pagar (CxP)</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Calendario de compromisos y programación de pagos.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloCxP}
                      onChange={() => handleToggleModule('moduloCxP')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>

              {/* SECCIÓN 4: INVENTARIOS, MULTIALMACÉN & KÁRDEX */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-sm">
                    <Boxes className="w-4 h-4" />
                    Inventarios, Multialmacén & Logística
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Kárdex
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Multialmacén & Sucursales</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Existencias físicas segregadas por bodega física.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloMultiAlmacen}
                      onChange={() => handleToggleModule('moduloMultiAlmacen')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Traspasos entre Almacenes</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Flujo de envío en 2 pasos con tránsito y recepción.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloTraspasos}
                      onChange={() => handleToggleModule('moduloTraspasos')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Trazabilidad de Lotes & Caducidades</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Control de lotes de entrada y semáforo de expiración.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloLotes}
                      onChange={() => handleToggleModule('moduloLotes')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="pl-4 space-y-2 border-l-2 border-cyan-500/30 py-1">
                  {[
                    { key: 'traspasosCartaPorte', label: 'Carta Porte 3.1 para Carretera', desc: 'Cumplimiento fiscal SAT en traslados de mercancía' },
                    { key: 'inventarioAjustesManuales', label: 'Ajustes Manuales con Registro de Auditoría', desc: 'Permitir altas/bajas por merma con justificación' },
                    { key: 'inventarioAlertaStockMinimo', label: 'Alerta Preventiva de Stock Mínimo', desc: 'Notificar en compras productos bajo el punto de reorden' },
                    { key: 'inventarioOcultarCostosAlmacen', label: 'Ocultar Costos a Almacenistas', desc: 'Proteger márgenes y costos de compra en vistas operativas' },
                  ].map(f => (
                    <div key={f.key} className="flex items-center justify-between text-xs py-1">
                      <div>
                        <span className="text-slate-200 font-medium">{f.label}</span>
                        <span className="text-[10px] text-slate-500 block">{f.desc}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!subfunctions[f.key]}
                        onChange={() => handleToggleSubfunction(f.key)}
                        className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SECCIÓN 5: TESORERÍA, MRP & CRM */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-violet-400 font-bold text-sm">
                    <Landmark className="w-4 h-4" />
                    Tesorería, Manufactura & CRM
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/30">
                    Operaciones
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Tesorería & Cuentas Bancarias</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Conciliación, cajas chicas y flujo de efectivo.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloTesoreria}
                      onChange={() => handleToggleModule('moduloTesoreria')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Manufactura & Producción (MRP)</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Listas de Materiales (BOM) y Órdenes de Producción.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloManufactura}
                      onChange={() => handleToggleModule('moduloManufactura')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">CRM & Pipeline Comercial</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Tablero Kanban, embudo de ventas y prospectos.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloCrm}
                      onChange={() => handleToggleModule('moduloCrm')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* SECCIÓN 6: CONTABILIDAD SAT & NÓMINA DIGITAL */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-pink-400 font-bold text-sm">
                    <BookOpen className="w-4 h-4" />
                    Contabilidad Electrónica & Nómina Digital
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/30">
                    Fiscal SAT
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Contabilidad Electrónica (Anexo 24)</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Pólizas automáticas, catálogo agrupador y XML SAT.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloContabilidad}
                      onChange={() => handleToggleModule('moduloContabilidad')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Recursos Humanos & Nómina (CFDI 1.2)</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Expedientes, cálculo fiscal ISR/IMSS y timbrado de recibos.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.moduloNomina}
                      onChange={() => handleToggleModule('moduloNomina')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>

                <div className="pl-4 space-y-2 border-l-2 border-pink-500/30 py-1">
                  {[
                    { key: 'contabilidadPolizasAutomaticas', label: 'Pólizas Automáticas de Partida Doble', desc: 'Ventas, compras, cobros y pagos generan asientos' },
                    { key: 'nominaCalculoFiscal', label: 'Cálculo Automático ISR Art. 96 & IMSS', desc: 'Retenciones directas según tablas fiscales' },
                    { key: 'nominaLayoutDispersion', label: 'Layout de Dispersión Bancaria', desc: 'Archivo para pago masivo de nómina desde portal bancario' },
                  ].map(f => (
                    <div key={f.key} className="flex items-center justify-between text-xs py-1">
                      <div>
                        <span className="text-slate-200 font-medium">{f.label}</span>
                        <span className="text-[10px] text-slate-500 block">{f.desc}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!subfunctions[f.key]}
                        onChange={() => handleToggleSubfunction(f.key)}
                        className="rounded bg-slate-800 border-slate-700 text-pink-600 focus:ring-pink-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SECCIÓN 7: SUITE DE 10 REPORTES INDEPENDIENTES */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
                    <BarChart3 className="w-4 h-4" />
                    Suite de Inteligencia & 10 Reportes Avanzados
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">Interruptor Maestro:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.moduloReportes}
                        onChange={() => handleToggleModule('moduloReportes')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>
                </div>

                {formData.moduloReportes ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {[
                      { key: 'repBalanzaCxC', title: '1. Balanza de Clientes (CxC)', desc: 'Saldos globales y montos vencidos por cliente' },
                      { key: 'repAntiguedadSaldos', title: '2. Antigüedad de Saldos', desc: 'Aging por cubos de 0-30, 31-60, 61-90 y +90 días' },
                      { key: 'repIngresosRecaudacion', title: '3. Ingresos y Recaudación Real', desc: 'Flujo de efectivo real cobrado y métodos de pago' },
                      { key: 'repConciliacionFacturas', title: '4. Conciliación CRM vs Facturas', desc: 'Cruce de cotizaciones ganadas contra facturación' },
                      { key: 'repForecasting', title: '5. Pronóstico Ponderado (Forecasting)', desc: 'Proyección de ingresos según probabilidad de cierre' },
                      { key: 'repLtvClientes', title: '6. Lifetime Value (LTV)', desc: 'Valor vitalicio del cliente, ticket promedio y frecuencia' },
                      { key: 'repVentasProducto', title: '7. Ventas por Producto & Márgenes', desc: 'Rentabilidad neta, margen % y volumen por SKU' },
                      { key: 'repComisiones', title: '8. Comisiones & Liquidación Térmica', desc: 'Comisión devengada y comprobante para ticketera' },
                      { key: 'repCumplimientoCuotas', title: '9. Cumplimiento de Metas Mensuales', desc: 'Progreso de vendedores frente a su cuota en MXN' },
                      { key: 'repNotasCredito', title: '10. Notas de Crédito & Devoluciones', desc: 'Auditoría de bonificaciones y descuentos aplicados' },
                    ].map(r => (
                      <div key={r.key} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-200">{r.title}</span>
                          <span className="text-[11px] text-slate-500 block">{r.desc}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!subfunctions[r.key]}
                          onChange={() => handleToggleSubfunction(r.key)}
                          className="rounded bg-slate-800 border-slate-700 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 text-center">
                    El módulo de reportes está apagado para este negocio. Ningún reporte será accesible.
                  </p>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: CUOTAS, LÍMITES & SUSCRIPCIÓN SAAS */}
          {activeTab === 'LIMITES' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-4xl">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-purple-400" />
                  Cuotas de Infraestructura y Políticas de Cobro SaaS
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Control de planes comerciales, límites y bloqueos por morosidad.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Plan de Suscripción
                  </label>
                  <select
                    value={formData.planSuscripcion}
                    onChange={(e) => setFormData({ ...formData, planSuscripcion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="DEMO">DEMO (Prueba 15 días)</option>
                    <option value="BASICO">BÁSICO (Punto de Venta / Retail)</option>
                    <option value="PROFESIONAL">PROFESIONAL (Distribución)</option>
                    <option value="ENTERPRISE">ENTERPRISE (Full Suite Ilimitado)</option>
                    <option value="PERSONALIZADO">PERSONALIZADO (Tarifa a medida)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Fecha de Vencimiento de la Suscripción
                  </label>
                  <input
                    type="date"
                    value={formData.fechaVencimientoPlan ? formData.fechaVencimientoPlan.split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, fechaVencimientoPlan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Límite Máximo de Usuarios
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.limiteUsuarios}
                    onChange={(e) => setFormData({ ...formData, limiteUsuarios: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Usuarios actuales registrados: {formData._count?.usuarios ?? 0}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Límite Máximo de Almacenes Físicos
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.limiteAlmacenes}
                    onChange={(e) => setFormData({ ...formData, limiteAlmacenes: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Almacenes creados actualmente: {formData._count?.almacenes ?? 0}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Días de Gracia de Suscripción (Antes del Bloqueo)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.diasGraciaSuscripcion}
                    onChange={(e) => setFormData({ ...formData, diasGraciaSuscripcion: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Bloqueo Manual Inmediato
                    </span>
                    <p className="text-[11px] text-rose-200/70 mt-0.5">Suspende de inmediato el acceso a todos los usuarios de este negocio.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.bloqueadoPorSuscripcion}
                    onChange={(e) => setFormData({ ...formData, bloqueadoPorSuscripcion: e.target.checked })}
                    className="rounded bg-slate-800 border-rose-500 text-rose-600 focus:ring-rose-500 w-5 h-5 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Notas Privadas del Superadmin (Acuerdos, Facturación o Contrato)
                </label>
                <textarea
                  rows={3}
                  value={formData.notasSuperadmin || ''}
                  onChange={(e) => setFormData({ ...formData, notasSuperadmin: e.target.value })}
                  placeholder="Ej: Cliente pactó pago trimestral por transferencia SPEI. Incluye soporte VIP."
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: POLÍTICAS DE CRÉDITO DEL NEGOCIO */}
          {activeTab === 'CREDITO' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-4xl">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  Políticas de Crédito & Cartera para este Negocio
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Define cómo se comportará el control de crédito en las ventas a sus clientes.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Política de Bloqueo por Crédito Vencido o Sobregiro
                  </label>
                  <select
                    value={formData.politicaBloqueoCredito}
                    onChange={(e) => setFormData({ ...formData, politicaBloqueoCredito: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="ESTRICTO">ESTRICTO (Bloqueo Total en POS y Ventas)</option>
                    <option value="ADVERTENCIA">ADVERTENCIA (Muestra alerta pero permite continuar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Días de Gracia en Cobranza
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.diasGraciaCredito}
                    onChange={(e) => setFormData({ ...formData, diasGraciaCredito: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Días después del vencimiento antes de considerar al cliente moroso.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Alerta Preventiva de Vencimiento (Días Previos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.alertaVencimientoDias}
                    onChange={(e) => setFormData({ ...formData, alertaVencimientoDias: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Días antes de que venza una factura para mostrar semáforo amarillo.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FACTURACIÓN SAT & CONFIGURACIÓN PAC */}
          {activeTab === 'PAC' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-4xl">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    Parámetros Fiscales & Conector PAC (CFDI 4.0)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Configuración de timbrado fiscal para ventas, cobros y traslados.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.moduloFacturacionSAT}
                    onChange={() => handleToggleModule('moduloFacturacionSAT')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {formData.moduloFacturacionSAT ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Proveedor PAC Autorizado
                    </label>
                    <select
                      value={formData.pacProveedor || 'FINKOK'}
                      onChange={(e) => setFormData({ ...formData, pacProveedor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="FINKOK">FINKOK (Web Services Oficial)</option>
                      <option value="SW_SAPIEN">SW SAPIEN (SmarterWeb)</option>
                      <option value="PRODIGIA">PRODIGIA</option>
                      <option value="SIMULADOR">SIMULADOR INTERNO (Modo Pruebas)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">Ambiente de Timbrado</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formData.pacModoProduccion ? 'Producción SAT (Timbre Real)' : 'Sandbox / Pruebas'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.pacModoProduccion ?? false}
                        onChange={(e) => setFormData({ ...formData, pacModoProduccion: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Usuario / Contrato PAC
                    </label>
                    <input
                      type="text"
                      value={formData.pacUsuario || ''}
                      onChange={(e) => setFormData({ ...formData, pacUsuario: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Contraseña PAC
                    </label>
                    <input
                      type="password"
                      value={formData.pacPassword || ''}
                      onChange={(e) => setFormData({ ...formData, pacPassword: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 md:col-span-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Serie Factura
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={formData.serieFactura || 'A'}
                        onChange={(e) => setFormData({ ...formData, serieFactura: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 text-center font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Serie REP
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={formData.seriePagoRep || 'P'}
                        onChange={(e) => setFormData({ ...formData, seriePagoRep: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 text-center font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Serie Carta Porte
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={formData.serieCartaPorte || 'CP'}
                        onChange={(e) => setFormData({ ...formData, serieCartaPorte: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 text-center font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                  El timbrado fiscal SAT está desactivado para este negocio. Las ventas se procesarán como remisiones y tickets internos.
                </p>
              )}
            </div>
          )}

          {/* TAB 5: MARCA, IDENTIDAD & COLOR */}
          {activeTab === 'BRANDING' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Personalización de Marca & Color Primario
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">El sistema aplicará este color en los botones principales, badges y encabezados.</p>
                </div>

                {/* Paletas recomendadas */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Paletas Fintech Predefinidas
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {PALETAS_COLOR.map(p => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setFormData({ ...formData, colorPrimario: p.hex })}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                          formData.colorPrimario === p.hex
                            ? 'border-white bg-slate-800 shadow-md'
                            : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/80'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: p.hex }} />
                        <span className="text-[11px] text-slate-200 truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input HEX personalizado */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Código de Color HEX Personalizado
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.colorPrimario || '#1e40af'}
                      onChange={(e) => setFormData({ ...formData, colorPrimario: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-slate-950 border border-slate-700 p-0.5"
                    />
                    <input
                      type="text"
                      value={formData.colorPrimario || '#1e40af'}
                      onChange={(e) => setFormData({ ...formData, colorPrimario: e.target.value })}
                      className="w-36 bg-slate-950 border border-slate-700 text-white text-xs font-mono rounded-xl px-3 py-2 uppercase font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Texto en Encabezado / Pie de Tickets
                  </label>
                  <input
                    type="text"
                    value={formData.textoEncabezadoDoc || ''}
                    onChange={(e) => setFormData({ ...formData, textoEncabezadoDoc: e.target.value })}
                    placeholder="Ej: ¡Gracias por su compra! Garantía de 30 días con su ticket."
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* PREVIEW EN VIVO DE CÓMO SE VE EL ERP */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400" />
                    Vista Previa en Tiempo Real del ERP
                  </h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Previsualización
                  </span>
                </div>

                {/* Simulador de interfaz de usuario con el color del Tenant */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                  {/* Barra superior simulada */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                        style={{ backgroundColor: formData.colorPrimario }}
                      >
                        {formData.nombreComercial.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-white">{formData.nombreComercial}</span>
                    </div>

                    <span 
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full text-white font-semibold shadow-sm"
                      style={{ backgroundColor: formData.colorPrimario }}
                    >
                      {formData.planSuscripcion}
                    </span>
                  </div>

                  {/* Botones simulados */}
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Botones y Acciones Principales:</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-md transition-transform"
                        style={{ backgroundColor: formData.colorPrimario }}
                      >
                        + Nueva Venta / Cobro
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white border border-white/20 bg-slate-900"
                      >
                        Ver Kárdex
                      </button>
                    </div>
                  </div>

                  {/* Tarjeta KPI simulada */}
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Ventas de Hoy</span>
                    <span className="text-base font-bold font-mono text-white">$45,820.00 MXN</span>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: '68%', backgroundColor: formData.colorPrimario }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SOVEREIGN FLOATING ACTION BAR */}
      {formData && (
        <div className="fixed bottom-4 left-4 right-4 md:left-72 z-40 bg-slate-950/95 backdrop-blur-md border border-slate-800 px-5 py-3.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-xs text-white font-semibold">
                Negocio: <span className="font-bold">{formData.nombreComercial}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {totalModulosActivos} de {totalPosibles} componentes y microfunciones autorizados
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={fetchTenants}
              disabled={saving}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              Descartar
            </button>

            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-900/30 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Configuración Extrema</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
