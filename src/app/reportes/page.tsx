'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  BarChart3, 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  DollarSign, 
  Boxes, 
  CreditCard, 
  Receipt,
  ShoppingCart,
  Truck,
  ShieldCheck,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export default function ReportesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState('09');
  const [anio, setAnio] = useState('2026');

  useEffect(() => {
    if (user?.tenantId || user?.rol === 'SUPERADMIN') {
      fetchReportes();
    }
  }, [user, mes, anio]);

  const fetchReportes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reportes/mensual`);
      if (res.ok) {
        const rep = await res.json();
        setData(rep);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    const csvContent = `data:text/csv;charset=utf-8,Indicador Financiero / Contable,Monto MXN,Notas
Total Ventas Emitidas,${data.totalVendido},${data.ventasCount} operaciones
Total Compras a Proveedores,${data.totalComprado},${data.comprasCount} recepciones
Cobranza Efectiva (CxC),${data.cobranzaMes},Abonos recaudados
Liquidaciones a Proveedores (CxP),${data.pagosProveedoresMes},Egresos liquidados
Cartera Pendiente (CxC),${data.totalPorCobrar},Suma de saldos de clientes
Cartera Vencida (En Mora),${data.totalVencido},Riesgo de cartera
Pasivo a Proveedores (CxP),${data.totalPorPagar},Suma de facturas por pagar
Valuacion Total de Inventario,${data.valuacionTotal},Costo Promedio Ponderado CFF Art. 28
`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cierre_Contable_ERP_${anio}_${mes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Balanza de Operación & CFF Art. 28
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-1">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Reportes Ejecutivos & Cierre de Balanza
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Monitoreo consolidado de ventas, compras, cobranza, pasivos circulantes y valuación de existencias.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Balanza (CSV)
          </button>
          <button
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Imprimir Estado
          </button>
        </div>
      </div>

      {/* Selector de Periodo */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600">Periodo Fiscal de Consulta:</span>
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
        >
          <option value="01">Enero</option>
          <option value="02">Febrero</option>
          <option value="03">Marzo</option>
          <option value="04">Abril</option>
          <option value="05">Mayo</option>
          <option value="06">Junio</option>
          <option value="07">Julio</option>
          <option value="08">Agosto</option>
          <option value="09">Septiembre</option>
          <option value="10">Octubre</option>
          <option value="11">Noviembre</option>
          <option value="12">Diciembre</option>
        </select>
        <select
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
      </div>

      {/* Bloque 1: Resumen de Flujo Comercial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Ventas Registradas</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${(data?.totalVendido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">{data?.ventasCount || 0} operaciones comerciales</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Cobranza Recaudada</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            ${(data?.cobranzaMes || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-emerald-700 font-semibold mt-1">Abonos recibidos de clientes</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Compras Recibidas</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${(data?.totalComprado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">{data?.comprasCount || 0} órdenes de proveedores</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Pagos a Proveedores</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            ${(data?.pagosProveedoresMes || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-amber-700 font-semibold mt-1">Egresos liquidados en bancos</p>
        </div>
      </div>

      {/* Bloque 2: Balance de Activos y Pasivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Antigüedad de Saldos CxC */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Cartera de Clientes & Antigüedad de Saldos</h3>
              <p className="text-xs text-slate-500">Total por Cobrar: ${(data?.totalPorCobrar || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            {data?.totalVencido > 0 && (
              <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> ${(data?.totalVencido || 0).toLocaleString()} en Mora
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Al Corriente (Vigente)</p>
                <p className="text-xs text-slate-500">Plazo de crédito no vencido</p>
              </div>
              <strong className="text-emerald-700 font-mono text-sm font-bold">
                ${(data?.antiguedad?.vigente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-bold text-slate-900">1 a 30 Días de Mora</p>
                <p className="text-xs text-slate-500">Vencimiento reciente</p>
              </div>
              <strong className="text-amber-700 font-mono text-sm font-bold">
                ${(data?.antiguedad?.dias1a30 || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-bold text-slate-900">31 a 60 Días de Mora</p>
                <p className="text-xs text-slate-500">Gestión de cobranza requerida</p>
              </div>
              <strong className="text-slate-600 font-mono text-sm font-bold">
                ${(data?.antiguedad?.dias31a60 || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-bold text-rose-700">+90 Días (Cartera Crítica)</p>
                <p className="text-xs text-rose-500">Bloqueo de crédito automático sugerido</p>
              </div>
              <strong className="text-rose-700 font-mono text-sm font-bold">
                ${(data?.antiguedad?.mas90 || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* Valuación Fiscal de Inventarios (CFF Art. 28) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Valuación de Existencias por Almacén</h3>
                <p className="text-xs text-slate-500">Total en Activos: ${(data?.valuacionTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Boxes className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-3">
              {data?.valuacionPorAlmacen && Object.entries(data.valuacionPorAlmacen).map(([almNombre, val]: any) => (
                <div key={almNombre} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-900">{almNombre}</p>
                    <p className="text-xs text-slate-500">{val.piezas} unidades en existencia</p>
                  </div>
                  <strong className="text-slate-900 font-mono text-sm font-bold">
                    ${val.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Valuación Regulada según CFF Art. 28 y NIF C-4</span>
            </div>
            <p className="text-xs text-blue-700">
              El costo de las existencias y de las salidas por venta es computado mediante el método de <strong>Costo Promedio Ponderado</strong>, garantizando estricta consistencia fiscal y contable para dictámenes y auditorías.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
