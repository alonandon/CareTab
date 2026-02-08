import { NavLink } from 'react-router-dom'
import { Clock, DollarSign, Receipt, LayoutDashboard, ClipboardCheck, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const nannyItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/hours', icon: Clock, label: 'Hours' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/payments', icon: DollarSign, label: 'Payments' },
  { to: '/history', icon: FileText, label: 'History' },
]

const parentItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/approvals', icon: ClipboardCheck, label: 'Approvals' },
  { to: '/payments', icon: DollarSign, label: 'Payments' },
  { to: '/history', icon: FileText, label: 'History' },
]

export function BottomNav() {
  const { profile } = useAuth()
  const isParent = profile?.role === 'parent'
  const navItems = isParent ? parentItems : nannyItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 text-xs ${
                isActive ? 'text-blue-500' : 'text-gray-400'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
