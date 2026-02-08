import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby, Briefcase, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

type Role = 'parent' | 'nanny'

export function OnboardingPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<'role' | 'name'>('role')
  const [role, setRole] = useState<Role | null>(null)
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role || !fullName.trim() || !user) return

    setError('')
    setSubmitting(true)

    const { error } = await supabase
      .from('profiles')
      .update({ role, full_name: fullName.trim() })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    await refreshProfile()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-white">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to CareTab</h1>
          <p className="mt-2 text-gray-500">Let&apos;s set up your account</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {step === 'role' && (
          <div className="space-y-4">
            <p className="text-center text-sm font-medium text-gray-700">
              I am a...
            </p>

            <button
              onClick={() => { setRole('parent'); setStep('name') }}
              className={`w-full flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all ${
                role === 'parent'
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Baby className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Parent</p>
                <p className="text-sm text-gray-500">I hire and manage caregivers</p>
              </div>
            </button>

            <button
              onClick={() => { setRole('nanny'); setStep('name') }}
              className={`w-full flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all ${
                role === 'nanny'
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Briefcase className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Nanny / Babysitter</p>
                <p className="text-sm text-gray-500">I track my hours and expenses</p>
              </div>
            </button>
          </div>
        )}

        {step === 'name' && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <span className="capitalize font-medium">{role}</span>
              <button
                type="button"
                onClick={() => setStep('role')}
                className="ml-auto text-blue-500 hover:text-blue-600 text-xs"
              >
                Change
              </button>
            </div>

            <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 mb-1">
                What should we call you?
              </label>
              <input
                id="full-name"
                type="text"
                required
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Your full name"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !fullName.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Get started'}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
