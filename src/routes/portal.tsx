import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router'
import PortalShell from '@/components/layout/portal-shell'
import { useCurrentDoctor } from '@/store/use-current-doctor'

export const Route = createFileRoute('/portal')({
  head: () => ({ meta: [{ title: 'Doctor portal · Crescent Care' }] }),
  component: PortalLayout,
})

function PortalLayout() {
  const doctor = useCurrentDoctor()
  if (!doctor) return <Navigate to="/login" replace />
  return (
    <PortalShell doctor={doctor}>
      <Outlet />
    </PortalShell>
  )
}
