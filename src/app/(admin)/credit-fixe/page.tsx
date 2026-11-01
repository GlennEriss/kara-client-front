import routes from '@/constantes/routes'
import { redirect } from 'next/navigation'

export default function CreditFixePage() {
  redirect(routes.admin.creditFixeContrats)
}
