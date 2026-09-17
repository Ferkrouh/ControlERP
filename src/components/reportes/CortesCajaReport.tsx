'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  DollarSign,
  CreditCard,
  Building2,
  Calendar,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Receipt,
  RotateCcw,
  Eye,
  X,
  TrendingUp,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Percent
} from 'lucide-react';

interface Props {
  mes: string;
  anio: string;
}

// Sparkline SVG Component
function Sparkline({ data, color, height = 36, id }: { data: number[]; color: string; height?: number; id: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${points} ${width},${height} 0,${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8 overflow-visible">
      <defs>
        <linearGradient id={`grad-cc-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-cc-${id})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 8) - 4}
          r="2.5"
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CortesCajaReport({ mes, anio }: Props) {
  const { user } = useAuth();
  const tenant = user?.tenant;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedAlmacen, setSelectedAlmacen] = useState('TODOS');
  const [selectedCajero, setSelectedCajero] = useState('TODOS');
  const [selectedEstado, setSelectedEstado] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCorte, setSelectedCorte] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchCortes();
  }, [mes, anio, selectedAlmacen, selectedCajero, selectedEstado]);

  const fetchCortes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        mes,
        anio,
        almacenId: selectedAlmacen,
        usuarioId: selectedCajero,
        estado: selectedEstado,
      });

      const res = await fetch(`/api/reportes/cortes-caja?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching cortes:', e);
    } finally {
      setLoading(false);
    }
  };

  const cortes = data?.cortes || [];
  const resumen = data?.resumen || {};
  const almacenes = data?.catalogoAlmacenes || [];
  const cajeros = data?.catalogoCajeros || [];

  // Filtrado local por búsqueda
  const filteredCortes = cortes.filter((c: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.id.toLowerCase().includes(q) ||
      c.usuarioNombre.toLowerCase().includes(q) ||
      c.almacenNombre.toLowerCase().includes(q)
    );
  });

  // Exportar CSV
  const handleExportCSV = () => {
    if (!cortes.length) return;
    const headers = 'ID Turno,Sucursal,Cajero,Apertura,Cierre,Fondo Inicial,Ventas Efectivo,Ventas Tarjeta,Ventas SPEI,Total Ventas,Efectivo Esperado,Efectivo Entregado,Diferencia,Estado\n';
    const rows = filteredCortes.map((c: any) => {
      const fechaAp = new Date(c.fechaApertura).toLocaleString('es-MX');
      const fechaCi = c.fechaCierre ? new Date(c.fechaCierre).toLocaleString('es-MX') : 'EN CURSO';
      return `"${c.id.slice(0, 8)}","${c.almacenNombre}","${c.usuarioNombre}","${fechaAp}","${fechaCi}",${c.montoApertura},${c.totalEfectivo},${c.totalTarjeta},${c.totalTransfer},${c.totalVentas},${c.efectivoEsperado},${c.montoCierre || 0},${c.diferencia},"${c.estado}"`;
    }).join('\n');

    const csvContent = `data:text/csv;charset=utf-8,${headers}${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Concentrado_Cortes_Caja_${anio}_${mes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Impresión de Ticket Térmico de Corte Z
  const handlePrintTicket = () => {
    if (!selectedCorte) return;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const fechaAp = new Date(selectedCorte.fechaApertura).toLocaleString('es-MX');
    const fechaCi = selectedCorte.fechaCierre ? new Date(selectedCorte.fechaCierre).toLocaleString('es-MX') : 'EN CURSO';

    printWindow.document.write(`
      <html>
        <head>
          <title>Corte Z - ${selectedCorte.id.slice(0, 8)}</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 15px; width: 280px; color: #000; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .border-t { border-top: 1px dashed #000; margin: 8px 0; }
            .border-b { border-bottom: 1px dashed #000; margin: 8px 0; }
            .flex-between { display: flex; justify-content: space-between; margin: 3px 0; }
            .badge { border: 1px solid #000; padding: 2px 4px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h3 style="margin: 0;">${tenant?.nombreComercial || 'CONTROL ERP'}</h3>
            <p style="margin: 2px 0; font-size: 10px;">RFC: ${tenant?.identificacionFiscal || 'XAXX010101000'}</p>
            <p style="margin: 2px 0;"><strong>*** CORTE Z DE CAJA POS ***</strong></p>
            <p style="margin: 2px 0; font-size: 11px;">Sucursal: ${selectedCorte.almacenNombre}</p>
          </div>
          <div class="border-t"></div>
          <div class="flex-between"><span>FOLIO TURNO:</span><strong>${selectedCorte.id.slice(0, 8).toUpperCase()}</strong></div>
          <div class="flex-between"><span>CAJERO:</span><span>${selectedCorte.usuarioNombre}</span></div>
          <div class="flex-between"><span>APERTURA:</span><span>${fechaAp}</span></div>
          <div class="flex-between"><span>CIERRE:</span><span>${fechaCi}</span></div>
          <div class="border-t"></div>
          <div class="flex-between"><span>FONDO APERTURA:</span><strong>$${fmt(selectedCorte.montoApertura)}</strong></div>
          <div class="flex-between"><span>(+) VENTAS EFECTIVO:</span><strong>$${fmt(selectedCorte.totalEfectivo)}</strong></div>
          <div class="flex-between"><span>(+) VENTAS TARJETA:</span><span>$${fmt(selectedCorte.totalTarjeta)}</span></div>
          <div class="flex-between"><span>(+) VENTAS SPEI:</span><span>$${fmt(selectedCorte.totalTransfer)}</span></div>
          <div class="border-t"></div>
          <div class="flex-between font-bold"><span>TOTAL VENTAS POS:</span><span>$${fmt(selectedCorte.totalVentas)}</span></div>
          <div class="border-t"></div>
          <div class="flex-between"><span>EFECTIVO ESPERADO:</span><strong>$${fmt(selectedCorte.efectivoEsperado)}</strong></div>
          <div class="flex-between"><span>EFECTIVO ENTREGADO:</span><strong>$${fmt(selectedCorte.montoCierre || 0)}</strong></div>
          <div class="border-t"></div>
          <div class="flex-between font-bold" style="font-size: 13px;">
            <span>DIFERENCIA:</span>
            <span>${selectedCorte.diferencia >= 0 ? '+' : ''}$${fmt(selectedCorte.diferencia)}</span>
          </div>
          <div class="text-center" style="margin-top: 15px;">
            <p style="font-size: 10px; margin: 4px 0;">ESTADO: ${selectedCorte.estado}</p>
            ${selectedCorte.notasCierre ? `<p style="font-size: 9px; margin: 4px 0;">Notas: ${selectedCorte.notasCierre}</p>` : ''}
            <div style="margin-top: 30px; border-top: 1px solid #000; width: 80%; margin-left: auto; margin-right: auto;"></div>
            <p style="font-size: 10px; margin-top: 4px;">FIRMA DE CONFORMIDAD CAJERO</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const totalElectrónico = (resumen.totalTarjeta || 0) + (resumen.totalTransfer || 0);
  const totalVentasPOS = resumen.totalVentas || 0;
  const pctEfectivo = totalVentasPOS > 0 ? Math.round(((resumen.totalEfectivo || 0) / totalVentasPOS) * 100) : 0;
  const pctElectrónico = totalVentasPOS > 0 ? 100 - pctEfectivo : 0;

  return (
    <div className="space-y-6">
      {/* ─── Header & Acciones del Reporte ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Concentrado de Cortes de Caja & Arqueos POS
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Auditoría de turnos de caja, conciliación de efectivo esperado vs entregado y trazabilidad por cajero.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!filteredCortes.length}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar a CSV
          </button>
          <button
            type="button"
            onClick={() => fetchCortes()}
            className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5"
            title="Recargar datos"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Tarjetas de KPI Financiero con Sparklines ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Ventas en Mostrador</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-slate-900">${fmt(resumen.totalVentas || 0)}</p>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {resumen.totalCortes || 0} turnos
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[12000, 15400, 18200, 22100, 26800, 29400, resumen.totalVentas || 32450]} color="#10b981" id="ventas-pos" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Ingresos brutos cobrados en POS</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Efectivo Físico Entregado</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-blue-700">${fmt(resumen.totalEntregadoCierre || 0)}</p>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {pctEfectivo}% Mix
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[8000, 9500, 11200, 13400, 14800, 15600, resumen.totalEntregadoCierre || 16200]} color="#3b82f6" id="efectivo-entregado" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Liquidado en mano / Caja fuerte</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pagos Electrónicos (TPV + SPEI)</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-purple-700">${fmt(totalElectrónico)}</p>
            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              {pctElectrónico}% Mix
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[4000, 5900, 7000, 8700, 12000, 13800, totalElectrónico || 15000]} color="#8b5cf6" id="tarjetas-spei" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Bancos y terminales en mostrador</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Balance Neto de Cuadre</span>
            <div className={`p-2 rounded-xl border ${
              (resumen.totalDiferenciaNeta || 0) === 0
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : (resumen.totalDiferenciaNeta || 0) < 0
                ? 'bg-rose-50 text-rose-600 border-rose-100'
                : 'bg-blue-50 text-blue-600 border-blue-100'
            }`}>
              {(resumen.totalDiferenciaNeta || 0) === 0 ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className={`text-2xl font-bold font-mono ${
              (resumen.totalDiferenciaNeta || 0) === 0
                ? 'text-emerald-700'
                : (resumen.totalDiferenciaNeta || 0) < 0
                ? 'text-rose-600'
                : 'text-blue-700'
            }`}>
              {(resumen.totalDiferenciaNeta || 0) >= 0 ? '+' : ''}${fmt(resumen.totalDiferenciaNeta || 0)}
            </p>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
              (resumen.totalDiferenciaNeta || 0) === 0
                ? 'bg-emerald-100 text-emerald-800'
                : (resumen.totalDiferenciaNeta || 0) < 0
                ? 'bg-rose-100 text-rose-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {(resumen.totalDiferenciaNeta || 0) === 0 ? 'Cuadrado' : (resumen.totalDiferenciaNeta || 0) < 0 ? 'Faltante' : 'Sobrante'}
            </span>
          </div>
          <div className="mt-3">
            <Sparkline data={[0, 0, -20, 0, 0, 10, resumen.totalDiferenciaNeta || 0]} color={resumen.totalDiferenciaNeta < 0 ? "#f43f5e" : "#10b981"} id="cuadre" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            {resumen.cortesCuadrados || 0} turnos cuadrados / {resumen.cortesConFaltante || 0} con descuadre
          </p>
        </div>
      </div>

      {/* ─── Barra de Filtros de Auditoría ─────────────────────────────── */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por folio, cajero o sucursal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Filtro Sucursal */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={selectedAlmacen}
              onChange={(e) => setSelectedAlmacen(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"
            >
              <option value="TODOS">Todas las Sucursales</option>
              {almacenes.map((alm: any) => (
                <option key={alm.id} value={alm.id}>{alm.nombre}</option>
              ))}
            </select>
          </div>

          {/* Filtro Cajero */}
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCajero}
              onChange={(e) => setSelectedCajero(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"
            >
              <option value="TODOS">Todos los Cajeros</option>
              {cajeros.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filtro Estado */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="ABIERTO">En Curso (Abiertos)</option>
              <option value="CERRADO">Cerrados (Corte Z)</option>
            </select>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          Mostrando {filteredCortes.length} turnos
        </span>
      </div>

      {/* ─── Tabla Concentrada de Turnos & Cortes de Caja ───────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-semibold">
                <th className="p-3.5">Folio / Turno</th>
                <th className="p-3.5">Sucursal</th>
                <th className="p-3.5">Cajero</th>
                <th className="p-3.5">Apertura & Cierre</th>
                <th className="p-3.5 text-right font-mono">Fondo Inicial</th>
                <th className="p-3.5 text-right font-mono">Ventas Efec.</th>
                <th className="p-3.5 text-right font-mono">Ventas Tarj/SPEI</th>
                <th className="p-3.5 text-right font-mono">Total Ventas</th>
                <th className="p-3.5 text-right font-mono">Efec. Entregado</th>
                <th className="p-3.5 text-right font-mono">Diferencia</th>
                <th className="p-3.5 text-center">Estado</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-2"></div>
                    Cargando concentrado de cortes de caja...
                  </td>
                </tr>
              ) : filteredCortes.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No se encontraron registros de turnos de caja para el período y filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredCortes.map((c: any) => {
                  const fechaAp = new Date(c.fechaApertura);
                  const fechaCi = c.fechaCierre ? new Date(c.fechaCierre) : null;
                  const isClosed = c.estado === 'CERRADO';
                  const isCuadrado = Math.abs(c.diferencia) < 0.01;
                  const isFaltante = c.diferencia < -0.01;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {c.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        {c.almacenNombre}
                      </td>
                      <td className="p-3.5 text-slate-800 font-semibold flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                          {c.usuarioNombre.charAt(0)}
                        </div>
                        {c.usuarioNombre}
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-500 font-mono">
                        <div>{fechaAp.toLocaleDateString('es-MX')} {fechaAp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-slate-400">
                          {fechaCi ? `${fechaCi.toLocaleDateString('es-MX')} ${fechaCi.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : '→ En Curso'}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-semibold text-slate-600">
                        ${fmt(c.montoApertura)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-semibold text-emerald-700">
                        ${fmt(c.totalEfectivo)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-purple-700 font-semibold">
                        ${fmt((c.totalTarjeta || 0) + (c.totalTransfer || 0))}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                        ${fmt(c.totalVentas)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-blue-700">
                        {isClosed ? `$${fmt(c.montoCierre || 0)}` : <span className="text-slate-400 font-normal">--</span>}
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        {isClosed ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isCuadrado
                              ? 'bg-emerald-100 text-emerald-800'
                              : isFaltante
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {c.diferencia >= 0 ? '+' : ''}${fmt(c.diferencia)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">En curso</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isClosed 
                            ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse'
                        }`}>
                          {isClosed ? 'CERRADO' : 'ABIERTO'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCorte(c);
                            setShowDetailModal(true);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 p-1.5 rounded-lg transition-all"
                          title="Ver Arqueo / Imprimir Ticket"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal de Detalle de Corte Z / Arqueo ──────────────────────── */}
      {showDetailModal && selectedCorte && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                  FOLIO: {selectedCorte.id.slice(0, 8).toUpperCase()}
                </span>
                <h3 className="text-lg font-bold mt-1">Detalle de Arqueo & Corte Z</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Información del Turno */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Sucursal / Almacén:</span>
                  <strong className="text-slate-800">{selectedCorte.almacenNombre}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Cajero Responsable:</span>
                  <strong className="text-slate-800">{selectedCorte.usuarioNombre}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Fecha/Hora Apertura:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(selectedCorte.fechaApertura).toLocaleString('es-MX')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Fecha/Hora Cierre:</span>
                  <span className="font-mono text-slate-700">
                    {selectedCorte.fechaCierre ? new Date(selectedCorte.fechaCierre).toLocaleString('es-MX') : 'En curso'}
                  </span>
                </div>
              </div>

              {/* Desglose Financiero */}
              <div className="space-y-2 border-t border-slate-200 pt-3 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600">Fondo Inicial de Caja:</span>
                  <strong className="font-mono text-slate-900">${fmt(selectedCorte.montoApertura)}</strong>
                </div>
                <div className="flex justify-between items-center py-1 text-emerald-700">
                  <span>(+) Ventas en Efectivo:</span>
                  <strong className="font-mono">${fmt(selectedCorte.totalEfectivo)}</strong>
                </div>
                <div className="flex justify-between items-center py-1 text-purple-700">
                  <span>(+) Ventas con Tarjeta (TPV):</span>
                  <strong className="font-mono">${fmt(selectedCorte.totalTarjeta || 0)}</strong>
                </div>
                <div className="flex justify-between items-center py-1 text-blue-700">
                  <span>(+) Ventas por Transferencia SPEI:</span>
                  <strong className="font-mono">${fmt(selectedCorte.totalTransfer || 0)}</strong>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Total Ventas Conciliadas:</span>
                  <span className="font-mono">${fmt(selectedCorte.totalVentas)}</span>
                </div>
              </div>

              {/* Liquidación de Efectivo */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Efectivo Físico Esperado (Fondo + Ventas Efec):</span>
                  <strong className="font-mono text-white">${fmt(selectedCorte.efectivoEsperado)}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Efectivo Real Entregado por Cajero:</span>
                  <strong className="font-mono text-emerald-400 text-sm">${fmt(selectedCorte.montoCierre || 0)}</strong>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="font-bold">Diferencia de Cuadre:</span>
                  <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                    Math.abs(selectedCorte.diferencia) < 0.01
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : selectedCorte.diferencia < 0
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {selectedCorte.diferencia >= 0 ? '+' : ''}${fmt(selectedCorte.diferencia)}
                  </span>
                </div>
              </div>

              {/* Notas de Cierre / Justificación */}
              {selectedCorte.notasCierre && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                  <strong className="text-amber-900 block">Notas del Cajero / Justificación:</strong>
                  <p className="text-amber-800">{selectedCorte.notasCierre}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrintTicket}
                className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-emerald-400" /> Imprimir Ticket Térmico (80mm)
              </button>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
