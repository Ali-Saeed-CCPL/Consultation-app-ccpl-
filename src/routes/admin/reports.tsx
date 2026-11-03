import { createFileRoute } from '@tanstack/react-router'
import ReportsScreen from '@/features/admin/reports-screen'

export const Route = createFileRoute('/admin/reports')({
  component: ReportsScreen,
})
