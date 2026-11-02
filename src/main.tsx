import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'

// The two families the CrescentCare design system is built on, plus Noto
// Sans Arabic for the patient app's Urdu — a UI face that sits on the same
// line height as the Latin text, where Nastaliq needed double. index.css binds them to variables;
// nothing else in the app names a family directly.
import '@fontsource-variable/instrument-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@fontsource-variable/noto-sans-arabic'

import { queryClient } from '@/lib/query-client'
import { router } from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
