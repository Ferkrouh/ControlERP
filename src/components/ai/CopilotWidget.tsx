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
  Check
} from 'lucide-react';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function CopilotWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initialGreeting: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: `👋 ¡Hola **${user?.nombre || 'Usuario'}**! Soy el **Copilot Inteligente de ControlERP**.\n\nPuedo consultar en tiempo real:\n• 📦 **Stock y Kárdex multialmacén** (identificar faltantes y existencias).\n• 💳 **Límites de crédito y mora de clientes** (validación de cartera CxC).\n• 💵 **Cortes Z y arqueos de caja POS** (sobrantes y faltantes).\n• 📊 **Balanza financiera ejecutiva** (CxC vs CxP).\n• 📝 **Borradores de cotización automáticos**.\n\n¿Qué deseas consultar o gestionar?`,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

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

  // Scroll automático hacia el final de los mensajes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  if (!user || (user.rol === 'SUPERADMIN' && !user.tenantId)) {
    return null;
  }

  // Chips de sugerencia rápida según el rol del usuario
  const getPromptChips = () => {
    switch (user.rol) {
      case 'ADMIN':
        return [
          { label: '📊 Resumen de Balanza', prompt: 'Dame un resumen de la balanza comercial y financiera de este mes' },
          { label: '⚠️ Clientes en Mora', prompt: '¿Cuáles clientes tienen facturas vencidas o saldo saturado?' },
          { label: '💵 Cortes de Caja POS', prompt: 'Revisa los cortes de caja recientes y si hubo diferencias en arqueos' },
        ];
      case 'ENCARGADO':
        return [
          { label: '📦 Stock de Compresor', prompt: '¿Tenemos existencias del Compresor de 50L en alguna sucursal?' },
          { label: '🔍 Consultar Cliente', prompt: '¿Cuál es el saldo y límite de crédito de Comercializadora San Pedro?' },
          { label: '📝 Crear Cotización', prompt: 'Ayúdame a cotizar 5 taladros HER-001 para el cliente CLI-001' },
        ];
      case 'ALMACENISTA':
        return [
          { label: '🚨 Stock Bajo Mínimo', prompt: '¿Qué productos están por debajo del stock mínimo y requieren surtido?' },
          { label: '🚚 Traspasos en Tránsito', prompt: '¿Qué órdenes de traspaso están despachadas y en tránsito?' },
        ];
      default:
        return [
          { label: '📊 Balanza Mensual', prompt: '¿Cómo van las ventas y cuentas por cobrar del mes?' },
          { label: '📦 Existencias', prompt: 'Consulta el stock de los productos principales en almacén' },
        ];
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
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
      console.error('Error al comunicarse con Copilot AI:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `❌ **Error al consultar el asistente**: ${err.message || 'No se pudo conectar con el servicio de IA.'}\n\nPor favor verifica tu conexión o intenta nuevamente.`,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (promptText: string) => {
    handleSendMessage(promptText);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* ─── Botón Flotante Global (FAB) ─────────────────────────────────── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-slate-900 hover:bg-slate-800 text-white p-3.5 sm:px-4 sm:py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-2.5 transition-all duration-200 hover:scale-105 active:scale-95 group shadow-slate-950/40"
          title="Abrir Copilot de IA (Ctrl + K)"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-inner">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
          </div>
          <div className="hidden sm:block text-left">
            <span className="text-xs font-bold text-white block leading-tight">Copilot IA</span>
            <span className="text-[10px] text-slate-400 font-mono">Ctrl + K</span>
          </div>
        </button>
      )}

      {/* ─── Panel Flotante / Modal del Asistente ────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none sm:p-6 flex items-end sm:items-end justify-end">
          {/* Backdrop sutil en móvil */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs pointer-events-auto sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={`pointer-events-auto bg-white border border-slate-200/90 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in slide-in-from-bottom-5 ${
              isExpanded
                ? 'w-full sm:w-[680px] h-[90vh] sm:h-[85vh]'
                : 'w-full sm:w-[460px] h-[85vh] sm:h-[620px]'
            }`}
          >
            {/* Header del Copilot */}
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-400 p-0.5 flex items-center justify-center shadow-inner">
                  <div className="w-full h-full bg-slate-900 rounded-[9px] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">ControlBot Copilot</h3>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Groq Llama 3.3
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {user?.tenant?.nombreComercial || 'ControlERP'} • Rol: {user?.rol}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMessages([initialGreeting])}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Reiniciar conversación"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="hidden sm:block p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title={isExpanded ? 'Contraer' : 'Expandir'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Cerrar (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenedor de Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 text-xs">
              {messages.map((m) => {
                const isUser = m.role === 'user';

                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                        isUser
                          ? 'bg-blue-600 shadow-sm'
                          : 'bg-slate-900 border border-slate-800 text-emerald-400 shadow-sm'
                      }`}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    {/* Burbuja de Mensaje */}
                    <div
                      className={`relative group max-w-[85%] rounded-2xl p-3.5 space-y-2 leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-xs font-medium'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-slate-900/5'
                      }`}
                    >
                      {/* Botón copiar en asistente */}
                      {!isUser && m.content && (
                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.content)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-md"
                          title="Copiar texto"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {/* Contenido con formateo de saltos y viñetas */}
                      <div className="whitespace-pre-wrap space-y-1">
                        {m.content.split('\n').map((line: string, idx: number) => {
                          if (line.startsWith('### ')) {
                            return (
                              <h4 key={idx} className="font-bold text-sm text-slate-900 pt-1.5 border-b border-slate-100 pb-0.5">
                                {line.replace('### ', '')}
                              </h4>
                            );
                          }
                          if (line.startsWith('## ')) {
                            return (
                              <h3 key={idx} className="font-bold text-sm text-blue-900 pt-1">
                                {line.replace('## ', '')}
                              </h3>
                            );
                          }
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return (
                              <strong key={idx} className="font-bold text-slate-900 block">
                                {line.replace(/\*\*/g, '')}
                              </strong>
                            );
                          }
                          return <p key={idx}>{line}</p>;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                  <div className="w-7 h-7 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span className="animate-pulse">ControlBot está consultando la base de datos de ControlERP...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chips de Sugerencia Rápida */}
            <div className="p-2.5 bg-slate-100/70 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {getPromptChips().map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip.prompt)}
                  disabled={isLoading}
                  className="bg-white hover:bg-slate-200 disabled:opacity-50 text-slate-700 border border-slate-300/80 px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all active:scale-95 shadow-2xs cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Formulario de Input */}
            <form
              onSubmit={handleFormSubmit}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Escribe una pregunta o instrucción..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 active:scale-95 text-white p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
