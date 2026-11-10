import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router'
import { tokens } from '@/api/client'
import PortalShell from '@/components/layout/portal-shell'
import { useDoctorHeartbeat } from '@/features/portal/use-doctor-presence'
import { useSession } from '@/store/session-store'
import { useCurrentDoctor } from '@/store/use-current-doctor'
import type { Doctor } from '@/lib/types'

export const Route = createFileRoute('/portal')({
  head: () => ({ meta: [{ title: 'Doctor portal · Crescent Care' }] }),
  component: PortalLayout,
})

function PortalLayout() {
  const doctor = useCurrentDoctor()
  const mustChangePassword = useSession((s) => s.mustChangePassword)
  // The server is the real check on every request; this only keeps a signed-out tab off the portal.
  if (!doctor || doctor.active === false || !tokens.hasStaff()) return <Navigate to="/login" replace />
  if (mustChangePassword) return <Navigate to="/change-password" replace />
  return <SignedInPortal doctor={doctor} />
}

function SignedInPortal({ doctor }: { doctor: Doctor }) {
  useDoctorHeartbeat(doctor)
  return (
    <PortalShell doctor={doctor}>
      <Outlet />
    </PortalShell>
  )
}
