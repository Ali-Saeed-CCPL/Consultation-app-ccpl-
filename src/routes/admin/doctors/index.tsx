import { createFileRoute } from '@tanstack/react-router'
import DoctorsScreen from '@/features/admin/doctors-screen'

export const Route = createFileRoute('/admin/doctors/')({
  component: DoctorsScreen,
})
