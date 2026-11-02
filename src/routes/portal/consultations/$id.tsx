import { createFileRoute } from '@tanstack/react-router'
import ConsultRoom from '@/features/consult/consult-room'

export const Route = createFileRoute('/portal/consultations/$id')({
  component: function ConsultRoute() {
    const { id } = Route.useParams()
    return <ConsultRoom key={id} id={id} />
  },
})
