import { PopupProvider } from "./ui/primitives";
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource/geist/latin-400.css";
import "@fontsource/geist/latin-500.css";
import "@fontsource/geist/latin-600.css";
import "@fontsource/geist-mono/latin-400.css";
import "./styles.css";
import "./ui/primitives.css";
import { AuthGate } from "./AuthGate";
import { App } from "./App";
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60000, retry: 1, refetchOnWindowFocus: false },
  },
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PopupProvider>
      <QueryClientProvider client={client}>
        <AuthGate>
          <App />
        </AuthGate>
      </QueryClientProvider>
    </PopupProvider>
  </React.StrictMode>,
);
