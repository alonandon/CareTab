import { NavLink } from 'react-router-dom'
import {
  Clock,
  DollarSign,
  Receipt,
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  UserCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePendingCount } from '../hooks/usePendingCount'

interface NavItem {
  to: string
  icon: typeof Clock
  label: string
  badge?: number
}

const nannyItems: Omit<NavItem, 'badge'>[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/hours', icon: Clock, label: 'Hours' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/payments', icon: DollarSign, label: 'Payments' },
  { to: '/history', icon: FileText, label: 'History' },
]

function useNavItems(): NavItem[] {
  const { user, profile } = useAuth()
  const isParent = profile?.role === 'parent'
  const pendingCount = usePendingCount(user?.id, !!isParent)

  if (!isParent) {
    return nannyItems
  }

  return [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/approvals', icon: ClipboardCheck, label: 'Approvals', badge: pendingCount || undefined },
    { to: '/payments', icon: DollarSign, label: 'Payments' },
    { to: '/history', icon: FileText, label: 'History' },
  ]
}

// ---------------------------------------------------------------------------
// Bottom nav (mobile / tablet)
// ---------------------------------------------------------------------------

export function BottomNav() {
  const navItems = useNavItems()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors ${
                isActive ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
              }`
            }
            aria-label={badge ? `${label} — ${badge} pending` : label}
          >
            <span className="relative">
              <Icon size={20} />
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `relative flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors ${
              isActive ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`
          }
          aria-label="Profile"
        >
          <UserCircle size={20} />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Sidebar nav (desktop)
// ---------------------------------------------------------------------------

export function SideNav() {
  const navItems = useNavItems()

  return (
    <nav
      className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0"
      aria-label="Main navigation"
    >
      <div className="px-4 py-5 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">Keeper</h1>
      </div>

      <div className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
            aria-label={badge ? `${label} — ${badge} pending` : label}
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      <div className="border-t border-gray-100 px-2 py-3">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`
          }
          aria-label="Profile"
        >
          <UserCircle size={18} />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  )
}
