import { Outlet, createRootRoute, Link } from '@tanstack/react-router'
import { AppToaster } from '@/components/common/toast'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => (
    <div className="mx-auto mt-24 max-w-md rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) py-14 text-center">
      <p className="text-[14px] font-semibold text-(--color-ink)">Page not found</p>
      <p className="mt-1 text-[12.5px] text-(--color-mute)">
        This screen does not exist in Digital Consultation. <Link to="/">Start again</Link>
      </p>
    </div>
  ),
})

function RootComponent() {
  return (
    <>
      <Outlet />
      <AppToaster />
    </>
  )
}
