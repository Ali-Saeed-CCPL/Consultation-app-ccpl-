import { createFileRoute } from '@tanstack/react-router'
import ChooseScreen from '@/features/patient/choose-screen'

export const Route = createFileRoute('/patient/choose')({
  component: ChooseScreen,
})
