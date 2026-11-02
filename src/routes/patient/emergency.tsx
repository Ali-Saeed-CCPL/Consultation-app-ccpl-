import { createFileRoute } from '@tanstack/react-router'
import EmergencyScreen from '@/features/patient/emergency-screen'

export const Route = createFileRoute('/patient/emergency')({
  component: EmergencyScreen,
})
