import { createFileRoute } from '@tanstack/react-router'
import RecordsScreen from '@/features/patient/records-screen'

export const Route = createFileRoute('/patient/records')({
  component: RecordsScreen,
})
