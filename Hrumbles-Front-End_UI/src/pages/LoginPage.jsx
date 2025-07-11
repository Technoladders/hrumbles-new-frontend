import { useState } from "react";
import { Box, Flex, Heading, Text, Button, Input, VStack, useColorMode, useColorModeValue, IconButton } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiSun, FiMoon } from "react-icons/fi";
import { signIn } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchUserSession } from "../Redux/authSlice";
import supabase from "../config/supabaseClient";

const MotionBox = motion(Box);

const LoginPage = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const bg = useColorModeValue("base.bglight", "base.bgdark");
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.700", "white");
  const buttonBg = useColorModeValue("base.primary1", "base.primary2");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch user role and department name
  const fetchUserDetails = async (userId) => {
    try {
      // Step 1: Fetch role_id and department_id from hr_employees
      const { data: employeeData, error: employeeError } = await supabase
        .from("hr_employees")
        .select("role_id, department_id")
        .eq("id", userId)
        .single();

      if (employeeError) {
        console.error("Error fetching employee data:", employeeError);
        return { role: null, departmentName: null };
      }

      if (!employeeData?.role_id || !employeeData?.department_id) {
        return { role: null, departmentName: null };
      }

      // Step 2: Fetch role name from hr_roles
      const { data: roleData, error: roleError } = await supabase
        .from("hr_roles")
        .select("name")
        .eq("id", employeeData.role_id)
        .single();

      if (roleError) {
        console.error("Error fetching role data:", roleError);
        return { role: null, departmentName: null };
      }

      // Step 3: Fetch department name from hr_departments
      const { data: departmentData, error: departmentError } = await supabase
        .from("hr_departments")
        .select("name")
        .eq("id", employeeData.department_id)
        .single();

      if (departmentError) {
        console.error("Error fetching department data:", departmentError);
        return { role: roleData.name || null, departmentName: null };
      }

      return { role: roleData.name || null, departmentName: departmentData.name || null };
    } catch (error) {
      console.error("Unexpected error:", error);
      return { role: null, departmentName: null };
    }
  };

  // Handle Login & Navigate based on role and department
  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { user } = await signIn(email, password);
      console.log("✅ Login Success:", user);

      // Fetch & Store User Session in Redux
      await dispatch(fetchUserSession()).unwrap();

      // Fetch user role and department
      const { role, departmentName } = await fetchUserDetails(user.id);

      // Determine navigation path
      let navigateTo = "/dashboard";
      if (role === "employee" && departmentName === "Finance") {
        navigateTo = "/finance";
      }

      console.log("Navigating to:", navigateTo, "Role:", role, "Department:", departmentName);

      // Navigate to the determined path
      navigate(navigateTo);
    } catch (error) {
      console.error("🔴 Login error:", error.message);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex height="100vh" bg={bg} align="center" justify="center" px={{ base: 4, md: 8, lg: 16 }}>
      {/* Left Content Section */}
      <MotionBox
        flex={1}
        textAlign="center"
        p={10}
        maxW={{ base: "100%", md: "50%" }}
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.5 }}
      >
        <Heading size="2xl" color={textColor} mb={4}>Hrumbles</Heading>
        <Text fontSize="lg" color={textColor} maxW="500px" mx="auto">
          Streamline your process with our powerful CRM solution, designed to manage your talent pipeline efficiently.
        </Text>
      </MotionBox>

      {/* Login Card */}
      <MotionBox
        flex={1}
        maxW={{ base: "100%", sm: "400px" }}
        mx={{ base: "auto", md: "unset" }}
        p={8}
        bg={cardBg}
        borderRadius="lg"
        boxShadow="lg"
        initial={{ opacity: 0, x: 80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9 }}
      >
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="lg">Login</Heading>
          <IconButton
            icon={colorMode === "dark" ? <FiSun /> : <FiMoon />}
            onClick={toggleColorMode}
            aria-label="Toggle Theme"
            variant="ghost"
            color={textColor}
          />
        </Flex>
        <VStack spacing={4}>
          <Input placeholder="Email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Text color="red.500" fontSize="sm">{error}</Text>}
          <Button 
            bg={buttonBg} 
            color="white" 
            width="full" 
            borderRadius="md" 
            _hover={{ opacity: 0.9 }} 
            isLoading={isLoading} 
            onClick={handleLogin}
          >
            Sign In
          </Button>
        </VStack>
        <Text fontSize="sm" color={textColor} mt={4} textAlign="center">
          Don’t have an account? <Box as="span" color="brand.primary1" cursor="pointer">Sign Up</Box>
        </Text>
      </MotionBox>
    </Flex>
  );
};

export default LoginPage;