import { createFileRoute } from '@tanstack/react-router'
import HomeScreen from '@/features/patient/home-screen'

export const Route = createFileRoute('/patient/home')({
  component: HomeScreen,
})
