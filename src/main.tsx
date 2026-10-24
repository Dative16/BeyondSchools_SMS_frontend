import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';

import { router } from '@/app/router';
import { ApiError } from '@/api/client';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { UpdatePrompt } from '@/pwa/UpdatePrompt';
import '@/styles/tokens.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retrying a 403 is pointless and retrying a 422 is worse than pointless:
      // it hides a bad request behind three identical failures. A network
      // stumble is the only thing worth a second go.
      retry: (failures, error) =>
        error instanceof ApiError && error.status < 500 ? false : failures < 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={null}>
          <RouterProvider router={router} />
        </Suspense>
        <UpdatePrompt />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
