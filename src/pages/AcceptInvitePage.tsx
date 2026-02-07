import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'redirect'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setStatus('redirect')
      return
    }

    if (!token) {
      setStatus('error')
      setMessage('Invalid invitation link.')
      return
    }

    acceptInvitation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, token])

  async function acceptInvitation() {
    // Look up the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (fetchError || !invitation) {
      setStatus('error')
      setMessage('Invitation not found or has already been used.')
      return
    }

    if (invitation.status !== 'pending') {
      setStatus('error')
      setMessage('This invitation has already been accepted or has expired.')
      return
    }

    if (new Date(invitation.expires_at) < new Date()) {
      setStatus('error')
      setMessage('This invitation has expired.')
      return
    }

    // Add user to the household
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: invitation.household_id,
        profile_id: user!.id,
        role: 'nanny',
      })

    if (memberError) {
      if (memberError.code === '23505') {
        // Already a member — that's fine
      } else {
        setStatus('error')
        setMessage('Failed to join household. Please try again.')
        return
      }
    }

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id)

    setStatus('success')
    setMessage('You have joined the household!')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="mt-4 text-gray-500">Accepting invitation...</p>
      </div>
    )
  }

  if (status === 'redirect') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-xl font-bold text-gray-900">You&apos;ve been invited!</h2>
          <p className="mt-2 text-gray-500">Sign in or create an account to accept this invitation.</p>
          <div className="mt-6 space-y-3">
            <Link
              to={`/login`}
              className="block w-full rounded-lg bg-blue-500 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-600 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to={`/signup?invite=${token}`}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm text-center">
        {status === 'success' ? (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">You&apos;re in!</h2>
            <p className="mt-2 text-gray-500">{message}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 transition-colors"
            >
              Go to dashboard
            </button>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">Something went wrong</h2>
            <p className="mt-2 text-gray-500">{message}</p>
            <Link
              to="/dashboard"
              className="mt-6 inline-block text-sm text-blue-500 hover:text-blue-600"
            >
              Go to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
