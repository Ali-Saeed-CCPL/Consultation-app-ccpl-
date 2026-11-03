import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/patient/records')({
  component: () => <Navigate to="/patient/members" replace />,
})
