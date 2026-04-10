import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/700.css";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import { guesthouseTheme } from "./theme/theme";
import App from "./App";
import "./styles.css";

registerSW({ immediate: true });

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found.");
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider theme={guesthouseTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);

