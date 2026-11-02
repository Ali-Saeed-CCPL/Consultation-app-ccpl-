import { createFileRoute } from '@tanstack/react-router'
import LoginScreen from '@/features/auth/login-screen'

export const Route = createFileRoute('/login')({
  head: () => ({ meta: [{ title: 'Sign in · Crescent Care Digital Consultation' }] }),
  component: LoginScreen,
})
