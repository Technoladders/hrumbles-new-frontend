import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import employeeReducer from "./employeeSlice";
import departmentReducer from "./departmentSlice"
import roleReducer from "./roleSlice"
import clientReducer from "./clientSlice"
import organizationReducer from "./organizationSlice";
import firmOrganizationReducer from './firmOrganizationSlice';
import workspaceReducer from "./workspaceSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    employees: employeeReducer,
    departments: departmentReducer,
    roles: roleReducer,
    clients: clientReducer,
    organization: organizationReducer,
    firmOrganization: firmOrganizationReducer,
    workspace: workspaceReducer,
  },
});

export default store;
