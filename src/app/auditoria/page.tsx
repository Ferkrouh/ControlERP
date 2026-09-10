'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  FileSpreadsheet, 
  Calendar,
  Eye,
  UserCheck
} from 'lucide-react';

export default function AuditoriaPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduloFiltro, setModuloFiltro] = useState('TODOS');

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auditoria');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const modulosDisponibles = ['TODOS', ...Array.from(new Set(logs.map((l) => l.modulo)))];

  const filtered = logs.filter((l) => {
    const matchSearch =
      l.detalles.toLowerCase().includes(search.toLowerCase()) ||
      l.usuarioNombre.toLowerCase().includes(search.toLowerCase()) ||
      l.modulo.toLowerCase().includes(search.toLowerCase()) ||
      l.accion.toLowerCase().includes(search.toLowerCase());

    if (moduloFiltro === 'TODOS') return matchSearch;
    return matchSearch && l.modulo === moduloFiltro;
  });

  const handleExportAuditCSV = () => {
    if (logs.length === 0) return;
    let csv = 'data:text/csv;charset=utf-8,Fecha y Hora,Usuario,Modulo,Accion,Detalles\n';
    filtered.forEach((l) => {
      const fecha = new Date(l.fecha).toLocaleString('es-MX').replace(',', '');
      csv += `"${fecha}","${l.usuarioNombre}","${l.modulo}","${l.accion}","${l.detalles.replace(/"/g, '""')}"\n`;
    });
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Bitacora_Auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeAccion = (accion: string) => {
    switch (accion) {
      case 'VENTA':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">VENTA</span>;
      case 'COMPRA':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">COMPRA</span>;
      case 'ABONO':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">ABONO</span>;
      case 'PAGO_PROVEEDOR':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">PAGO PROV</span>;
      case 'AJUSTE_STOCK':
        return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded">AJUSTE STOCK</span>;
      case 'TRASPASO':
        return <span className="bg-cyan-100 text-cyan-800 text-[10px] font-bold px-2 py-0.5 rounded">TRASPASO</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">{accion}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 text-slate-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Registro Criptográfico Inmutable
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-1">
            <History className="w-6 h-6 text-slate-800" />
            Bitácora de Auditoría & Trazabilidad
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Historial de eventos de transacciones: usuario ejecutor, fecha, módulo, montos y folios involucrados.
          </p>
        </div>

        <button
          onClick={handleExportAuditCSV}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Exportar Registro (CSV)
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por operador, folio, cliente o detalle..."
            className="w-full text-sm outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium">Módulo:</span>
          <select
            value={moduloFiltro}
            onChange={(e) => setModuloFiltro(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
          >
            {modulosDisponibles.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Eventos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando eventos de auditoría...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay registros de auditoría que coincidan con la búsqueda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Operador Responsable</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                  <th className="py-3 px-4">Detalles del Evento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.fecha).toLocaleString('es-MX')}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{log.usuarioNombre}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {log.modulo}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getBadgeAccion(log.accion)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 leading-relaxed font-medium">
                      {log.detalles}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
