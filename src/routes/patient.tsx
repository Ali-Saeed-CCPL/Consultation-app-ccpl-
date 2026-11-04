import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router'
import PatientShell from '@/components/layout/patient-shell'
import { useSession } from '@/store/session-store'

export const Route = createFileRoute('/patient')({
  head: () => ({ meta: [{ title: 'Digital Consultation · Crescent Care' }] }),
  component: PatientLayout,
})

function PatientLayout() {
  const signedIn = useSession((s) => Boolean(s.patientPhone))
  if (!signedIn) return <Navigate to="/login" replace />
  return (
    <PatientShell>
      <Outlet />
    </PatientShell>
  )
}
