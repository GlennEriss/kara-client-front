import routes from '@/constantes/routes'
import { redirect } from 'next/navigation'

export default function CreditSpecialePage() {
  redirect(routes.admin.creditSpecialeContrats)
}
