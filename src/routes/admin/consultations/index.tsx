import { createFileRoute } from '@tanstack/react-router'
import ConsultationsScreen from '@/features/portal/consultations-screen'

// Admin consultations are one records list (no live / triage views).
export const Route = createFileRoute('/admin/consultations/')({
  component: () => <ConsultationsScreen admin view="history" />,
})
