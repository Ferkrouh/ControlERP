'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Boxes, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  History, 
  Barcode, 
  ArrowRight,
  Eye,
  SlidersHorizontal,
  ClipboardEdit,
  Warehouse,
  ArrowLeftRight,
  Edit2,
  Trash2,
  Check,
  Star,
  Layers,
  FileSpreadsheet,
  ArrowUpDown,
  DollarSign,
  PackageCheck,
  XCircle,
  X
} from 'lucide-react';
import Link from 'next/link';

export default function InventariosPage() {
  const { user } = useAuth();
  const [productos, setProductos] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [selectedAlmacen, setSelectedAlmacen] = useState('TODOS');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'articulos' | 'almacenes'>('articulos');
  const [viewMode, setViewMode] = useState<'GRID' | 'LEDGER'>('GRID');
  const [stockStatusFilter, setStockStatusFilter] = useState<'TODOS' | 'OPTIMO' | 'BAJO_MINIMO' | 'AGOTADO'>('TODOS');
  const [sortField, setSortField] = useState<'sku' | 'nombre' | 'existencia' | 'precio'>('sku');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal Alta / Edición de Almacén
  const [showAlmacenModal, setShowAlmacenModal] = useState(false);
  const [editingAlmacen, setEditingAlmacen] = useState<any>(null);
  const [almNombre, setAlmNombre] = useState('');
  const [almUbicacion, setAlmUbicacion] = useState('');
  const [almEsPrincipal, setAlmEsPrincipal] = useState(false);
  const [savingAlmacen, setSavingAlmacen] = useState(false);
  const [almacenError, setAlmacenError] = useState('');
  const [almacenSuccess, setAlmacenSuccess] = useState('');

  // Modal Alta Producto
  const [showModal, setShowModal] = useState(false);
  const [sku, setSku] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Herramientas');
  const [unidadMedida, setUnidadMedida] = useState('PZA');
  const [costoPromedio, setCostoPromedio] = useState(100);
  const [precioVenta, setPrecioVenta] = useState(180);
  const [stockMinimo, setStockMinimo] = useState(10);
  const [almacenInicialId, setAlmacenInicialId] = useState('');
  const [stockInicial, setStockInicial] = useState(25);
  const [saving, setSaving] = useState(false);

  // Modal Kárdex
  const [kardexProducto, setKardexProducto] = useState<any>(null);

  // Modal Ajuste / Merma
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [ajusteProductoId, setAjusteProductoId] = useState('');
  const [ajusteAlmacenId, setAjusteAlmacenId] = useState('');
  const [ajusteStockActual, setAjusteStockActual] = useState(0);
  const [ajusteNuevoStock, setAjusteNuevoStock] = useState(0);
  const [ajusteMotivo, setAjusteMotivo] = useState('CONTEO_FISICO');
  const [ajusteObs, setAjusteObs] = useState('');
  const [savingAjuste, setSavingAjuste] = useState(false);
  const [ajusteError, setAjusteError] = useState('');

  useEffect(() => {
    if (user?.tenantId) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resProd, resAlm] = await Promise.all([
        fetch(`/api/productos?tenantId=${user?.tenantId}`),
        fetch(`/api/almacenes?tenantId=${user?.tenantId}`),
      ]);

      if (resProd.ok && resAlm.ok) {
        const prodData = await resProd.json();
        const almData = await resAlm.json();
        setProductos(prodData);
        setAlmacenes(almData);
        if (almData.length > 0 && !almacenInicialId) {
          setAlmacenInicialId(almData[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) return;

    setSaving(true);
    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: user.tenantId,
          sku,
          codigoBarras,
          nombre,
          categoria,
          unidadMedida,
          costoPromedio: Number(costoPromedio),
          precioVenta: Number(precioVenta),
          stockMinimo: Number(stockMinimo),
          almacenInicialId,
          stockInicial: Number(stockInicial),
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setSku('');
        setCodigoBarras('');
        setNombre('');
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCreateAlmacen = () => {
    setEditingAlmacen(null);
    setAlmNombre('');
    setAlmUbicacion('');
    setAlmEsPrincipal(false);
    setAlmacenError('');
    setAlmacenSuccess('');
    setShowAlmacenModal(true);
  };

  const handleOpenEditAlmacen = (alm: any) => {
    setEditingAlmacen(alm);
    setAlmNombre(alm.nombre);
    setAlmUbicacion(alm.ubicacion || '');
    setAlmEsPrincipal(alm.esPrincipal);
    setAlmacenError('');
    setAlmacenSuccess('');
    setShowAlmacenModal(true);
  };

  const handleSaveAlmacen = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAlmacen(true);
    setAlmacenError('');
    setAlmacenSuccess('');

    try {
      if (editingAlmacen) {
        const res = await fetch(`/api/almacenes/${editingAlmacen.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: almNombre,
            ubicacion: almUbicacion,
            esPrincipal: almEsPrincipal,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setAlmacenSuccess('Almacén actualizado correctamente.');
          setTimeout(() => {
            setShowAlmacenModal(false);
            loadData();
          }, 600);
        } else {
          setAlmacenError(data.error || 'Error al actualizar almacén.');
        }
      } else {
        const res = await fetch('/api/almacenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: almNombre,
            ubicacion: almUbicacion,
            esPrincipal: almEsPrincipal,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setAlmacenSuccess('Almacén creado exitosamente.');
          setTimeout(() => {
            setShowAlmacenModal(false);
            loadData();
          }, 600);
        } else {
          setAlmacenError(data.error || 'Error al crear almacén.');
        }
      }
    } catch (err) {
      setAlmacenError('Error de comunicación con el servidor.');
    } finally {
      setSavingAlmacen(false);
    }
  };

  const handleDeleteAlmacen = async (almId: string, almNombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el almacén "${almNombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/almacenes/${almId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        alert('Almacén eliminado correctamente.');
        loadData();
      } else {
        alert(data.error || 'No se pudo eliminar el almacén.');
      }
    } catch (err) {
      alert('Error de conexión al intentar eliminar el almacén.');
    }
  };

  const handleOpenAjuste = (producto?: any) => {
    setAjusteError('');
    if (almacenes.length > 0) {
      const almId = selectedAlmacen !== 'TODOS' ? selectedAlmacen : almacenes[0].id;
      setAjusteAlmacenId(almId);

      const prod = producto || (productos.length > 0 ? productos[0] : null);
      if (prod) {
        setAjusteProductoId(prod.id);
        const ex = prod.existencias?.find((e: any) => e.almacenId === almId);
        const stockActual = ex ? ex.cantidad : 0;
        setAjusteStockActual(stockActual);
        setAjusteNuevoStock(stockActual);
      }
    }
    setShowAjusteModal(true);
  };

  const handleSaveAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAjuste(true);
    setAjusteError('');

    try {
      const res = await fetch('/api/inventarios/ajustes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          almacenId: ajusteAlmacenId,
          motivo: ajusteMotivo,
          observaciones: ajusteObs,
          items: [
            {
              productoId: ajusteProductoId,
              cantidadNueva: Number(ajusteNuevoStock),
            },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowAjusteModal(false);
        setAjusteObs('');
        loadData();
      } else {
        setAjusteError(data.error || 'Error al aplicar ajuste.');
      }
    } catch (err) {
      setAjusteError('Error de comunicación con el servidor.');
    } finally {
      setSavingAjuste(false);
    }
  };

  const isAlmacenista = user?.rol === 'ALMACENISTA';
  const isReadOnly = user?.rol === 'AUDITOR';

  // Métricas Consolidadas de Inventario
  const inventoryStats = useMemo(() => {
    const totalArticulos = productos.length;
    let valuacionTotal = 0;
    let totalUnidades = 0;
    let articulosBajoMinimo = 0;

    productos.forEach((p) => {
      const stockTotal = p.existencias?.reduce((acc: number, e: any) => acc + e.cantidad, 0) || 0;
      valuacionTotal += (p.costoPromedio || 0) * stockTotal;
      totalUnidades += stockTotal;
      if (stockTotal < p.stockMinimo) {
        articulosBajoMinimo++;
      }
    });

    return {
      totalArticulos,
      valuacionTotal,
      totalUnidades,
      articulosBajoMinimo,
      totalAlmacenes: almacenes.length,
    };
  }, [productos, almacenes]);

  // Filtrado y Ordenamiento de Productos
  const filteredAndSortedProductos = useMemo(() => {
    let result = productos.filter((p) => {
      const matchSearch =
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.codigoBarras && p.codigoBarras.includes(search)) ||
        (p.categoria && p.categoria.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      let totalStock = 0;
      if (selectedAlmacen === 'TODOS') {
        totalStock = p.existencias?.reduce((acc: number, e: any) => acc + e.cantidad, 0) || 0;
      } else {
        const ex = p.existencias?.find((e: any) => e.almacenId === selectedAlmacen);
        totalStock = ex ? ex.cantidad : 0;
      }

      if (stockStatusFilter === 'OPTIMO' && totalStock < p.stockMinimo) return false;
      if (stockStatusFilter === 'BAJO_MINIMO' && (totalStock >= p.stockMinimo || totalStock <= 0)) return false;
      if (stockStatusFilter === 'AGOTADO' && totalStock > 0) return false;

      return true;
    });

    result.sort((a, b) => {
      if (sortField === 'sku') {
        return sortAsc ? a.sku.localeCompare(b.sku) : b.sku.localeCompare(a.sku);
      }
      if (sortField === 'nombre') {
        return sortAsc ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre);
      }
      if (sortField === 'existencia') {
        const getStock = (item: any) => {
          if (selectedAlmacen === 'TODOS') {
            return item.existencias?.reduce((acc: number, e: any) => acc + e.cantidad, 0) || 0;
          }
          const ex = item.existencias?.find((e: any) => e.almacenId === selectedAlmacen);
          return ex ? ex.cantidad : 0;
        };
        const stockA = getStock(a);
        const stockB = getStock(b);
        return sortAsc ? stockA - stockB : stockB - stockA;
      }
      if (sortField === 'precio') {
        return sortAsc ? (a.precioVenta || 0) - (b.precioVenta || 0) : (b.precioVenta || 0) - (a.precioVenta || 0);
      }
      return 0;
    });

    return result;
  }, [productos, search, selectedAlmacen, stockStatusFilter, sortField, sortAsc]);

  // Exportar Inventario Valuado en CSV
  const handleExportCSV = () => {
    if (filteredAndSortedProductos.length === 0) return;

    const headers = [
      'SKU',
      'CodigoBarras',
      'Nombre',
      'Categoria',
      'Unidad',
      'CostoPromedio',
      'PrecioVenta',
      'StockActual',
      'StockMinimo',
      'ValorInventarioValuado',
      'EstadoStock'
    ];

    const rows = filteredAndSortedProductos.map((p) => {
      let totalStock = 0;
      if (selectedAlmacen === 'TODOS') {
        totalStock = p.existencias?.reduce((acc: number, e: any) => acc + e.cantidad, 0) || 0;
      } else {
        const ex = p.existencias?.find((e: any) => e.almacenId === selectedAlmacen);
        totalStock = ex ? ex.cantidad : 0;
      }

      const estado = totalStock <= 0 ? 'AGOTADO' : totalStock < p.stockMinimo ? 'BAJO_MINIMO' : 'OPTIMO';
      const valor = (p.costoPromedio || 0) * totalStock;

      return [
        `"${p.sku}"`,
        `"${p.codigoBarras || ''}"`,
        `"${p.nombre.replace(/"/g, '""')}"`,
        `"${p.categoria || ''}"`,
        `"${p.unidadMedida}"`,
        p.costoPromedio || 0,
        p.precioVenta || 0,
        totalStock,
        p.stockMinimo || 0,
        valor.toFixed(2),
        `"${estado}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Inventario_Valuado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Cabecera Ejecutiva Soberana - The Fintech Ledger */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-blue-400" /> Control Integral de Inventarios
            </span>
            <span className="text-xs text-slate-400">
              Kárdex Transaccional • Método Costo Promedio (CFF Art. 28)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Gestión Multialmacén & Valuación de Existencias
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            Monitorea existencias físicas en tiempo real, administra centros de distribución, ejecuta traspasos y formula ajustes de merma auditados.
          </p>
        </div>

        {/* Botones de Acción Rápida */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
          {user?.tenant?.moduloTraspasos && (
            <Link
              href="/traspasos"
              className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" /> Traspasos
            </Link>
          )}

          {!isAlmacenista && !isReadOnly && (
            <button
              onClick={handleOpenCreateAlmacen}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Warehouse className="w-3.5 h-3.5 text-blue-400" /> + Crear Almacén
            </button>
          )}

          {!isReadOnly && (
            <button
              onClick={() => handleOpenAjuste()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" /> Ajuste / Merma
            </button>
          )}

          {!isAlmacenista && !isReadOnly && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {isAlmacenista && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium">
          <Boxes className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Vista de Operación de Almacén: Enfocada en conteos físicos y códigos de barras. Los costos unitarios se encuentran restringidos por política de seguridad.</span>
        </div>
      )}

      {/* 2. Tarjetas Flotantes KPI de Inventario (Card Float) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Artículos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Artículos en Catálogo</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {inventoryStats.totalArticulos}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700 font-mono">{inventoryStats.totalUnidades}</span> unidades totales
          </p>
        </div>

        {/* Valuación Monetaria */}
        {!isAlmacenista && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Inventario Valuado</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
              ${inventoryStats.valuacionTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Costo Promedio Ponderado MXN
            </p>
          </div>
        )}

        {/* Artículos Bajo Mínimo */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Alerta de Desabasto</span>
            {inventoryStats.articulosBajoMinimo > 0 ? (
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-slate-100 text-slate-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
          </div>
          <p className={`text-2xl font-bold font-mono mt-2 ${inventoryStats.articulosBajoMinimo > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {inventoryStats.articulosBajoMinimo}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Artículos por debajo del stock mínimo
          </p>
        </div>

        {/* Almacenes Físicos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Almacenes en Red</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {inventoryStats.totalAlmacenes}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Centros logísticos y bodegas activas
          </p>
        </div>
      </div>

      {/* 3. Pestañas de Navegación: Catálogo vs Almacenes */}
      <div className="flex border-b border-slate-200 gap-8">
        <button
          onClick={() => setActiveTab('articulos')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'articulos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" /> Catálogo de Artículos & Existencias ({productos.length})
        </button>

        <button
          onClick={() => setActiveTab('almacenes')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'almacenes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Warehouse className="w-4 h-4" /> Almacenes Físicos & Sucursales ({almacenes.length})
        </button>
      </div>

      {/* Vista de Catálogo de Artículos */}
      {activeTab === 'articulos' && (
        <div className="space-y-4">
          {/* Barra Unificada de Filtros y Conmutador de Vista */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Buscador Rápido */}
            <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, SKU, código de barras o categoría..."
                className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="p-0.5 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selectores de Almacén, Estado y Conmutador */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Almacén */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-medium">Almacén:</span>
                <select
                  value={selectedAlmacen}
                  onChange={(e) => setSelectedAlmacen(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="TODOS">Consolidado (Todos)</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} {a.esPrincipal ? '★' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estado de Stock */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl">
                <PackageCheck className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-medium">Estado:</span>
                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value as any)}
                  className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos los Estados</option>
                  <option value="OPTIMO">Stock Óptimo</option>
                  <option value="BAJO_MINIMO">Bajo Mínimo</option>
                  <option value="AGOTADO">Agotados (0)</option>
                </select>
              </div>

              {/* Conmutador Grid ↔ Ledger */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'GRID' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vista de Tarjetas Espaciales con desglose por almacén"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Tarjetas</span>
                </button>

                <button
                  onClick={() => setViewMode('LEDGER')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'LEDGER' 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vista Contable Densa de Alta Definición con ordenamiento"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Ledger</span>
                </button>
              </div>

              {/* Botón Exportar CSV */}
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                title="Exportar inventario valuado en CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Renderizado Condicional: Grid vs Ledger */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <Boxes className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Cargando inventarios multialmacén...</p>
            </div>
          ) : filteredAndSortedProductos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm max-w-md mx-auto">
              <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">Sin Artículos Coincidentes</h3>
              <p className="text-xs text-slate-500 mt-1">
                No hay productos en el catálogo que coincidan con los filtros de búsqueda o estado de stock.
              </p>
              <button
                onClick={() => { setSearch(''); setSelectedAlmacen('TODOS'); setStockStatusFilter('TODOS'); }}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : viewMode === 'GRID' ? (
            /* VISTA 1: GRID DE TARJETAS ESPACIALES (THE SPATIAL INVENTORY CARDS) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedProductos.map((prod) => {
                let totalStock = 0;
                if (selectedAlmacen === 'TODOS') {
                  totalStock = prod.existencias?.reduce((acc: number, e: any) => acc + e.cantidad, 0) || 0;
                } else {
                  const ex = prod.existencias?.find((e: any) => e.almacenId === selectedAlmacen);
                  totalStock = ex ? ex.cantidad : 0;
                }

                const isAgotado = totalStock <= 0;
                const isBajoMinimo = totalStock > 0 && totalStock < prod.stockMinimo;
                const stockMin = prod.stockMinimo || 1;
                const stockPct = Math.min(100, Math.round((totalStock / stockMin) * 100));

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4"
                  >
                    {/* Header de la Tarjeta */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-md">
                            {prod.categoria || 'Sin Categoría'}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug">
                            {prod.nombre}
                          </h3>
                        </div>
                        
                        {/* Badge de Estado */}
                        {isAgotado ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">
                            <XCircle className="w-3 h-3 text-rose-600" /> Agotado
                          </span>
                        ) : isBajoMinimo ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Bajo Mínimo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Óptimo
                          </span>
                        )}
                      </div>

                      {/* Identificadores Fiscales */}
                      <div className="flex items-center gap-3 text-xs font-mono text-slate-500 pt-0.5">
                        <span className="font-bold text-blue-700">{prod.sku}</span>
                        {prod.codigoBarras && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Barcode className="w-3.5 h-3.5" /> {prod.codigoBarras}
                          </span>
                        )}
                      </div>

                      {/* Nivel de Stock con Barra de Progreso */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Existencia Actual:</span>
                          <span className={`font-mono font-bold text-sm ${isAgotado ? 'text-rose-600' : isBajoMinimo ? 'text-amber-700' : 'text-slate-900'}`}>
                            {totalStock} {prod.unidadMedida}
                          </span>
                        </div>

                        {/* Barra de Cobertura */}
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isAgotado ? 'bg-rose-500' : isBajoMinimo ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${stockPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-0.5">
                          <span>Mínimo: {prod.stockMinimo} {prod.unidadMedida}</span>
                          <span>{stockPct}% cubierto</span>
                        </div>
                      </div>

                      {/* Desglose de Existencias por Almacén */}
                      <div className="space-y-1">
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                          Stock en Almacenes:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {almacenes.map((a) => {
                            const ex = prod.existencias?.find((x: any) => x.almacenId === a.id);
                            const q = ex ? ex.cantidad : 0;
                            return (
                              <span
                                key={a.id}
                                className={`text-xs px-2 py-0.5 rounded-lg border font-mono ${
                                  q > 0
                                    ? 'bg-white text-slate-700 border-slate-200 font-medium'
                                    : 'bg-slate-50 text-slate-400 border-slate-100'
                                }`}
                              >
                                {a.nombre.slice(0, 10)}: <strong className={q > 0 ? 'text-slate-900' : 'text-slate-400'}>{q}</strong>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Costo y Precio (si no es almacenista) */}
                      {!isAlmacenista && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                          <div>
                            <span className="text-slate-400 block font-medium">Costo Promedio:</span>
                            <span className="font-mono font-semibold text-slate-700">
                              ${(prod.costoPromedio || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block font-medium">Precio Venta:</span>
                            <span className="font-mono font-bold text-slate-900">
                              ${(prod.precioVenta || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acciones de la Tarjeta */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setKardexProducto(prod)}
                        className="text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border border-blue-200/60"
                        title="Ver historial de movimientos en kárdex"
                      >
                        <History className="w-3.5 h-3.5" /> Kárdex
                      </button>

                      {!isReadOnly && (
                        <button
                          onClick={() => handleOpenAjuste(prod)}
                          className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                          title="Ajustar existencia o registrar merma"
                        >
                          <ClipboardEdit className="w-3.5 h-3.5 text-slate-600" /> Ajustar Stock
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA 2: TABLA CONTABLE DENSA (THE DENSE INVENTORY TABLE) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th
                        className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => { setSortField('sku'); setSortAsc(!sortAsc); }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>SKU / Código</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => { setSortField('nombre'); setSortAsc(!sortAsc); }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Descripción del Artículo</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4 text-center">U.M.</th>
                      {!isAlmacenista && <th className="py-3 px-4 text-right">Costo Promedio</th>}
                      {!isAlmacenista && (
                        <th
                          className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => { setSortField('precio'); setSortAsc(!sortAsc); }}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Precio Venta</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                      )}
                      <th
                        className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => { setSortField('existencia'); setSortAsc(!sortAsc); }}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Existencia</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center">Estado Stock</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedProductos.map((prod) => {
                      let totalStock = 0;
                      if (selectedAlmacen === 'TODOS') {
                        totalStock = prod.existencias?.reduce((acc: number, e: any) => acc + e.cantidad, 0) || 0;
                      } else {
                        const ex = prod.existencias?.find((e: any) => e.almacenId === selectedAlmacen);
                        totalStock = ex ? ex.cantidad : 0;
                      }

                      const isAgotado = totalStock <= 0;
                      const isBajoMinimo = totalStock > 0 && totalStock < prod.stockMinimo;

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* SKU y Código */}
                          <td className="py-3 px-4">
                            <p className="font-mono font-bold text-blue-700">{prod.sku}</p>
                            {prod.codigoBarras && (
                              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                <Barcode className="w-3 h-3" /> {prod.codigoBarras}
                              </span>
                            )}
                          </td>

                          {/* Descripción */}
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900 leading-snug">{prod.nombre}</p>
                          </td>

                          {/* Categoría */}
                          <td className="py-3 px-4 text-slate-600">
                            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">
                              {prod.categoria}
                            </span>
                          </td>

                          {/* Unidad de Medida */}
                          <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                            {prod.unidadMedida}
                          </td>

                          {/* Costo Promedio */}
                          {!isAlmacenista && (
                            <td className="py-3 px-4 text-right font-mono font-medium text-slate-600">
                              ${(prod.costoPromedio || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                          )}

                          {/* Precio de Venta */}
                          {!isAlmacenista && (
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              ${(prod.precioVenta || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                          )}

                          {/* Existencia Total */}
                          <td className="py-3 px-4 text-right">
                            <span className={`text-sm font-bold font-mono ${isAgotado ? 'text-rose-600' : isBajoMinimo ? 'text-amber-700' : 'text-slate-900'}`}>
                              {totalStock} {prod.unidadMedida}
                            </span>
                          </td>

                          {/* Estado de Stock */}
                          <td className="py-3 px-4 text-center">
                            {isAgotado ? (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3 text-rose-600" /> Agotado
                              </span>
                            ) : isBajoMinimo ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Bajo Mín ({prod.stockMinimo})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Óptimo
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setKardexProducto(prod)}
                                className="text-xs text-blue-700 hover:text-blue-800 font-semibold inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/60"
                                title="Ver kárdex de movimientos"
                              >
                                <History className="w-3.5 h-3.5" /> Kárdex
                              </button>

                              {!isReadOnly && (
                                <button
                                  onClick={() => handleOpenAjuste(prod)}
                                  className="text-xs text-slate-700 hover:text-slate-900 font-semibold inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg"
                                  title="Ajustar existencia o registrar merma"
                                >
                                  <ClipboardEdit className="w-3.5 h-3.5 text-slate-600" />
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
        </div>
      )}

      {/* Vista de Gestión de Almacenes y Sucursales */}
      {activeTab === 'almacenes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-blue-600" />
                Catálogo de Almacenes Físicos y Sucursales
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea y administra los centros logísticos para ventas, compras y traspasos internos de mercancía.
              </p>
            </div>

            {!isAlmacenista && !isReadOnly && (
              <button
                onClick={handleOpenCreateAlmacen}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Nuevo Almacén
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {almacenes.map((alm) => {
              const totalItems = alm.existencias?.reduce((sum: number, ex: any) => sum + (ex.cantidad > 0 ? 1 : 0), 0) || 0;
              const totalUnidades = alm.existencias?.reduce((sum: number, ex: any) => sum + ex.cantidad, 0) || 0;

              return (
                <div
                  key={alm.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  {alm.esPrincipal && (
                    <div className="absolute top-0 right-0 bg-amber-100 text-amber-900 border-b border-l border-amber-300 font-bold text-xs px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-xs">
                      <Star className="w-3 h-3 fill-amber-600 text-amber-600" /> Almacén Principal
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold border border-blue-200/60">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-400">{alm.codigo}</span>
                        <h4 className="font-bold text-slate-900 text-sm tracking-tight">{alm.nombre}</h4>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1 pt-1">
                      <p className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">Ubicación:</span>
                        <span>{alm.ubicacion || 'Sin dirección física especificada'}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Artículos Activos</p>
                        <p className="text-base font-bold font-mono text-slate-800 mt-0.5">{totalItems}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Stock Físico</p>
                        <p className="text-base font-bold font-mono text-blue-700 mt-0.5">{totalUnidades}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <Link
                      href="/traspasos"
                      className="text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Traspasar Stock
                    </Link>

                    {!isAlmacenista && !isReadOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditAlmacen(alm)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition-colors border border-slate-200"
                          title="Editar almacén"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!alm.esPrincipal && (
                          <button
                            onClick={() => handleDeleteAlmacen(alm.id, alm.nombre)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-slate-100 transition-colors border border-slate-200"
                            title="Eliminar almacén"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Kárdex de Movimientos (The Sovereign Lift) */}
      {kardexProducto && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  Kárdex Valuado: {kardexProducto.nombre}
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  SKU: {kardexProducto.sku} • Costo Promedio Ponderado (CFF Art. 28)
                </p>
              </div>
              <button
                onClick={() => setKardexProducto(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-100 rounded-xl">
              {kardexProducto.movimientos && kardexProducto.movimientos.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Tipo Movimiento</th>
                      <th className="py-2.5 px-3 text-right">Cantidad</th>
                      {!isAlmacenista && <th className="py-2.5 px-3 text-right">Costo Unitario</th>}
                      <th className="py-2.5 px-3 text-right">Saldo Final</th>
                      <th className="py-2.5 px-3">Motivo / Folio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kardexProducto.movimientos.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 text-slate-500 font-mono">{new Date(m.fecha).toLocaleDateString('es-MX')}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{m.tipoMovimiento}</td>
                        <td className="py-2 px-3 text-right font-bold font-mono">{m.cantidad}</td>
                        {!isAlmacenista && <td className="py-2 px-3 text-right font-mono">${m.costoUnitario.toFixed(2)}</td>}
                        <td className="py-2 px-3 text-right font-bold font-mono text-blue-700">{m.saldoResultante}</td>
                        <td className="py-2 px-3 text-slate-600">{m.motivo || m.folioReferencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-400 p-8 text-center">No hay registros de movimientos recientes en el kárdex.</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setKardexProducto(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cerrar Kárdex
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Producto */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" /> Alta de Nuevo Artículo en Catálogo
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProducto} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Clave *</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código de Barras</label>
                  <input
                    type="text"
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unidad de Medida</label>
                  <select
                    value={unidadMedida}
                    onChange={(e) => setUnidadMedida(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none"
                  >
                    <option value="PZA">PZA - Pieza</option>
                    <option value="KG">KG - Kilogramo</option>
                    <option value="LTS">LTS - Litro</option>
                    <option value="MTS">MTS - Metro</option>
                    <option value="CAJA">CAJA - Caja</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Costo Unitario ($)</label>
                  <input
                    type="number"
                    value={costoPromedio}
                    onChange={(e) => setCostoPromedio(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Almacén Inicial</label>
                  <select
                    value={almacenInicialId}
                    onChange={(e) => setAlmacenInicialId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Existencia Inicial (Pzas)</label>
                  <input
                    type="number"
                    value={stockInicial}
                    onChange={(e) => setStockInicial(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold font-mono bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajuste de Inventario / Registro de Merma */}
      {showAjusteModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                Ajuste de Stock / Registro de Merma
              </h3>
              <button
                onClick={() => setShowAjusteModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAjuste} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Almacén a Afectar *</label>
                <select
                  value={ajusteAlmacenId}
                  onChange={(e) => {
                    const almId = e.target.value;
                    setAjusteAlmacenId(almId);
                    const prod = productos.find((p) => p.id === ajusteProductoId);
                    if (prod) {
                      const ex = prod.existencias?.find((x: any) => x.almacenId === almId);
                      const st = ex ? ex.cantidad : 0;
                      setAjusteStockActual(st);
                      setAjusteNuevoStock(st);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  required
                >
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Artículo del Catálogo *</label>
                <select
                  value={ajusteProductoId}
                  onChange={(e) => {
                    const prodId = e.target.value;
                    setAjusteProductoId(prodId);
                    const prod = productos.find((p) => p.id === prodId);
                    if (prod) {
                      const ex = prod.existencias?.find((x: any) => x.almacenId === ajusteAlmacenId);
                      const st = ex ? ex.cantidad : 0;
                      setAjusteStockActual(st);
                      setAjusteNuevoStock(st);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  required
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Stock en Sistema</label>
                  <p className="text-base font-bold font-mono text-slate-700">
                    {ajusteStockActual} {productos.find((p) => p.id === ajusteProductoId)?.unidadMedida || 'PZA'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-700 mb-1">Conteo Físico Real *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={ajusteNuevoStock}
                    onChange={(e) => setAjusteNuevoStock(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm font-bold font-mono border border-blue-300 rounded-xl text-slate-900 bg-white"
                    required
                  />
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Diferencia: {ajusteNuevoStock - ajusteStockActual > 0 ? `+${ajusteNuevoStock - ajusteStockActual}` : ajusteNuevoStock - ajusteStockActual}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo del Ajuste *</label>
                <select
                  value={ajusteMotivo}
                  onChange={(e) => setAjusteMotivo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="CONTEO_FISICO">Conteo Físico / Inventario Cíclico</option>
                  <option value="MERMA">Merma Operativa</option>
                  <option value="MERMA_CADUCIDAD">Merma por Caducidad o Vencimiento</option>
                  <option value="DAÑO_TRANSPORTE">Daño en Transporte / Manipulación</option>
                  <option value="CORRECCION_SISTEMA">Corrección por Error de Captura Previo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Justificación / Observaciones</label>
                <input
                  type="text"
                  value={ajusteObs}
                  onChange={(e) => setAjusteObs(e.target.value)}
                  placeholder="Ej. Conteo físico de fin de mes nave central"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              {ajusteError && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {ajusteError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAjusteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAjuste}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {savingAjuste ? 'Aplicando ajuste...' : 'Confirmar y Ajustar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Almacén */}
      {showAlmacenModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold border border-blue-200/60">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingAlmacen ? 'Personalizar Almacén' : 'Alta de Nuevo Almacén'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {editingAlmacen ? `Código: ${editingAlmacen.codigo}` : 'Generación de nuevo centro logístico'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAlmacenModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAlmacen} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Comercial / Denominación *
                </label>
                <input
                  type="text"
                  required
                  value={almNombre}
                  onChange={(e) => setAlmNombre(e.target.value)}
                  placeholder="Ej. Almacén Norte, Bodega Central, Sucursal Centro..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ubicación Física / Dirección
                </label>
                <input
                  type="text"
                  value={almUbicacion}
                  onChange={(e) => setAlmUbicacion(e.target.value)}
                  placeholder="Ej. Av. Parque Industrial 402, Nave B, Apodaca..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 outline-none transition-all"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Almacén Principal</p>
                  <p className="text-xs text-slate-500">
                    Se predeterminará para despachos de ventas y compras
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={almEsPrincipal}
                  onChange={(e) => setAlmEsPrincipal(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              {almacenError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{almacenError}</span>
                </div>
              )}

              {almacenSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-bold">{almacenSuccess}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAlmacenModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAlmacen}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {savingAlmacen ? 'Guardando...' : editingAlmacen ? 'Actualizar Almacén' : 'Crear Almacén'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
