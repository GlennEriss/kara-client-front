import { act, renderHook, render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CalendarTablePagination, useCalendarPagination } from '../CalendarTablePagination'

describe('pagination du calendrier', () => {
  it('affiche vingt lignes, conserve le total et retrouve les suivantes', () => {
    const all = Array.from({ length: 41 }, (_, id) => id + 1)
    const { result, rerender } = renderHook(({ items, filter }) => useCalendarPagination(items, filter), { initialProps: { items: all, filter: 'tous' } })
    expect(result.current.items).toEqual(all.slice(0, 20))
    expect(result.current.total).toBe(41)
    act(() => result.current.setPage(2))
    expect(result.current.items).toEqual(all.slice(20, 40))
    rerender({ items: all, filter: 'autre-mois' })
    expect(result.current.page).toBe(1)
    act(() => result.current.setPage(3))
    rerender({ items: [1, 2], filter: 'autre-mois' })
    expect(result.current.page).toBe(1)
    expect(result.current.items).toEqual([1, 2])
  })

  it('permet de naviguer et indique l’intervalle affiché', () => {
    function Fixture() {
      const pagination = useCalendarPagination(Array.from({ length: 21 }, (_, id) => id), 'tous')
      return <><ul>{pagination.items.map(id => <li key={id}>Ligne {id + 1}</li>)}</ul><CalendarTablePagination pagination={pagination} /></>
    }
    render(<Fixture />)
    expect(screen.getAllByRole('listitem')).toHaveLength(20)
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText(/21–21 sur 21/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
  })
})
