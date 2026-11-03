import { createFileRoute } from '@tanstack/react-router'
import DoctorDetailScreen from '@/features/admin/doctor-detail-screen'

export const Route = createFileRoute('/admin/doctors/$id')({
  component: function AdminDoctorRoute() {
    const { id } = Route.useParams()
    return <DoctorDetailScreen key={id} id={id} />
  },
})
