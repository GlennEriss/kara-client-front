import type { CallPlanItem } from '@/services/call-logs/callPlan'
import { callPlanToday } from '@/utils/call-plan-dates'
import { format } from 'date-fns'

const day = (value: string) => format(new Date(`${value}T12:00:00`), 'dd/MM/yyyy')

export function CallPlanScheduleStatus({ plan }: { plan: CallPlanItem }) {
  const overdue = plan.status === 'planned' && plan.scheduledDate < callPlanToday()
  const reported = !!plan.rescheduleHistory?.length
  return (
    <div className="space-y-1 text-xs">
      <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${plan.status === 'completed' ? 'bg-green-100 text-green-700' : overdue ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-700'}`}>
        {plan.status === 'completed' ? 'Terminé' : overdue ? 'À replanifier' : 'À appeler'}
      </span>
      <p className="text-gray-600">{reported ? 'Reporté au' : 'Prévu le'} {day(plan.scheduledDate)}</p>
      {!!plan.rescheduleHistory?.length && (
        <details className="max-w-xs whitespace-normal text-gray-600">
          <summary className="cursor-pointer text-[#234D65]">Historique des reports ({plan.rescheduleHistory.length})</summary>
          <ol className="mt-2 space-y-2">
            {plan.rescheduleHistory.map((entry, index) => (
              <li key={index} className="border-l-2 border-gray-200 pl-2">
                <p>{day(entry.from)} → {day(entry.to)}</p>
                <p>{entry.byName} · {format(entry.at, 'dd/MM/yyyy à HH:mm')}</p>
                {entry.reason && <p>{entry.reason}</p>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  )
}
