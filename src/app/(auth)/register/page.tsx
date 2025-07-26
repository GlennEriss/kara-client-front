import { RegisterProvider } from '@/providers/RegisterProvider'
import Register from '@/components/register/Register'

export default function RegisterPage() {
  return (
    <RegisterProvider>
      <Register />
    </RegisterProvider>
  )
}
