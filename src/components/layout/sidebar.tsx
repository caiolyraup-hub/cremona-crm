'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CheckSquare,
  DollarSign,
  Kanban,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Users,
  Zap,
} from 'lucide-react'
import { useWorkspace } from '@/contexts/workspace-context'
import { cn } from '@/lib/utils'

type NavLinkItem = {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
  soon?: boolean
}

const mainNav: NavLinkItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/contacts', label: 'Contatos', icon: Users },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: Kanban },
]

const whatsappNav: NavLinkItem[] = [
  { href: '/dashboard/inbox', label: 'WhatsApp', icon: MessageCircle },
  { href: '/dashboard/automations', label: 'Automações', icon: Zap },
  { href: '/dashboard/whatsapp', label: 'Analytics', icon: BarChart3 },
]

const bottomNav: NavLinkItem[] = [
  { href: '/dashboard/tasks', label: 'Tarefas', icon: CheckSquare },
  { href: '/dashboard/sales', label: 'Vendas', icon: DollarSign },
  { href: '/dashboard/settings', label: 'Configuracoes', icon: Settings },
]

interface NavItemProps {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  soon?: boolean
  badge?: number
  badgeTone?: 'red' | 'green' | 'blue'
}

function NavItem({ href, label, icon: Icon, active, soon, badge, badgeTone = 'red' }: NavItemProps) {
  const badgeColor =
    badgeTone === 'green' ? 'bg-green-500' :
    badgeTone === 'blue'  ? 'bg-blue-500'  :
    'bg-red-500'

  return (
    <Link
      href={href}
      className={cn(
        'flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors duration-150',
        active
          ? 'bg-blue-50 font-medium text-blue-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      <div className="relative shrink-0">
        <Icon size={16} />
        {badge && badge > 0 ? (
          <span
            className={[
              'absolute -right-1.5 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white',
              badgeColor,
            ].join(' ')}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </div>
      <span className="flex-1 truncate">{label}</span>
      {soon ? (
        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
          Em breve
        </span>
      ) : null}
    </Link>
  )
}

interface SidebarProps {
  overdueCount?: number
  unreadWhatsAppCount?: number
  activeAutomationsCount?: number
}

export function Sidebar({
  overdueCount = 0,
  unreadWhatsAppCount = 0,
  activeAutomationsCount = 0,
}: SidebarProps) {
  const pathname = usePathname()
  const workspace = useWorkspace()

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        {workspace.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={workspace.logo_url} alt="Logo" className="h-8 w-8 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {(workspace.business_name ?? workspace.name).charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-gray-900">
            {workspace.business_name ?? workspace.name}
          </span>
          <span className="block truncate text-[11px] text-gray-400">{workspace.name}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-0.5">
          {mainNav.map(({ href, label, icon, exact, soon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={isActive(href, exact)}
              soon={soon}
            />
          ))}
        </div>

        <div className="mt-3">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            WhatsApp
          </p>
          <div className="space-y-0.5">
            {whatsappNav.map(({ href, label, icon }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                icon={icon}
                active={isActive(href)}
                badge={
                  label === 'WhatsApp' ? unreadWhatsAppCount :
                  label === 'Automações' ? activeAutomationsCount :
                  undefined
                }
                badgeTone={
                  label === 'WhatsApp' ? 'green' :
                  label === 'Automações' ? 'blue' :
                  'red'
                }
              />
            ))}
          </div>
        </div>
      </nav>

      <div className="space-y-0.5 border-t border-gray-200 px-3 py-3">
        {bottomNav.map(({ href, label, icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={isActive(href)}
            badge={label === 'Tarefas' ? overdueCount : undefined}
          />
        ))}
      </div>
    </aside>
  )
}
