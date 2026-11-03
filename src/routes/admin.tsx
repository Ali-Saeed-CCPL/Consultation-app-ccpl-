import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router'
import PortalShell from '@/components/layout/portal-shell'
import { useSession } from '@/store/session-store'

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [{ title: 'Admin portal · Crescent Care' }] }),
  component: AdminLayout,
})

function AdminLayout() {
  const isAdmin = useSession((s) => s.isAdmin)
  if (!isAdmin) return <Navigate to="/login" replace />
  return (
    <PortalShell>
      <Outlet />
    </PortalShell>
  )
}
