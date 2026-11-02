import { createFileRoute } from '@tanstack/react-router'
import ConsentScreen from '@/features/patient/consent-screen'

export const Route = createFileRoute('/patient/consent')({
  component: ConsentScreen,
})
