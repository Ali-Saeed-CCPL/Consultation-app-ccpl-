import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import ConsultationsScreen from '@/features/portal/consultations-screen'

export const Route = createFileRoute('/portal/consultations/')({
  validateSearch: z.object({ view: z.enum(['live', 'history', 'triage']).optional().catch(undefined) }),
  component: function ConsultationsRoute() {
    const { view } = Route.useSearch()
    return <ConsultationsScreen view={view ?? 'live'} />
  },
})
