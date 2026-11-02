import { createFileRoute } from '@tanstack/react-router'
import SymptomsScreen from '@/features/patient/symptoms-screen'

export const Route = createFileRoute('/patient/symptoms')({
  component: SymptomsScreen,
})
