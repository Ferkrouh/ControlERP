'use client';

import React, { useState, useEffect } from 'react';
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
  Star
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
          stockMaximo: Number(stockMinimo * 5),
          almacenId: almacenInicialId,
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
    setAlmEsPrincipal(Boolean(alm.esPrincipal));
    setAlmacenError('');
    setAlmacenSuccess('');
    setShowAlmacenModal(true);
  };

  const handleSaveAlmacen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!almNombre.trim()) {
      setAlmacenError('El nombre del almacén es requerido');
      return;
    }

    setSavingAlmacen(true);
    setAlmacenError('');
    setAlmacenSuccess('');

    try {
      const url = editingAlmacen ? `/api/almacenes/${editingAlmacen.id}` : '/api/almacenes';
      const method = editingAlmacen ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: almNombre.trim(),
          ubicacion: almUbicacion.trim(),
          esPrincipal: almEsPrincipal,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAlmacenSuccess(editingAlmacen ? '¡Almacén actualizado con éxito!' : '¡Nuevo almacén creado con éxito!');
        setTimeout(() => {
          setShowAlmacenModal(false);
          setAlmacenSuccess('');
          loadData();
        }, 1000);
      } else {
        setAlmacenError(data.error || 'Error al procesar el almacén.');
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

  const filtered = productos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.codigoBarras && p.codigoBarras.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-600" />
            Control de Inventarios & Multi-Almacén
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Catálogo de artículos, administración de almacenes físicos, kárdex y traspasos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {user?.tenant?.moduloTraspasos && (
            <Link
              href="/traspasos"
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-sm px-3.5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-4 h-4 text-purple-600" /> Traspasos entre Almacenes
            </Link>
          )}

          {!isAlmacenista && !isReadOnly && (
            <button
              onClick={handleOpenCreateAlmacen}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-3.5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Warehouse className="w-4 h-4 text-blue-400" /> + Crear Almacén
            </button>
          )}

          {!isReadOnly && (
            <button
              onClick={() => handleOpenAjuste()}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm px-3.5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-400" /> Ajuste / Merma
            </button>
          )}

          {!isAlmacenista && !isReadOnly && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {isAlmacenista && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-4 py-2 rounded-xl flex items-center gap-2 font-medium">
          <Boxes className="w-4 h-4 text-blue-600" />
          Vista Almacén: Visualización enfocada en existencias físicas, códigos y movimientos. Datos de costos restringidos.
        </div>
      )}

      {/* Pestañas de Navegación: Catálogo de Artículos vs Gestión de Almacenes */}
      <div className="flex border-b border-slate-200 gap-6">
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
          {/* Selector de Almacén y Buscador */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, SKU o código de barras..."
                className="w-full text-sm outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Almacén:</span>
              <select
                value={selectedAlmacen}
                onChange={(e) => setSelectedAlmacen(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="TODOS">Consolidado (Todos los Almacenes)</option>
                {almacenes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} {a.esPrincipal ? '★ (Principal)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Cargando inventarios...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No hay productos registrados en el catálogo.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">SKU / Código</th>
                      <th className="py-3 px-4">Descripción del Artículo</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4 text-center">U.M.</th>
                      {!isAlmacenista && <th className="py-3 px-4 text-right">Costo Promedio</th>}
                      {!isAlmacenista && <th className="py-3 px-4 text-right">Precio Venta</th>}
                      <th className="py-3 px-4 text-right">Existencia</th>
                      <th className="py-3 px-4 text-center">Estado Stock</th>
                      <th className="py-3 px-4 text-center">Kárdex</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((prod) => {
                      let totalStock = 0;
                      if (selectedAlmacen === 'TODOS') {
                        totalStock = prod.existencias?.reduce((acc: number, e: any) => acc + e.cantidad, 0) || 0;
                      } else {
                        const ex = prod.existencias?.find((e: any) => e.almacenId === selectedAlmacen);
                        totalStock = ex ? ex.cantidad : 0;
                      }

                      const isBajoMinimo = totalStock < prod.stockMinimo;

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-mono font-bold text-blue-700">{prod.sku}</p>
                            {prod.codigoBarras && (
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Barcode className="w-3 h-3" /> {prod.codigoBarras}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{prod.nombre}</p>
                          </td>

                          <td className="py-3 px-4 text-xs text-slate-600">
                            {prod.categoria}
                          </td>

                          <td className="py-3 px-4 text-center text-xs font-semibold text-slate-700">
                            {prod.unidadMedida}
                          </td>

                          {!isAlmacenista && (
                            <td className="py-3 px-4 text-right font-medium text-slate-700">
                              ${prod.costoPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                          )}

                          {!isAlmacenista && (
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              ${prod.precioVenta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                          )}

                          <td className="py-3 px-4 text-right">
                            <span className={`text-base font-bold ${isBajoMinimo ? 'text-rose-600' : 'text-slate-900'}`}>
                              {totalStock} {prod.unidadMedida}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isBajoMinimo ? (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Bajo Mín ({prod.stockMinimo})
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Óptimo
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setKardexProducto(prod)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg"
                                title="Ver movimientos históricos"
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
            )}
          </div>
        </div>
      )}

      {/* Vista de Gestión de Almacenes y Sucursales */}
      {activeTab === 'almacenes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-blue-600" />
                Catálogo de Almacenes y Sucursales de Despacho
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea, personaliza ubicaciones y gestiona los centros logísticos para ventas, compras y traspasos internos.
              </p>
            </div>

            {!isAlmacenista && !isReadOnly && (
              <button
                onClick={handleOpenCreateAlmacen}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
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
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  {alm.esPrincipal && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-bold text-[10px] px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-xs">
                      <Star className="w-3 h-3 fill-slate-950" /> Principal
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-mono text-[11px] font-bold text-slate-400">{alm.codigo}</span>
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
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Artículos Activos</p>
                        <p className="text-sm font-bold text-slate-800">{totalItems}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Stock Físico Total</p>
                        <p className="text-sm font-bold text-blue-600">{totalUnidades}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <Link
                      href="/traspasos"
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Traspasar Stock
                    </Link>

                    {!isAlmacenista && !isReadOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditAlmacen(alm)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar almacén"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!alm.esPrincipal && (
                          <button
                            onClick={() => handleDeleteAlmacen(alm.id, alm.nombre)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Eliminar almacén (requiere estar vacío)"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal Kárdex de Movimientos */}
      {kardexProducto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  Kárdex Valuado: {kardexProducto.nombre}
                </h3>
                <p className="text-xs font-mono text-slate-500">SKU: {kardexProducto.sku} | Método: Costo Promedio (CFF Art. 28)</p>
              </div>
              <button onClick={() => setKardexProducto(null)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {kardexProducto.movimientos && kardexProducto.movimientos.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Tipo Movimiento</th>
                      <th className="py-2 px-3 text-right">Cantidad</th>
                      {!isAlmacenista && <th className="py-2 px-3 text-right">Costo Unitario</th>}
                      <th className="py-2 px-3 text-right">Saldo Final</th>
                      <th className="py-2 px-3">Motivo / Folio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kardexProducto.movimientos.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500">{new Date(m.fecha).toLocaleDateString('es-MX')}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{m.tipoMovimiento}</td>
                        <td className="py-2 px-3 text-right font-bold">{m.cantidad}</td>
                        {!isAlmacenista && <td className="py-2 px-3 text-right">${m.costoUnitario.toFixed(2)}</td>}
                        <td className="py-2 px-3 text-right font-bold text-blue-600">{m.saldoResultante}</td>
                        <td className="py-2 px-3 text-slate-500">{m.motivo || m.folioReferencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-400 p-4 text-center">No hay registros de movimientos recientes en el kárdex.</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setKardexProducto(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-blue-600" /> Alta de Nuevo Artículo
            </h3>

            <form onSubmit={handleCreateProducto} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Clave *</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código de Barras</label>
                  <input
                    type="text"
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unidad de Medida</label>
                  <select
                    value={unidadMedida}
                    onChange={(e) => setUnidadMedida(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Costo ($)</label>
                  <input
                    type="number"
                    value={costoPromedio}
                    onChange={(e) => setCostoPromedio(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Almacén Inicial</label>
                  <select
                    value={almacenInicialId}
                    onChange={(e) => setAlmacenInicialId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                Ajuste de Stock / Registro de Merma
              </h3>
              <button
                onClick={() => setShowAjusteModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  required
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Stock Actual en Sistema</label>
                  <p className="text-base font-bold text-slate-700">
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
                    className="w-full px-3 py-1.5 text-sm font-bold border border-blue-300 rounded-lg text-slate-900 bg-white"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Diferencia: {ajusteNuevoStock - ajusteStockActual > 0 ? `+${ajusteNuevoStock - ajusteStockActual}` : ajusteNuevoStock - ajusteStockActual}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo del Ajuste *</label>
                <select
                  value={ajusteMotivo}
                  onChange={(e) => setAjusteMotivo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              {ajusteError && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {ajusteError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAjusteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAjuste}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingAlmacen ? 'Personalizar Almacén' : 'Alta de Nuevo Almacén'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
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
                  <p className="text-[10px] text-slate-500">
                    Se predeterminará para despachos de ventas y recepciones de compras
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
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
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
