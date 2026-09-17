'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Sparkles,
  Bot,
  User,
  Send,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Boxes,
  CreditCard,
  Receipt,
  FileText,
  Building2,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  TrendingUp,
  ChevronRight,
  ExternalLink,
  Terminal,
  CornerDownLeft,
  Sparkle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

type PromptCategory = 'recomendados' | 'stock' | 'credito' | 'pos' | 'balanza' | 'cotizacion';

export default function CopilotWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<PromptCategory>('recomendados');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const formatTime = () => {
    const d = new Date();
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const initialGreeting: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: `👋 ¡Hola **${user?.nombre || 'Colega'}**! Soy **ControlBot**, tu asesor ejecutivo y copiloto de ControlERP.\n\nEstoy listo para consultar datos en tiempo real con precisión financiera. ¿Qué deseas revisar?\n\n- 📦 **Stock y Kárdex:** Existencias en almacenes o productos bajo mínimo.\n- 💳 **Crédito y Cobranza:** Límites de crédito, facturas en mora y saldos de clientes.\n- 💵 **Arqueos de Caja POS:** Turnos Z, ventas por método de pago y diferencias.\n- 📊 **Balanza Financiera:** Resumen ejecutivo de CxC vs CxP y liquidez.\n- 📝 **Cotizaciones:** Generación ágil de presupuestos en borrador.\n\n💡 *Tip: Puedes escribir \`/stock\`, \`/cliente\`, \`/corte\` o \`/balanza\` para consultas ultra rápidas.*`,
    timestamp: formatTime(),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

  // Lista de comandos rápidos /slash
  const slashCommands = [
    { cmd: '/stock', desc: 'Consultar existencias de un producto', template: '¿Cuánto stock tenemos del producto ' },
    { cmd: '/cliente', desc: 'Revisar saldo, crédito y mora de cliente', template: 'Consulta el estado de cuenta y crédito del cliente ' },
    { cmd: '/corte', desc: 'Auditar arqueo y corte Z reciente', template: 'Revisa los cortes de caja POS recientes y si hubo diferencias de arqueo' },
    { cmd: '/balanza', desc: 'Resumen financiero de CxC vs CxP', template: 'Dame un resumen ejecutivo de la balanza comercial y posición neta de liquidez' },
    { cmd: '/cotizar', desc: 'Crear borrador de cotización', template: 'Ayúdame a cotizar ' },
  ];

  // Atajo de Teclado Global: Ctrl + K o Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Foco en input al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Scroll automático suave hacia el final
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Monitoreo de '/' para desplegar slash menu
  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.startsWith('/')) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  if (!user || (user.rol === 'SUPERADMIN' && !user.tenantId)) {
    return null;
  }

  // Categorías de chips interactivos
  const categoryChips: Record<PromptCategory, { icon: any; title: string; prompts: { label: string; text: string }[] }> = {
    recomendados: {
      icon: Zap,
      title: 'Recomendados',
      prompts: [
        { label: '📊 Resumen del Mes', text: 'Dame un resumen ejecutivo de la balanza comercial y cuentas por cobrar' },
        { label: '⚠️ Clientes en Mora', text: '¿Cuáles clientes tienen facturas vencidas o crédito bloqueado?' },
        { label: '📦 Existencias Generales', text: '¿Qué productos tienen stock bajo el mínimo en almacén?' },
        { label: '💵 Cortes de Caja POS', text: 'Revisa los cortes de caja recientes y si hubo diferencias de arqueo' },
      ],
    },
    stock: {
      icon: Boxes,
      title: 'Inventario & Stock',
      prompts: [
        { label: '📦 Stock de Taladro', text: '¿Cuánto stock tenemos del Taladro HER-001 y en qué sucursales?' },
        { label: '🚨 Alerta Bajo Mínimo', text: '¿Qué productos están por debajo de su stock mínimo de seguridad?' },
        { label: '🚚 Traspasos en Tránsito', text: '¿Qué órdenes de traspaso entre almacenes están en tránsito?' },
      ],
    },
    credito: {
      icon: CreditCard,
      title: 'Crédito & Clientes',
      prompts: [
        { label: '🔍 Consultar Cliente', text: '¿Cuál es el saldo, crédito disponible y estado de Comercializadora San Pedro?' },
        { label: '🛑 Clientes Bloqueados', text: 'Muéstrame los clientes con venta bloqueada por mora o límite rebasado' },
        { label: '⏳ Facturas Vencidas', text: '¿Cuál es el total de cartera vencida en cuentas por cobrar?' },
      ],
    },
    pos: {
      icon: Receipt,
      title: 'Punto de Venta POS',
      prompts: [
        { label: '💵 Últimos Cortes Z', text: 'Consulta el último corte de caja POS y el total cobrado por método de pago' },
        { label: '⚖️ Diferencias de Arqueo', text: '¿Ha habido sobrantes o faltantes en los cortes de caja del día?' },
        { label: '📋 ¿Qué es un corte Z?', text: '¿Qué es un corte Z en el punto de venta y por qué es importante?' },
      ],
    },
    balanza: {
      icon: TrendingUp,
      title: 'Balanza & Finanzas',
      prompts: [
        { label: '📈 Salud Financiera', text: '¿Cómo está la posición neta de liquidez (Cuentas por Cobrar vs Cuentas por Pagar)?' },
        { label: '🏆 Top Clientes Deudores', text: 'Dame el ranking de los clientes con mayor saldo pendiente' },
      ],
    },
    cotizacion: {
      icon: FileText,
      title: 'Cotizaciones',
      prompts: [
        { label: '📝 Cotizar 5 Taladros', text: 'Ayúdame a generar una cotización borrador de 5 taladros HER-001 para el cliente CLI-001' },
        { label: '📋 Ver Mis Cotizaciones', text: '¿Dónde puedo ver y autorizar las cotizaciones generadas?' },
      ],
    },
  };

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isLoading) return;

    setShowSlashMenu(false);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: formatTime(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    const assistantMsgId = `asst-${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: formatTime(),
    };

    setMessages((prev) => [...prev, initialAssistantMessage]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No se recibió cuerpo de respuesta');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: accumulatedText } : msg
          )
        );
      }
    } catch (err: any) {
      console.error('Error al comunicarse con ControlBot:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `❌ **¡Ups! Hubo un problema al consultar la información**:\n\n${err.message || 'No pude conectar con el servidor de IA.'}\n\nPor favor intenta nuevamente o pregúntame de otra forma. ¡Estoy para ayudarte! 😊`,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    if (window.innerWidth < 640) {
      setIsOpen(false);
    }
  };

  // Renderizado Inteligente de Markdown con Tablas, Enlaces de Acción y Semáforos
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeader: string[] = [];

    const flushTable = (key: number) => {
      if (tableHeader.length > 0 || tableRows.length > 0) {
        elements.push(
          <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-[11px] border-collapse">
              {tableHeader.length > 0 && (
                <thead>
                  <tr className="bg-slate-950 text-white font-semibold">
                    {tableHeader.map((th, hIdx) => (
                      <th key={hIdx} className="p-2.5 border-b border-slate-800 font-mono text-[10px] tracking-wider uppercase">
                        {th.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-slate-100 font-mono">
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/50 hover:bg-slate-100/50'}>
                    {row.map((cell, cIdx) => {
                      const trimmedCell = cell.trim();
                      const isMoney = trimmedCell.includes('$') || trimmedCell.includes('MXN');
                      const isGreen = trimmedCell.includes('🟢') || trimmedCell.includes('ÓPTIMO') || trimmedCell.includes('AL CORRIENTE');
                      const isYellow = trimmedCell.includes('🟡') || trimmedCell.includes('PRECAUCIÓN') || trimmedCell.includes('ADVERTENCIA');
                      const isRed = trimmedCell.includes('🔴') || trimmedCell.includes('CRÍTICO') || trimmedCell.includes('BLOQUEADO') || trimmedCell.includes('MORA');

                      return (
                        <td
                          key={cIdx}
                          className={`p-2.5 text-slate-800 ${
                            isMoney ? 'font-bold text-emerald-700' : ''
                          } ${isGreen ? 'text-emerald-700 font-bold' : ''} ${
                            isYellow ? 'text-amber-700 font-bold' : ''
                          } ${isRed ? 'text-rose-700 font-bold' : ''}`}
                        >
                          {trimmedCell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableHeader = [];
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Detección de tablas Markdown (| celda | celda |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
        if (cells.every((c) => c.trim().match(/^:?-+:?$/))) {
          inTable = true;
          return;
        }

        if (!inTable && tableHeader.length === 0) {
          tableHeader = cells;
          inTable = true;
        } else {
          tableRows.push(cells);
        }
        return;
      } else if (inTable) {
        flushTable(idx);
      }

      // Enlaces de Acción del ERP: [👉 Nombre de Acción](/ruta)
      const actionLinkMatch = trimmed.match(/^\[(.*?)(?:👉|\s*)(.*?)\]\((.*?)\)$/);
      if (actionLinkMatch) {
        const fullLabel = actionLinkMatch[1] + (actionLinkMatch[2] ? ' ' + actionLinkMatch[2] : '');
        const targetPath = actionLinkMatch[3];
        elements.push(
          <div key={idx} className="my-2.5">
            <button
              type="button"
              onClick={() => handleNavigate(targetPath)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer group"
            >
              <span>{fullLabel.trim()}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        );
        return;
      }

      // Encabezados
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={idx} className="font-bold text-sm text-slate-950 pt-2 pb-1 flex items-center gap-1.5 border-b border-slate-100">
            <span className="w-1.5 h-3.5 bg-blue-600 rounded-full inline-block"></span>
            {trimmed.replace('### ', '')}
          </h4>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={idx} className="font-extrabold text-sm text-blue-950 pt-2.5 pb-0.5">
            {trimmed.replace('## ', '')}
          </h3>
        );
        return;
      }

      // Semáforos al inicio de línea
      if (trimmed.startsWith('🟢 ') || trimmed.startsWith('🟡 ') || trimmed.startsWith('🔴 ')) {
        const colorClass = trimmed.startsWith('🟢 ')
          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
          : trimmed.startsWith('🟡 ')
          ? 'bg-amber-50 border-amber-300 text-amber-950'
          : 'bg-rose-50 border-rose-300 text-rose-950';

        elements.push(
          <div key={idx} className={`my-2 p-3 rounded-xl border ${colorClass} text-xs font-medium shadow-2xs`}>
            {parseInlineStyles(trimmed)}
          </div>
        );
        return;
      }

      // Viñetas con estilo
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
        const itemText = trimmed.replace(/^[-•*]\s+/, '');
        elements.push(
          <div key={idx} className="flex items-start gap-2 text-slate-700 py-0.5 pl-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            <span className="leading-relaxed">{parseInlineStyles(itemText)}</span>
          </div>
        );
        return;
      }

      // Citas o Tips
      if (trimmed.startsWith('> ')) {
        elements.push(
          <div key={idx} className="my-2 p-2.5 bg-blue-50/80 border-l-3 border-blue-600 rounded-r-xl text-blue-950 text-[11px] font-medium italic">
            {trimmed.replace('> ', '')}
          </div>
        );
        return;
      }

      // Línea divisoria
      if (trimmed === '---') {
        elements.push(<hr key={idx} className="my-2 border-slate-200" />);
        return;
      }

      // Párrafos regulares
      if (trimmed.length > 0) {
        elements.push(
          <p key={idx} className="text-slate-800 leading-relaxed">
            {parseInlineStyles(trimmed)}
          </p>
        );
      } else {
        elements.push(<div key={idx} className="h-1" />);
      }
    });

    if (inTable) {
      flushTable(lines.length);
    }

    return elements;
  };

  // Formato en línea (negritas, código, enlaces, moneda)
  const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\$[0-9,]+(?:\.[0-9]{2})?(?:\s*MXN)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 bg-slate-100 text-blue-700 font-mono text-[11px] rounded-md border border-slate-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('$')) {
        return (
          <span key={i} className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
            {part}
          </span>
        );
      }
      const inlineLinkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (inlineLinkMatch) {
        return (
          <button
            key={i}
            type="button"
            onClick={() => handleNavigate(inlineLinkMatch[2])}
            className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 mx-1 cursor-pointer"
          >
            {inlineLinkMatch[1]}
          </button>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* ─── Botón Flotante Global (FAB) con Brillo & Status ─────────────── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-slate-950 hover:bg-slate-900 text-white pl-3.5 pr-4.5 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 group shadow-slate-950/50 cursor-pointer"
          title="Abrir ControlBot (Ctrl + K)"
        >
          {/* Avatar con aura pulsante */}
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 shadow-sm animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 shadow-sm"></span>
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wide text-white block">ControlBot</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-mono px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                IA
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Ctrl + K
            </span>
          </div>
        </button>
      )}

      {/* ─── Ventana Modal de ControlBot ──────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none sm:p-6 flex items-end sm:items-end justify-end">
          {/* Backdrop sutil en móvil */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs pointer-events-auto sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={`pointer-events-auto bg-white border border-slate-200/90 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              isExpanded
                ? 'w-full sm:w-[780px] h-[92vh] sm:h-[88vh]'
                : 'w-full sm:w-[520px] h-[88vh] sm:h-[700px]'
            }`}
          >
            {/* 1. Header Premium con Estado en Vivo */}
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                      <Bot className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-white tracking-wide">ControlBot</h3>
                    <span className="bg-gradient-to-r from-blue-500/20 to-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                      ⚡ Groq 120B
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {user?.tenant?.nombreComercial || 'ControlERP'} • {user?.nombre} ({user?.rol})
                  </p>
                </div>
              </div>

              {/* Controles de Ventana */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMessages([initialGreeting])}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Reiniciar conversación"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="hidden sm:block p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  title={isExpanded ? 'Contraer vista' : 'Expandir a pantalla ancha'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Cerrar (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Barra de Categorías / Módulos de Ayuda Rápida */}
            <div className="bg-slate-900/95 border-b border-slate-800 p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[11px]">
              {(Object.keys(categoryChips) as PromptCategory[]).map((cat) => {
                const item = categoryChips[cat];
                const IconComponent = item.icon;
                const isActive = activeCategory === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>

            {/* 3. Contenedor de Mensajes con Formato Rico */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/70 text-xs">
              {messages.map((m) => {
                const isUser = m.role === 'user';

                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-200`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs shadow-sm ${
                        isUser
                          ? 'bg-blue-600 text-white shadow-blue-600/20'
                          : 'bg-slate-950 border border-slate-800 text-emerald-400 shadow-slate-950/20'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>

                    {/* Burbuja de Mensaje */}
                    <div
                      className={`relative group max-w-[88%] rounded-2xl p-4 space-y-2 leading-relaxed shadow-sm transition-all ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-xs font-medium shadow-blue-600/10'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-slate-900/5'
                      }`}
                    >
                      {/* Cabecera de la burbuja */}
                      <div className="flex items-center justify-between gap-4 text-[10px] opacity-70 pb-1 border-b border-black/5">
                        <span className="font-semibold">
                          {isUser ? user?.nombre || 'Tú' : 'ControlBot'}
                        </span>
                        <span>{m.timestamp || formatTime()}</span>
                      </div>

                      {/* Botón copiar en respuestas del bot */}
                      {!isUser && m.content && (
                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.content)}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                          title="Copiar respuesta"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* Contenido Renderizado */}
                      <div className="space-y-1.5">
                        {renderFormattedContent(m.content)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Indicador de Pensando / Consultando */}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs w-fit animate-pulse">
                  <div className="w-7 h-7 rounded-xl bg-slate-950 text-emerald-400 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="text-xs text-slate-700 font-medium">
                    <span>ControlBot está consultando la base de datos de ControlERP...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 4. Sugerencias Rápidas según la Categoría Seleccionada */}
            <div className="p-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 shrink-0">
                Sugerencias:
              </span>
              {categoryChips[activeCategory].prompts.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(chip.text)}
                  disabled={isLoading}
                  className="bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>{chip.label}</span>
                  <ChevronRight className="w-3 h-3 opacity-40" />
                </button>
              ))}
            </div>

            {/* 5. Menú Desplegable de Slash Commands (/stock, /cliente, etc.) */}
            {showSlashMenu && (
              <div className="bg-slate-900 border-t border-slate-800 p-2 space-y-1 animate-in slide-in-from-bottom-2 text-xs shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block">
                  Comandos Rápidos (/):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {slashCommands.map((sc, scIdx) => (
                    <button
                      key={scIdx}
                      type="button"
                      onClick={() => {
                        setInput(sc.template);
                        setShowSlashMenu(false);
                        inputRef.current?.focus();
                      }}
                      className="text-left p-2 rounded-xl bg-slate-800/70 hover:bg-blue-600 text-slate-200 hover:text-white transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <span className="font-mono font-bold text-emerald-400 group-hover:text-white block">
                          {sc.cmd}
                        </span>
                        <span className="text-[11px] text-slate-400 group-hover:text-blue-100">
                          {sc.desc}
                        </span>
                      </div>
                      <CornerDownLeft className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Formulario de Entrada Multilínea con Enviar Rápido */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-end gap-2"
              >
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    placeholder="Escribe una pregunta o presiona '/' para ver comandos..."
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isLoading}
                    className="w-full bg-slate-100/80 border border-slate-300 rounded-2xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium disabled:opacity-50 resize-none max-h-24"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-slate-950 hover:bg-slate-800 disabled:opacity-40 active:scale-95 text-white p-2.5 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                Presiona <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Enter</kbd> para enviar • <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Shift + Enter</kbd> para salto de línea
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
