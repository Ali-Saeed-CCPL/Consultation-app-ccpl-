import { createFileRoute } from '@tanstack/react-router'
import ConsultRoom from '@/features/consult/consult-room'

export const Route = createFileRoute('/admin/consultations/$id')({
  component: function AdminConsultRoute() {
    const { id } = Route.useParams()
    return <ConsultRoom key={id} id={id} admin />
  },
})
