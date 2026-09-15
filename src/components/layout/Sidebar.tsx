'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Truck, 
  Receipt, 
  Boxes, 
  ArrowLeftRight, 
  BarChart3, 
  ShieldAlert, 
  Sliders, 
  Building2, 
  FileText,
  Lock,
  Eye,
  History,
  ShoppingCart,
  Zap,
  Landmark,
  Factory,
  Kanban,
  BookOpen,
  UserCheck,
  ChevronDown,
  Search,
  PanelLeftClose,
  PanelLeft,
  X
} from 'lucide-react';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  color?: string;
  requiresModule?: string;
  allowedRoles?: string[];
}

interface MenuGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: MenuItem[];
  allowedRoles?: string[];
  requiresModule?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  
  // Estados interactivos modernos
  const [collapsed, setCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    operacion: true,
    comercial: true,
    compras: true,
    inventario: true,
    finanzas: true,
    reportes: true,
    configuracion: true,
  });

  const isSuperadmin = user?.rol === 'SUPERADMIN';
  const rol = user?.rol;
  const tenant = user?.tenant;

  // Definición estructurada del menú para Tenants
  const menuGroups: MenuGroup[] = useMemo(() => [
    {
      id: 'operacion',
      title: 'Operación',
      icon: LayoutDashboard,
      color: 'text-blue-400',
      items: [
        {
          title: 'Dashboard',
          href: '/',
          icon: LayoutDashboard,
          color: 'text-blue-400'
        }
      ]
    },
    {
      id: 'comercial',
      title: 'Área Comercial',
      icon: ShoppingCart,
      color: 'text-emerald-400',
      allowedRoles: ['ADMIN', 'ENCARGADO', 'AUDITOR'],
      items: [
        {
          title: 'Punto de Venta',
          href: '/pos',
          icon: Zap,
          color: 'text-emerald-400',
          badge: 'Rápido'
        },
        {
          title: 'Cotizaciones',
          href: '/cotizaciones',
          icon: FileText,
          color: 'text-sky-400'
        },
        {
          title: 'Ventas y Facturación',
          href: '/ventas',
          icon: ShoppingCart,
          color: 'text-blue-400'
        },
        {
          title: 'Clientes y Crédito',
          href: '/clientes',
          icon: Users,
          color: 'text-indigo-400',
          requiresModule: 'moduloCredito'
        },
        {
          title: 'Cuentas por Cobrar',
          href: '/cxc',
          icon: CreditCard,
          color: 'text-amber-400',
          requiresModule: 'moduloCxC'
        }
      ]
    },
    {
      id: 'compras',
      title: 'Compras y Proveedores',
      icon: Truck,
      color: 'text-amber-400',
      items: [
        {
          title: 'Órdenes de Compra',
          href: '/ordenes-compra',
          icon: FileText,
          color: 'text-amber-400',
          allowedRoles: ['ADMIN', 'ENCARGADO', 'AUDITOR']
        },
        {
          title: 'Recepción de Compras',
          href: '/compras',
          icon: Truck,
          color: 'text-blue-400'
        },
        {
          title: 'Catálogo Proveedores',
          href: '/proveedores',
          icon: Users,
          color: 'text-purple-400',
          requiresModule: 'moduloProveedores',
          allowedRoles: ['ADMIN', 'ENCARGADO', 'AUDITOR']
        },
        {
          title: 'Cuentas por Pagar',
          href: '/cxp',
          icon: Receipt,
          color: 'text-rose-400',
          requiresModule: 'moduloCxP',
          allowedRoles: ['ADMIN', 'ENCARGADO', 'AUDITOR']
        },
        {
          title: 'Tesorería y Bancos',
          href: '/tesoreria',
          icon: Landmark,
          color: 'text-emerald-400',
          requiresModule: 'moduloTesoreria',
          allowedRoles: ['ADMIN', 'ENCARGADO', 'AUDITOR']
        },
        {
          title: 'CRM y Pipeline',
          href: '/crm',
          icon: Kanban,
          color: 'text-indigo-400',
          requiresModule: 'moduloCrm',
          allowedRoles: ['ADMIN', 'ENCARGADO', 'AUDITOR']
        },
        {
          title: 'Manufactura',
          href: '/manufactura',
          icon: Factory,
          color: 'text-teal-400',
          requiresModule: 'moduloManufactura',
          allowedRoles: ['ADMIN', 'ALMACENISTA', 'AUDITOR']
        }
      ]
    },
    {
      id: 'inventario',
      title: 'Inventario y Logística',
      icon: Boxes,
      color: 'text-cyan-400',
      items: [
        {
          title: 'Catálogo y Almacenes',
          href: '/inventarios',
          icon: Boxes,
          color: 'text-cyan-400'
        },
        {
          title: 'Traspasos de Almacén',
          href: '/traspasos',
          icon: ArrowLeftRight,
          color: 'text-sky-400',
          requiresModule: 'moduloTraspasos'
        }
      ]
    },
    {
      id: 'finanzas',
      title: 'Finanzas y Fiscal',
      icon: BookOpen,
      color: 'text-violet-400',
      allowedRoles: ['ADMIN', 'AUDITOR'],
      items: [
        {
          title: 'Contabilidad',
          href: '/contabilidad',
          icon: BookOpen,
          color: 'text-violet-400',
          requiresModule: 'moduloContabilidad'
        },
        {
          title: 'Nómina',
          href: '/nomina',
          icon: UserCheck,
          color: 'text-pink-400',
          requiresModule: 'moduloNomina'
        }
      ]
    },
    {
      id: 'reportes',
      title: 'Reportes',
      icon: BarChart3,
      color: 'text-rose-400',
      allowedRoles: ['ADMIN', 'AUDITOR'],
      requiresModule: 'moduloReportes',
      items: [
        {
          title: 'Reportes',
          href: '/reportes',
          icon: BarChart3,
          color: 'text-rose-400'
        },
        {
          title: 'Bitácora de Auditoría',
          href: '/auditoria',
          icon: History,
          color: 'text-amber-400',
          allowedRoles: ['AUDITOR']
        }
      ]
    },
    {
      id: 'configuracion',
      title: 'Configuración del Negocio',
      icon: Sliders,
      color: 'text-slate-400',
      allowedRoles: ['ADMIN'],
      items: [
        {
          title: 'Personalizar',
          href: '/personalizacion',
          icon: Sliders,
          color: 'text-slate-400'
        },
        {
          title: 'Gestión de Usuarios',
          href: '/usuarios',
          icon: Users,
          color: 'text-slate-400'
        }
      ]
    }
  ], []);

  // Mantener abierto automáticamente el grupo que contenga la ruta activa
  useEffect(() => {
    menuGroups.forEach(group => {
      const hasActive = group.items.some(item => pathname === item.href);
      if (hasActive) {
        setOpenGroups(prev => ({ ...prev, [group.id]: true }));
      }
    });
  }, [pathname, menuGroups]);

  // Filtrado de grupos y elementos según rol, suscripción y término de búsqueda
  const visibleGroups = useMemo(() => {
    if (isSuperadmin) return [];

    return menuGroups
      .filter(group => {
        // Filtrar grupo por rol
        if (group.allowedRoles && (!rol || !group.allowedRoles.includes(rol))) {
          return false;
        }
        // Filtrar grupo por módulo
        if (group.requiresModule && tenant && !(tenant as any)[group.requiresModule]) {
          return false;
        }
        return true;
      })
      .map(group => {
        const filteredItems = group.items.filter(item => {
          // Filtrar item por rol
          if (item.allowedRoles && (!rol || !item.allowedRoles.includes(rol))) {
            return false;
          }
          // Filtrar item por módulo del tenant
          if (item.requiresModule && tenant && !(tenant as any)[item.requiresModule]) {
            return false;
          }
          // Filtrar por término de búsqueda
          if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            return (
              item.title.toLowerCase().includes(query) ||
              group.title.toLowerCase().includes(query)
            );
          }
          return true;
        });

        return {
          ...group,
          items: filteredItems
        };
      })
      .filter(group => group.items.length > 0);
  }, [menuGroups, isSuperadmin, rol, tenant, searchTerm]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const isActive = (path: string) => pathname === path;

  if (loading || !user) {
    return (
      <aside className="w-64 bg-slate-950 text-white min-h-[calc(100vh-4rem)] p-4 flex flex-col gap-3 border-r border-slate-800">
        <div className="h-9 bg-slate-900/80 rounded-lg animate-pulse"></div>
        <div className="h-8 bg-slate-900/50 rounded-lg animate-pulse"></div>
        <div className="h-8 bg-slate-900/50 rounded-lg animate-pulse"></div>
        <div className="h-8 bg-slate-900/50 rounded-lg animate-pulse"></div>
      </aside>
    );
  }

  return (
    <aside 
      className={`relative bg-slate-950 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col justify-between border-r border-slate-800/90 shrink-0 select-none transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Botón Flotante para Colapsar/Expandir Menú */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expandir menú lateral' : 'Colapsar a iconos'}
        className="absolute -right-3 top-4 z-20 bg-slate-900 hover:bg-blue-600 text-white/80 hover:text-white border border-slate-700 hover:border-blue-500 rounded-full p-1.5 shadow-md shadow-slate-950/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        {collapsed ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
      </button>

      <div className="flex-1 flex flex-col min-h-0">
        {/* BUSCADOR RÁPIDO EN SIDEBAR (Solo en vista expandida) */}
        {!collapsed && !isSuperadmin && (
          <div className="p-3 pb-2 border-b border-slate-800/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar módulo o función..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-900/90 text-xs text-slate-100 placeholder-slate-500 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* CONTENEDOR DE NAVEGACIÓN CON SCROLL ESTILIZADO */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3 custom-scrollbar">
          {/* MODO SUPERADMIN */}
          {isSuperadmin && (
            <div className="space-y-1">
              {!collapsed && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1 text-xs font-bold uppercase tracking-wider text-purple-400">
                  <ShieldAlert className="w-3.5 h-3.5" /> Administración SaaS
                </div>
              )}
              <nav className="space-y-1">
                <Link
                  href="/"
                  title="Dashboard SaaS Master"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive('/') 
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20' 
                      : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                  } ${collapsed ? 'justify-center px-0 w-10 h-10 mx-auto' : ''}`}
                >
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>Dashboard SaaS Master</span>}
                </Link>
                <Link
                  href="/negocios"
                  title="Negocios & Inquilinos"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive('/negocios') 
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20' 
                      : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                  } ${collapsed ? 'justify-center px-0 w-10 h-10 mx-auto' : ''}`}
                >
                  <Building2 className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>Negocios & Inquilinos</span>}
                </Link>
                <Link
                  href="/auditoria"
                  title="Bitácora de Auditoría"
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive('/auditoria') 
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20' 
                      : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                  } ${collapsed ? 'justify-center px-0 w-10 h-10 mx-auto' : ''}`}
                >
                  <History className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>Bitácora de Auditoría</span>}
                </Link>
              </nav>
            </div>
          )}

          {/* MODO TENANT / EMPRESA CON ACORDEONES MODERNOS */}
          {!isSuperadmin && (
            <div className="space-y-2">
              {visibleGroups.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-slate-500">
                  No se encontraron módulos que coincidan con "{searchTerm}"
                </div>
              ) : (
                visibleGroups.map(group => {
                  const isOpen = searchTerm.trim() ? true : (openGroups[group.id] ?? true);
                  const hasActiveChild = group.items.some(it => isActive(it.href));
                  const GroupIcon = group.icon;
                  // Si tiene items, la primera opción es el enlace directo si se pulsa en colapsado
                  const firstHref = group.items[0]?.href || '#';

                  return (
                    <div key={group.id} className="rounded-xl transition-all duration-200">
                      {/* ENCABEZADO DE CATEGORÍA / ACORDEÓN (MODO EXPANDIDO) */}
                      {!collapsed ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold tracking-wide rounded-lg transition-colors group ${
                              hasActiveChild 
                                ? 'text-white bg-slate-900/90' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className={`p-1 rounded-md bg-slate-900 border border-slate-800/80 ${group.color}`}>
                                <GroupIcon className="w-3.5 h-3.5" />
                              </span>
                              <span className="truncate">{group.title}</span>
                            </div>
                            <ChevronDown 
                              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                                isOpen ? 'transform rotate-0 text-slate-300' : 'transform -rotate-90'
                              }`}
                            />
                          </button>

                          {/* SUBMENÚ EN MODO EXPANDIDO */}
                          {isOpen && (
                            <nav className="space-y-0.5 mt-1 pl-3.5 pr-1 border-l border-slate-800/60 ml-3.5 my-1">
                              {group.items.map(item => {
                                const ItemIcon = item.icon;
                                const active = isActive(item.href);

                                return (
                                  <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`group/item flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                      active 
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                                        : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 truncate">
                                      <ItemIcon className={`w-4 h-4 shrink-0 transition-transform group-hover/item:scale-110 ${
                                        active ? 'text-white' : item.color || 'text-slate-400'
                                      }`} />
                                      <span className="truncate">{item.title}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                      {item.badge && (
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                          {item.badge}
                                        </span>
                                      )}
                                      {rol === 'AUDITOR' && item.href !== '/auditoria' && (
                                        <Eye className={`w-3.5 h-3.5 ${active ? 'text-white/90' : 'text-slate-500 group-hover/item:text-slate-300'}`} />
                                      )}
                                    </div>
                                  </Link>
                                );
                              })}
                            </nav>
                          )}
                        </>
                      ) : (
                        /* EN MODO COLAPSADO: SOLO EL ICONO PRINCIPAL DE LA CATEGORÍA PERFECTAMENTE ALINEADO Y CENTRADO */
                        <div className="flex justify-center my-1.5">
                          <Link
                            href={firstHref}
                            title={`${group.title} (${group.items.map(i => i.title).join(', ')})`}
                            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 group relative ${
                              hasActiveChild
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 ring-2 ring-blue-400/50'
                                : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <GroupIcon className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                              hasActiveChild ? 'text-white' : group.color
                            }`} />

                            {/* Tooltip flotante limpio */}
                            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-slate-100 text-xs rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                              <span className="font-semibold block text-slate-200">{group.title}</span>
                              <span className="text-xs text-slate-400 block">{group.items.length} módulos</span>
                            </div>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* PIE DEL SIDEBAR: ROL, SEGURIDAD Y ESTADO */}
      <div className="p-3 border-t border-slate-800/90 bg-slate-950/90">
        {!collapsed ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-slate-300">Rol:</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                  {rol}
                </span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sesión activa y segura"></div>
            </div>

            {rol === 'AUDITOR' && (
              <p className="text-xs text-amber-400 font-medium flex items-center gap-1 mt-1">
                <Eye className="w-3.5 h-3.5" /> Modo Auditoría (Solo Lectura)
              </p>
            )}
            {rol === 'ALMACENISTA' && (
              <p className="text-xs text-blue-400 font-medium mt-1">
                Gestión física de inventario
              </p>
            )}
          </div>
        ) : (
          <div className="flex justify-center" title={`Rol activo: ${rol}`}>
            <Lock className="w-4 h-4 text-slate-500 hover:text-slate-300 transition-colors" />
          </div>
        )}
      </div>
    </aside>
  );
}
