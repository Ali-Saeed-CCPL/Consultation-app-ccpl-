import { createFileRoute } from '@tanstack/react-router'
import DashboardScreen from '@/features/portal/dashboard-screen'

export const Route = createFileRoute('/portal/dashboard')({
  component: DashboardScreen,
})
