import { QueryClient } from '@tanstack/react-query'

/* Not used by the prototype's screens yet — they read the local platform
   store (store/consult-store.ts). Mounted now so ccpl-api calls slot in with
   the same setup as CCPL-ERP-Frontend. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
})
