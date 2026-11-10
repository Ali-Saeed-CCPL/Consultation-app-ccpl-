import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'

// Manrope for all Latin text and numbers (tabular figures, set in index.css),
// plus Noto Sans Arabic for the patient app's Urdu — a UI face that sits on the
// same line height as the Latin text, where Nastaliq needed double. index.css
// binds them to variables; nothing else in the app names a family directly.
import '@fontsource-variable/manrope'
import '@fontsource-variable/noto-sans-arabic'

import { queryClient } from '@/lib/query-client'
import '@/api/session-sync'
import { router } from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
