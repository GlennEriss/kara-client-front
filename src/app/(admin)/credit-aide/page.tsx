import routes from '@/constantes/routes'
import { redirect } from 'next/navigation'

export default function CreditAidePage() {
  redirect(routes.admin.creditAideContrats)
}
