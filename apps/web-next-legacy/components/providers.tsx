"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
import { I18nProvider } from "@/lib/i18n/provider";
import type { Lang } from "@/lib/i18n/core";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";

export function Providers({ children, initialLang, explicit }: { children: ReactNode; initialLang: Lang; explicit: boolean }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => {
              if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
              return count < 1;
            },
          },
        },
      }),
  );
  return (
    <I18nProvider initialLang={initialLang} explicit={explicit}>
      <QueryClientProvider client={client}>
        {children}
        <ServiceWorkerRegister />
      </QueryClientProvider>
    </I18nProvider>
  );
}
