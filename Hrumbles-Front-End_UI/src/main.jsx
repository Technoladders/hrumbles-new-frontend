import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import theme from "./theme/theme";
import { Provider } from "react-redux";
import store from "./Redux/store.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { EmployeeProvider } from "./context/EmployeeContext";
import { ThemeProvider } from "@material-tailwind/react";
 import { GoogleOAuthProvider } from '@react-oauth/google';

// --- START: Google Analytics Integration ---
import ReactGA from 'react-ga4';

// 1. Get your Measurement ID from the .env file
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// 2. Initialize Google Analytics
if (GA_MEASUREMENT_ID) {
  ReactGA.initialize(GA_MEASUREMENT_ID);
}
// --- END: Google Analytics Integration ---

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <Provider store={store}>
      <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <EmployeeProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
      </GoogleOAuthProvider>
      </ThemeProvider>
      </EmployeeProvider>
     </TooltipProvider>
      </QueryClientProvider>
      </Provider>
      </ChakraProvider>
    </StrictMode>,
)
