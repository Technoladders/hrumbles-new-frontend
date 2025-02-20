import { Routes, Route } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import Signup from "../pages/GlobalSuperAdmin";
import Registration from "../pages/RegistrationPage";


const MainRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/registration" element={<Registration />} />
    </Routes>
  );
};

export default MainRoutes;
