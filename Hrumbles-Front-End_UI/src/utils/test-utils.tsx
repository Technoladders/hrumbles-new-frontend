import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { BrowserRouter } from "react-router-dom";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import theme from "@/theme/theme"; // Ensure this path matches your theme location
import { TooltipProvider } from "@/components/jobs/ui/tooltip";

// Import your ACTUAL reducers
import authReducer from "@/Redux/authSlice";
import employeeReducer from "@/Redux/employeeSlice";
import departmentReducer from "@/Redux/departmentSlice";
import roleReducer from "@/Redux/roleSlice";
import clientReducer from "@/Redux/clientSlice";
import organizationReducer from "@/Redux/organizationSlice";
import firmOrganizationReducer from "@/Redux/firmOrganizationSlice";
import workspaceReducer from "@/Redux/workspaceSlice";
import uiReducer from "@/Redux/uiSlice";

// Define the shape of the options for customRender
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Record<string, any>;
  store?: any;
}

const customRender = (
  ui: ReactElement,
  {
    preloadedState = {},
    // Automatically create a store instance if no store was passed in
    store = configureStore({
      reducer: {
        auth: authReducer,
        employees: employeeReducer,
        departments: departmentReducer,
        roles: roleReducer,
        clients: clientReducer,
        organization: organizationReducer,
        firmOrganization: firmOrganizationReducer,
        workspace: workspaceReducer,
        ui: uiReducer,
      },
      preloadedState,
    }),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) => {
  // Create a new QueryClient for each test to prevent data leaking
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for faster tests
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ChakraProvider theme={theme}>
            <TooltipProvider>
              <BrowserRouter>
                {children}
              </BrowserRouter>
            </TooltipProvider>
          </ChakraProvider>
        </QueryClientProvider>
      </Provider>
    );
  };

  // Return the store so tests can dispatch actions or check state if needed
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
};

// Re-export everything from RTL
export * from "@testing-library/react";
export { customRender as render };