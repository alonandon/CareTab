import { useState, useMemo } from 'react'
import { Plus, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useHouseholdInstances } from '../hooks/useTimeEntries'
import { useNannyHouseholds } from '../hooks/useHousehold'
import {
  useAllShifts,
} from '../hooks/useShifts'
import { CalendarGrid } from '../components/CalendarGrid'
import { ShiftList } from '../components/ShiftList'
import { ShiftModal } from '../components/ShiftModal'
import { ShiftConfirmationCard } from '../components/ShiftConfirmationCard'
import type { Shift } from '../types'

export function CalendarPage() {
  const { user, profile } = useAuth()
  const isNanny = profile?.role === 'nanny'

  // Get instances based on role
  const { instances: parentInstances, loading: parentInstancesLoading } =
    useHouseholdInstances(!isNanny ? user?.id : undefined)
  const { instances: nannyInstances, loading: nannyInstancesLoading } =
    useNannyHouseholds()

  const instances = isNanny ? nannyInstances : parentInstances
  const instancesLoading = isNanny ? nannyInstancesLoading : parentInstancesLoading
  const instanceIds = useMemo(() => instances.map((i) => i.id), [instances])

  // Get shifts based on view
  const { shifts, loading: shiftsLoading, refresh: refreshShifts } = useAllShifts(instanceIds)

  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [showModal, setShowModal] = useState(false)
  const [editShift, setEditShift] = useState<Shift | null>(null)
  const [selectedShiftForConfirm, setSelectedShiftForConfirm] = useState<Shift | null>(null)

  const handleEditShift = (shift: Shift) => {
    setEditShift(shift)
    setShowModal(true)
  }

  const handleNewShift = () => {
    setEditShift(null)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditShift(null)
  }

  const handleModalSaved = () => {
    setShowModal(false)
    setEditShift(null)
    refreshShifts()
  }

  const handleShiftConfirmed = () => {
    setSelectedShiftForConfirm(null)
    refreshShifts()
  }

  const loading = instancesLoading || shiftsLoading

  // Parent view: can create shifts and see all shifts
  if (!isNanny) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={28} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Shift Calendar</h1>
          </div>
          {!loading && instances.length > 0 && (
            <button
              onClick={handleNewShift}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Schedule Shift
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : instances.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <Calendar size={32} className="mx-auto mb-3 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              No Nanny Instances
            </h2>
            <p className="text-gray-600">
              Create a nanny instance to start scheduling shifts.
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setView('calendar')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  view === 'calendar'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Calendar View
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  view === 'list'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                List View
              </button>
            </div>

            {view === 'calendar' ? (
              <CalendarGrid
                shifts={shifts}
                onShiftClick={handleEditShift}
                loading={loading}
              />
            ) : (
              <ShiftList
                shifts={shifts}
                loading={loading}
                onEdit={handleEditShift}
                onDelete={refreshShifts}
              />
            )}
          </>
        )}

        {showModal && (
          <ShiftModal
            instances={parentInstances}
            userId={user?.id ?? ''}
            editShift={editShift ?? undefined}
            onClose={handleModalClose}
            onSaved={handleModalSaved}
          />
        )}
      </div>
    )
  }

  // Nanny view: see scheduled shifts and confirm past shifts
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar size={28} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">My Shifts</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : instances.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <Calendar size={32} className="mx-auto mb-3 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No Shifts Scheduled
          </h2>
          <p className="text-gray-600">
            Your parents will schedule shifts for you here.
          </p>
        </div>
      ) : (
        <>
          {/* Unconfirmed shifts section */}
          {shifts.some((s) => {
            const shiftDate = new Date(s.date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            return shiftDate < today
          }) && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Unconfirmed Shifts
              </h2>
              <div className="space-y-3">
                {shifts
                  .filter((s) => {
                    const shiftDate = new Date(s.date)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    return shiftDate < today
                  })
                  .map((shift) => (
                    selectedShiftForConfirm?.id === shift.id ? (
                      <ShiftConfirmationCard
                        key={shift.id}
                        shift={shift}
                        userId={user?.id ?? ''}
                        onConfirmed={handleShiftConfirmed}
                        onClose={() => setSelectedShiftForConfirm(null)}
                      />
                    ) : (
                      <div
                        key={shift.id}
                        onClick={() => setSelectedShiftForConfirm(shift)}
                        className="cursor-pointer rounded-lg border border-yellow-200 bg-yellow-50 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {new Date(shift.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {shift.start_time} - {shift.end_time}
                            </div>
                          </div>
                          <button className="px-3 py-1 rounded-lg bg-yellow-600 text-white text-sm font-medium hover:bg-yellow-700 transition-colors">
                            Confirm
                          </button>
                        </div>
                      </div>
                    )
                  ))}
              </div>
            </div>
          )}

          {/* Calendar view of all shifts */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              All Shifts
            </h2>
            <CalendarGrid
              shifts={shifts}
              loading={loading}
              defaultDate={new Date()}
            />
          </div>
        </>
      )}
    </div>
  )
}
