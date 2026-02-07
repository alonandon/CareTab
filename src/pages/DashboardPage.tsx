import { useAuth } from '../context/AuthContext'

export function DashboardPage() {
  const { profile } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Hi, {profile?.full_name || 'there'}
      </h1>
      <p className="mt-1 text-sm text-gray-500 capitalize">{profile?.role}</p>
      <p className="mt-4 text-gray-600">
        Track nanny &amp; babysitter hours, expenses, and payments.
      </p>
    </div>
  )
}
