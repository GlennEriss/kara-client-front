import { Loader2 } from 'lucide-react'

export function CalendarFocusLoading({ loading }: { loading: boolean }) {
  if (!loading) return null
  return (
    <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-[#234D65] shadow-lg">
      <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
      Chargement de l&apos;échéance…
    </div>
  )
}
