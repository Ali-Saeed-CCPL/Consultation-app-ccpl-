import { createFileRoute } from '@tanstack/react-router'
import ChangePasswordScreen from '@/features/auth/change-password-screen'

export const Route = createFileRoute('/change-password')({
  head: () => ({ meta: [{ title: 'Change password · Crescent Care Digital Consultation' }] }),
  component: ChangePasswordScreen,
})
