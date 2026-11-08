import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CallPlanDatePicker } from '../CallPlanDatePicker'
import { RescheduleCallPlanModal } from '../RescheduleCallPlanModal'
import { CallPlanScheduleStatus } from '../CallPlanScheduleStatus'
import { LogCallModal } from '../LogCallModal'
import { WeeklyCallPlan } from '../WeeklyCallPlan'
import type { CallPlanItem } from '@/services/call-logs/callPlan'

const mock = vi.hoisted(() => ({ reschedule: vi.fn(), record: vi.fn(), schedule: vi.fn(), complete: vi.fn(), superAdmin: true, plans: [] as unknown[], overdue: [] as unknown[] }))
vi.mock('@/hooks/useCallPlans', () => ({
  useRescheduleCallPlan: () => ({ mutateAsync: mock.reschedule, isPending: false }),
  useScheduleCallBatch: () => ({ mutateAsync: mock.schedule, isPending: false }),
  useCallPlans: () => ({ data: mock.plans, isLoading: false }),
  useOverdueCallPlans: () => ({ data: mock.overdue, isLoading: false }),
  useCompleteCallPlan: () => ({ mutate: mock.complete }),
  useDeleteCallPlan: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/hooks/useCallLogs', () => ({ useRecordCall: () => ({ record: mock.record, isPending: false }) }))
vi.mock('@/hooks/useMyAccess', () => ({ useMyAccess: () => ({ isSuperAdmin: mock.superAdmin, canSeeAmounts: true }) }))
vi.mock('@/domains/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'agent@example.test' } }) }))

const assignee = { adminId: 'agent-1', email: 'agent@example.test', name: 'Agent A' }
const target = { personKey: 'uid:m1', name: 'Jeanne', product: 'Crédit Spéciale', isGroup: false, totalOverdue: 100_000, overdueCount: 1, maxDaysOverdue: 5, phone: '060000000' }
const plan = { ...target, id: 'appel-1', batchId: 'lot-1', status: 'planned', scheduledDate: '2026-11-06', assignee } as CallPlanItem

beforeEach(() => {
  vi.clearAllMocks(); mock.superAdmin = true; mock.plans = []; mock.overdue = []
  mock.reschedule.mockResolvedValue(1); mock.record.mockResolvedValue('log-1'); mock.schedule.mockResolvedValue(1)
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-08T12:00:00+01:00'))
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('choix de date et report', () => {
  it('propose les raccourcis et accepte une date hors de la semaine en cours', () => {
    const onChange = vi.fn()
    render(<CallPlanDatePicker id="date" value="2026-11-08" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Demain' }))
    expect(onChange).toHaveBeenLastCalledWith('2026-11-09')
    fireEvent.change(screen.getByLabelText('Date de la relance'), { target: { value: '2027-03-25' } })
    expect(onChange).toHaveBeenLastCalledWith('2027-03-25')
    expect(screen.getByRole('button', { name: 'Semaine prochaine' })).toBeInTheDocument()
  })

  it('replanifie un appel avec son motif puis navigue vers sa nouvelle date', async () => {
    const onRescheduled = vi.fn()
    render(<RescheduleCallPlanModal target={{ id: 'appel-1', label: 'Jeanne', scheduledDate: '2026-11-10' }} onClose={vi.fn()} onRescheduled={onRescheduled} />)
    fireEvent.change(screen.getByLabelText('Date de la relance'), { target: { value: '2026-11-13' } })
    fireEvent.change(screen.getByLabelText('Motif du report (facultatif)'), { target: { value: 'Attend son salaire' } })
    fireEvent.click(screen.getByRole('button', { name: 'Replanifier' }))
    await waitFor(() => expect(mock.reschedule).toHaveBeenCalledWith({ id: 'appel-1', scheduledDate: '2026-11-13', reason: 'Attend son salaire' }))
    expect(onRescheduled).toHaveBeenCalledWith('2026-11-13')
  })

  it('présente le retard et l’historique des reports', () => {
    render(<CallPlanScheduleStatus plan={{ ...plan, rescheduleHistory: [{ from: '2026-11-03', to: '2026-11-06', at: new Date('2026-11-02T12:00:00'), byId: 'super-1', byName: 'Admin A', reason: 'Attend son salaire' }] }} />)
    expect(screen.getByText('À replanifier')).toBeInTheDocument()
    expect(screen.getByText('Reporté au 06/11/2026')).toBeInTheDocument()
    expect(screen.getByText('03/11/2026 → 06/11/2026')).toBeInTheDocument()
    expect(screen.getByText('Attend son salaire')).toBeInTheDocument()
  })

  it('retrouve les appels des anciennes semaines dans la vue À replanifier', () => {
    mock.overdue = [plan]
    render(<WeeklyCallPlan />)
    fireEvent.click(screen.getByRole('button', { name: 'À replanifier' }))
    expect(screen.getByText('Jeanne')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Replanifier' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Replanifier l’appel')
  })

  it('réserve le report à la gestion du planning et conserve l’accès de l’agent à ses appels', () => {
    mock.overdue = [plan]; mock.superAdmin = false
    render(<WeeklyCallPlan />)
    fireEvent.click(screen.getByRole('button', { name: 'À replanifier' }))
    expect(screen.getByText('Jeanne')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Replanifier' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suivi des lots' })).not.toBeInTheDocument()
  })

  it('propose le report du lot entier depuis son suivi', async () => {
    mock.plans = [{ ...plan, scheduledDate: '2026-11-08' }]
    render(<WeeklyCallPlan />)
    fireEvent.click(screen.getByRole('button', { name: 'Suivi des lots' }))
    fireEvent.click(screen.getByRole('button', { name: 'Replanifier le lot' }))
    fireEvent.change(screen.getByLabelText('Date de la relance'), { target: { value: '2026-12-04' } })
    fireEvent.click(screen.getByRole('button', { name: 'Replanifier' }))
    await waitFor(() => expect(mock.reschedule).toHaveBeenCalledWith({ batchId: 'lot-1', scheduledDate: '2026-12-04', reason: '' }))
  })
})

describe('relance proposée sur une promesse de paiement', () => {
  it('crée la relance uniquement si elle est choisie, en conservant l’agent et le lien avec le compte rendu', async () => {
    const onRecorded = vi.fn()
    render(<LogCallModal open target={target} channel="call" followUpAssignee={assignee} onRecorded={onRecorded} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'A promis de payer' }))
    fireEvent.change(screen.getByLabelText('Date promise'), { target: { value: '2026-11-13' } })
    fireEvent.change(screen.getByLabelText('Votre commentaire'), { target: { value: 'Attend son salaire vendredi' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Prévoir une relance/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le compte rendu' }))
    await waitFor(() => expect(mock.schedule).toHaveBeenCalledWith({ scheduledDate: '2026-11-13', targets: [target], assignee, sourceCallLogId: 'log-1' }))
    expect(onRecorded).toHaveBeenCalledWith('log-1')
  })

  it('enregistre le compte rendu sans créer de relance si l’option n’est pas cochée', async () => {
    const onRecorded = vi.fn()
    render(<LogCallModal open target={target} channel="call" onRecorded={onRecorded} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'A promis de payer' }))
    fireEvent.change(screen.getByLabelText('Date promise'), { target: { value: '2026-11-13' } })
    fireEvent.change(screen.getByLabelText('Votre commentaire'), { target: { value: 'Paiement prévu vendredi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le compte rendu' }))
    await waitFor(() => expect(onRecorded).toHaveBeenCalledWith('log-1'))
    expect(mock.schedule).not.toHaveBeenCalled()
  })

  it('conserve le compte rendu si la création de la relance échoue', async () => {
    mock.schedule.mockRejectedValueOnce(new Error('Réseau indisponible'))
    const onRecorded = vi.fn()
    render(<LogCallModal open target={target} channel="call" onRecorded={onRecorded} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'A promis de payer' }))
    fireEvent.change(screen.getByLabelText('Date promise'), { target: { value: '2026-11-13' } })
    fireEvent.change(screen.getByLabelText('Votre commentaire'), { target: { value: 'Paiement prévu vendredi' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Prévoir une relance/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le compte rendu' }))
    await waitFor(() => expect(onRecorded).toHaveBeenCalledWith('log-1'))
    expect(mock.record).toHaveBeenCalledTimes(1)
  })
})
