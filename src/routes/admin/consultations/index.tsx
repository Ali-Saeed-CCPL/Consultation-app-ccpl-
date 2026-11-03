import { createFileRoute } from '@tanstack/react-router'
import AdminConsultationsScreen from '@/features/admin/admin-consultations-screen'

// Admin consultations are one records list with filters (no live / triage views).
export const Route = createFileRoute('/admin/consultations/')({
  component: AdminConsultationsScreen,
})
