import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router'
import PortalShell from '@/components/layout/portal-shell'
import { useAdminDoctors } from '@/features/admin/use-admin-doctors'
import { useSession } from '@/store/session-store'

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [{ title: 'Admin portal · Crescent Care' }] }),
  component: AdminLayout,
})

function AdminLayout() {
  const isAdmin = useSession((s) => s.isAdmin)
  const token = useSession((s) => s.staffToken)
  const mustChangePassword = useSession((s) => s.mustChangePassword)
  // The server checks the admin role on every request; this only keeps a signed-out tab off the portal.
  if (!isAdmin || !token) return <Navigate to="/login" replace />
  if (mustChangePassword) return <Navigate to="/change-password" replace />
  return <SignedInAdmin />
}

function SignedInAdmin() {
  // Every admin screen reads the roster, so it's loaded once here for all of them.
  useAdminDoctors()
  return (
    <PortalShell>
      <Outlet />
    </PortalShell>
  )
}
