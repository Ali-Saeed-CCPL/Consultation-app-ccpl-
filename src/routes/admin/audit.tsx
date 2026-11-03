import { createFileRoute } from '@tanstack/react-router'
import AuditScreen from '@/features/portal/audit-screen'

export const Route = createFileRoute('/admin/audit')({
  component: AuditScreen,
})
