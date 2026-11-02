import { createFileRoute } from '@tanstack/react-router'
import QueueScreen from '@/features/patient/queue-screen'

export const Route = createFileRoute('/patient/queue')({
  component: QueueScreen,
})
