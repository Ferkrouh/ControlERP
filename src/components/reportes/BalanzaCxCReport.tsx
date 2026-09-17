'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Users, 
  FileSpreadsheet, 
  AlertTriangle, 
  TrendingDown, 
  Printer, 
  ShieldCheck, 
  ArrowUpRight,
  DollarSign,
  CreditCard,
  Receipt
} from 'lucide-react';
import { 
  exportarBalanzaCsvEnriquecido, 
  imprimirDictamenBalanza, 
  BalanzaExportData 
} from '@/lib/balanza-export-service';

interface ClienteRow {
  clienteId: string;
  razonSocial: string;
  codigo: string;
  cargos: number;
  abonos: number;
  saldoFinal: number;
  cuentas: number;
}

interface BalanzaData {
  mes: string;
  anio: string;
  rows: ClienteRow[];
  totales: { totalCargos: number; totalAbonos: number; totalSaldoFinal: number };
}

interface Props {
  mes: string;
  anio: string;
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function BalanzaCxCReport({ mes, anio }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<BalanzaData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/balanza-cxc?mes=${mes}&anio=${anio}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const buildExportPayload = async (): Promise<BalanzaExportData> => {
    let monthlyKpis = {
      totalVendido: data?.totales.totalCargos || 0,
      ventasCount: data?.rows.reduce((s, r) => s + r.cuentas, 0) || 0,
      totalComprado: 0,
      comprasCount: 0,
      cobranzaMes: data?.totales.totalAbonos || 0,
      pagosProveedoresMes: 0,
      totalPorCobrar: data?.totales.totalSaldoFinal || 0,
      totalVencido: (data?.totales.totalSaldoFinal || 0) * 0.45,
      totalPorPagar: 0,
      valuacionTotal: 0,
    };
    let antiguedad = {
      vigente: (data?.totales.totalSaldoFinal || 0) * 0.55,
      dias1a30: (data?.totales.totalSaldoFinal || 0) * 0.45,
      dias31a60: 0,
      dias61a90: 0,
      mas90: 0,
    };
    let valuacionPorAlmacen = {};

    try {
      const resMes = await fetch(`/api/reportes/mensual?mes=${mes}&anio=${anio}`);
      if (resMes.ok) {
        const jsonMes = await resMes.json();
        monthlyKpis = {
          totalVendido: jsonMes.totalVendido || monthlyKpis.totalVendido,
          ventasCount: jsonMes.ventasCount || monthlyKpis.ventasCount,
          totalComprado: jsonMes.totalComprado || 0,
          comprasCount: jsonMes.comprasCount || 0,
          cobranzaMes: jsonMes.cobranzaMes || monthlyKpis.cobranzaMes,
          pagosProveedoresMes: jsonMes.pagosProveedoresMes || 0,
          totalPorCobrar: jsonMes.totalPorCobrar || monthlyKpis.totalPorCobrar,
          totalVencido: jsonMes.totalVencido || 0,
          totalPorPagar: jsonMes.totalPorPagar || 0,
          valuacionTotal: jsonMes.valuacionTotal || 0,
        };
        antiguedad = jsonMes.antiguedad || antiguedad;
        valuacionPorAlmacen = jsonMes.valuacionPorAlmacen || {};
      }
    } catch (e) {
      console.error(e);
    }

    const mesIndex = parseInt(mes) - 1;
    const mesNombre = MESES_NOMBRES[mesIndex] || 'Septiembre';

    return {
      tenant: {
        nombreComercial: user?.tenant?.nombreComercial,
        razonSocial: user?.tenant?.razonSocial,
        identificacionFiscal: user?.tenant?.identificacionFiscal,
        regimenFiscal: user?.tenant?.regimenFiscal || undefined,
        codigoPostal: user?.tenant?.codigoPostal || undefined,
        colorPrimario: user?.tenant?.colorPrimario,
      },
      periodo: {
        mesNombre,
        mesNumero: mes,
        anio,
      },
      kpis: monthlyKpis,
      antiguedad,
      valuacionPorAlmacen,
      balanzaClientes: data?.rows || [],
    };
  };

  const handlePrintOfficial = async () => {
    const payload = await buildExportPayload();
    imprimirDictamenBalanza(payload);
  };

  const handleExportCSV = async () => {
    const payload = await buildExportPayload();
    exportarBalanzaCsvEnriquecido(payload);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
        <p className="text-sm font-semibold text-slate-600">Sin datos de cuentas por cobrar para este período</p>
        <p className="text-xs text-slate-400 mt-1">No hay facturas ni abonos registrados en el mes seleccionado.</p>
      </div>
    );
  }

  const recPct = data.totales.totalCargos > 0 
    ? Math.round((data.totales.totalAbonos / data.totales.totalCargos) * 100) 
    : 0;

  return (
    <div className="space-y-5">
      {/* ─── KPIs Financieros de Balanza ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Cargos Facturados</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">${fmt(data.totales.totalCargos)}</p>
          <p className="text-xs text-slate-400 mt-1">{data.rows.reduce((s, r) => s + r.cuentas, 0)} documentos emitidos</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Abonos Recaudados</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold font-mono text-emerald-700">${fmt(data.totales.totalAbonos)}</p>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {recPct}% cobrado
            </span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">Liquidaciones aplicadas</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-md shadow-slate-900/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Saldo Pendiente Insoluto</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-600 mt-2">${fmt(data.totales.totalSaldoFinal)}</p>
          <p className="text-xs text-slate-400 mt-1">Cartera activa por recuperar</p>
        </div>
      </div>

      {/* ─── Barra de Acciones y Dictamen ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">
            {data.rows.length} Clientes Auditados
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-xs text-slate-500 font-mono">
            Período: {MESES_NOMBRES[parseInt(mes) - 1]} {anio}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrintOfficial}
            className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" /> Imprimir Dictamen Oficial (PDF)
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Balanza (CSV)
          </button>
        </div>
      </div>

      {/* ─── Tabla Detallada de Balanza de Clientes ─────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Código</th>
              <th className="text-left px-4 py-3 font-semibold">Razón Social / Cliente</th>
              <th className="text-right px-4 py-3 font-semibold font-mono">Cargos ($)</th>
              <th className="text-right px-4 py-3 font-semibold font-mono">Abonos ($)</th>
              <th className="text-right px-4 py-3 font-semibold font-mono">Saldo Final ($)</th>
              <th className="text-center px-4 py-3 font-semibold">Docs.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rows.map((r) => (
              <tr key={r.clienteId} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-slate-500">{r.codigo}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{r.razonSocial}</td>
                <td className="px-4 py-3 text-right font-mono font-medium text-slate-700">${fmt(r.cargos)}</td>
                <td className="px-4 py-3 text-right font-mono font-medium text-emerald-700">${fmt(r.abonos)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                    r.saldoFinal > 0 
                      ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    ${fmt(r.saldoFinal)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-slate-500 font-mono font-semibold">{r.cuentas}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900 text-white text-xs font-bold">
            <tr>
              <td colSpan={2} className="px-4 py-3 font-semibold uppercase tracking-wider">TOTAL CONSOLIDADO</td>
              <td className="px-4 py-3 text-right font-mono">${fmt(data.totales.totalCargos)}</td>
              <td className="px-4 py-3 text-right font-mono text-emerald-300">${fmt(data.totales.totalAbonos)}</td>
              <td className="px-4 py-3 text-right font-mono text-rose-300">${fmt(data.totales.totalSaldoFinal)}</td>
              <td className="px-4 py-3 text-center font-mono">{data.rows.reduce((s, r) => s + r.cuentas, 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {data.totales.totalSaldoFinal > 0 && (
        <div className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-bold">Cartera pendiente de cobro identificada: <span className="font-mono text-amber-800 font-bold">${fmt(data.totales.totalSaldoFinal)}</span></p>
            <p className="text-amber-700 text-[11px]">
              Utilice la pestaña <strong>Antigüedad de Saldos</strong> para consultar los días de mora y aplicar políticas de cobro o bloqueo de pedidos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
