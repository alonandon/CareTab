import type { LucideIcon } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
      {Icon && (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Icon size={24} className="text-gray-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
