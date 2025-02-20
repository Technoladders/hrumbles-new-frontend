import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import HomePage from "../pages/HomePage";
// import DashboardPage from "../pages/DashboardPage";
import ProtectedRoute from "../Routes/ProtectedRoutes";
import GlobalSuperadminDashboard from "../pages/Global_Dashboard";

const DynamicRoutes = () => {
  return (
    <MainLayout>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route
          path="/global-superadmin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["global_superadmin"]}>
              <GlobalSuperadminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </MainLayout>
  );
};

export default DynamicRoutes;
