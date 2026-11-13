'use client'

import { useEffect, useState } from 'react'
import { ListPagination } from '@/components/ui/list-pagination'

export const CALENDAR_PAGE_SIZE = 20

export function useCalendarPagination<T>(items: readonly T[], filterKey: string) {
  const [state, setState] = useState({ key: filterKey, page: 1 })
  const totalPages = Math.max(1, Math.ceil(items.length / CALENDAR_PAGE_SIZE))
  const page = state.key === filterKey ? Math.min(state.page, totalPages) : 1
  useEffect(() => {
    if (state.key !== filterKey || state.page !== page) setState({ key: filterKey, page })
  }, [filterKey, page, state.key, state.page])
  return {
    items: items.slice((page - 1) * CALENDAR_PAGE_SIZE, page * CALENDAR_PAGE_SIZE),
    page,
    totalPages,
    total: items.length,
    setPage: (next: number) => setState({ key: filterKey, page: Math.max(1, Math.min(next, totalPages)) }),
  }
}

export function CalendarTablePagination({ pagination }: {
  pagination: { page: number; totalPages: number; total: number; setPage: (next: number) => void }
}) {
  if (!pagination.total) return null
  const { page, totalPages, total, setPage } = pagination
  return <ListPagination
    className="border-t border-gray-100 p-3"
    currentPage={page}
    totalPages={totalPages}
    onPrev={() => setPage(page - 1)}
    onNext={() => setPage(page + 1)}
    summary={`${(page - 1) * CALENDAR_PAGE_SIZE + 1}–${Math.min(page * CALENDAR_PAGE_SIZE, total)} sur ${total} · 20 par page`}
  />
}
