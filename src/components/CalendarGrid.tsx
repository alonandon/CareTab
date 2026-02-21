import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import type { Shift } from '../types'
import { formatShiftDate, groupShiftsByDate, formatShiftTimeRange } from '../lib/shifts'

interface Props {
  shifts: Shift[]
  onShiftClick?: (shift: Shift) => void
  onDateClick?: (date: string) => void
  loading?: boolean
  view?: 'month' | 'week'
  defaultDate?: Date
}

export function CalendarGrid({
  shifts,
  onShiftClick,
  onDateClick,
  loading = false,
  view = 'month',
  defaultDate,
}: Props) {
  const [currentDate, setCurrentDate] = useState(defaultDate ?? new Date())
  const [displayView, setDisplayView] = useState<'month' | 'week'>(view)

  const shiftsByDate = groupShiftsByDate(shifts)

  // Get calendar days based on view
  const getDays = () => {
    if (displayView === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
      return eachDayOfInterval({ start, end })
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 })
      const end = endOfWeek(currentDate, { weekStartsOn: 0 })
      return eachDayOfInterval({ start, end })
    }
  }

  const days = getDays()
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handlePrevious = () => {
    if (displayView === 'month') {
      setCurrentDate(addMonths(currentDate, -1))
    } else {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() - 7)
      setCurrentDate(newDate)
    }
  }

  const handleNext = () => {
    if (displayView === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 7)
      setCurrentDate(newDate)
    }
  }

  const getShiftStatusColor = (shift: Shift, dateStr: string): string => {
    const shiftDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (shiftDate > today) {
      return 'bg-blue-100 border-blue-300 text-blue-900' // Scheduled
    }

    // Check if confirmed (has time entry) - this would need to be passed in or calculated
    // For now, we'll just use unconfirmed color for past shifts
    return 'bg-yellow-100 border-yellow-300 text-yellow-900' // Unconfirmed
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {displayView === 'month'
              ? format(currentDate, 'MMMM yyyy')
              : `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d')}`}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setDisplayView('month')}
              className={`px-2 py-1 text-xs font-medium rounded ${
                displayView === 'month'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setDisplayView('week')}
              className={`px-2 py-1 text-xs font-medium rounded ${
                displayView === 'week'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Week
            </button>
          </div>
          <div className="flex gap-1 ml-2 border-l border-gray-200 pl-2">
            <button
              onClick={handlePrevious}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
              aria-label="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNext}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
              aria-label="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded bg-blue-400" />
          <span className="text-gray-600">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded bg-yellow-400" />
          <span className="text-gray-600">Unconfirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded bg-green-400" />
          <span className="text-gray-600">Confirmed</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading calendar...</div>
      ) : (
        <>
          {/* Calendar Grid */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Day names */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-xs font-semibold text-gray-600"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayShifts = shiftsByDate.get(dateStr) ?? []
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                const isToday =
                  dateStr === format(new Date(), 'yyyy-MM-dd')

                return (
                  <div
                    key={idx}
                    onClick={() => onDateClick?.(dateStr)}
                    className={`min-h-24 p-2 border-r border-b border-gray-200 cursor-pointer transition-colors ${
                      isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                    } ${isToday ? 'ring-1 ring-inset ring-blue-400' : ''}`}
                  >
                    <div
                      className={`text-xs font-semibold mb-1 ${
                        isToday
                          ? 'text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded'
                          : isCurrentMonth
                            ? 'text-gray-900'
                            : 'text-gray-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayShifts.slice(0, 2).map((shift) => (
                        <div
                          key={shift.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onShiftClick?.(shift)
                          }}
                          className={`p-1 rounded text-xs border cursor-pointer hover:shadow-sm transition-shadow ${getShiftStatusColor(
                            shift,
                            dateStr
                          )}`}
                        >
                          <div className="font-medium truncate">
                            {formatShiftTimeRange(shift.start_time, shift.end_time)}
                          </div>
                        </div>
                      ))}
                      {dayShifts.length > 2 && (
                        <div className="text-xs text-gray-500 px-1">
                          +{dayShifts.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
