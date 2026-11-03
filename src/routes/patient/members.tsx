import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import MembersScreen from '@/features/patient/members-screen'

export const Route = createFileRoute('/patient/members')({
  validateSearch: z.object({
    member: z.string().optional().catch(undefined),
    view: z.enum(['profile', 'records']).optional().catch(undefined),
    visit: z.string().optional().catch(undefined),
  }),
  component: function MembersRoute() {
    const { member, view, visit } = Route.useSearch()
    return <MembersScreen memberId={member} view={view} visitId={visit} />
  },
})
