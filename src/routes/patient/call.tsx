import { createFileRoute } from '@tanstack/react-router'
import CallScreen from '@/features/patient/call-screen'

export const Route = createFileRoute('/patient/call')({
  component: CallScreen,
})
