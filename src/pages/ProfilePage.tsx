import { useState } from 'react'
import { LogOut, User, Mail, Shield, Save } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

export function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { success, error: showError } = useToast()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!user) return
    const trimmed = fullName.trim()
    if (!trimmed) {
      showError('Name cannot be empty.')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      showError('Failed to update profile.')
      return
    }
    await refreshProfile()
    success('Profile updated.')
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Profile info */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="profile-name" className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
            <User size={12} />
            Full name
          </label>
          <input
            id="profile-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Your name"
          />
        </div>

        {/* Email — read-only */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
            <Mail size={12} />
            Email
          </label>
          <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {user?.email}
          </p>
        </div>

        {/* Role — read-only */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
            <Shield size={12} />
            Role
          </label>
          <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600 capitalize">
            {profile?.role || 'Not set'}
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || fullName.trim() === (profile?.full_name || '')}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </section>

      {/* Account section */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Account</h2>
        <p className="text-xs text-gray-500 mb-3">
          Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
        </p>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </section>
    </div>
  )
}
