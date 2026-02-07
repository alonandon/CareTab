import { useAuth } from '../context/AuthContext'
import { ParentDashboard } from './ParentDashboard'
import { NannyDashboard } from './NannyDashboard'

export function DashboardPage() {
  const { profile } = useAuth()

  if (profile?.role === 'nanny') {
    return <NannyDashboard />
  }

  return <ParentDashboard />
}
