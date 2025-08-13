import { useState } from "react";
import { Box, Flex, Heading, Text, Button, Input, VStack, useColorMode, useColorModeValue, IconButton, Image } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiSun, FiMoon } from "react-icons/fi";
import { signIn } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchUserSession } from "../Redux/authSlice";
import supabase from "../config/supabaseClient";
import { getOrganizationSubdomain } from "../utils/subdomain"; 

const MotionBox = motion(Box);

const ITECH_ORGANIZATION_ID = "1961d419-1272-4371-8dc7-63a4ec71be83";
const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

const LoginPage = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const organizationSubdomain = getOrganizationSubdomain();

  // Define color mode values
  const bgGradient = useColorModeValue(
    "linear(to-br, blue.50, purple.50)",
    "linear(to-br, gray.800, purple.900)"
  );
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.700", "gray.200");
  const buttonBg = useColorModeValue("linear(to-r, purple.500, blue.500)", "linear(to-r, purple.600, blue.600)");
  const buttonHover = useColorModeValue(
    { bg: "linear(to-r, purple.600, blue.600)", transform: "translateY(-2px)" },
    { bg: "linear(to-r, purple.700, blue.700)", transform: "translateY(-2px)" }
  );
  const logoSrc = useColorModeValue("/1-cropped.svg", "/hrumbles_logo2.png");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserDetails = async (userId) => {
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from("hr_employees")
        .select("role_id, department_id, organization_id")
        .eq("id", userId)
        .single();

      if (employeeError || !employeeData) {
        throw new Error("Employee profile not found for this user.");
      }
      
      console.log("[DEBUG] Raw employee data from DB:", employeeData);

      let roleName = null;
      let departmentName = null;

      if (employeeData.role_id) {
        const { data: roleData, error: roleError } = await supabase
          .from("hr_roles").select("name").eq("id", employeeData.role_id).single();
        if (roleError) console.warn("Could not fetch role name:", roleError.message);
        else roleName = roleData.name;
      }

      if (employeeData.department_id) {
        const { data: departmentData, error: departmentError } = await supabase
          .from("hr_departments").select("name").eq("id", employeeData.department_id).single();
        if (departmentError) console.warn("Could not fetch department name:", departmentError.message);
        else departmentName = departmentData.name;
      }
      
      return {
        role: roleName,
        departmentName: departmentName,
        organizationId: employeeData.organization_id,
      };

    } catch (error) {
      console.error("Error in fetchUserDetails:", error.message);
      return { role: null, departmentName: null, organizationId: null };
    }
  };

  const getOrganizationIdBySubdomain = async (subdomain) => {
    if (!subdomain) return null;
    const { data, error } = await supabase
      .from('hr_organizations').select('id').eq('subdomain', subdomain).single();
    if (error) {
      console.error("Error fetching organization by subdomain:", error.message);
      return null;
    }
    return data ? data.id : null;
  };

  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);
    console.log("--- LOGIN PROCESS STARTED ---");

    try {
      console.log(`[1] Reading subdomain from URL: "${organizationSubdomain}"`);
      const subdomainOrgId = await getOrganizationIdBySubdomain(organizationSubdomain);
      console.log(`[2] Fetched Organization ID for subdomain: "${subdomainOrgId}"`);

      if (!subdomainOrgId) {
        throw new Error("Invalid or unrecognized organization domain.");
      }

      console.log("[3] Attempting to sign in user:", email);
      const { user } = await signIn(email, password);
      console.log("[4] ✅ User authenticated successfully:", user);

      console.log("[5] Fetching employee details for user ID:", user.id);
      const { role, departmentName, organizationId: userOrgId } = await fetchUserDetails(user.id);
      console.log("[6] ✅ Fetched employee details:", { role, departmentName, userOrgId });
      
      if (!userOrgId) {
        throw new Error("Could not determine the user's organization. Please contact support.");
      }

      console.log(`[7] Comparing Org IDs -> User's Org ID: "${userOrgId}" vs Subdomain's Org ID: "${subdomainOrgId}"`);
      if (userOrgId !== subdomainOrgId) {
        throw new Error("Access Denied. Please log in from your organization's assigned domain.");
      }
      
      console.log("[8] ✅ Organization Match Verified. Proceeding to login.");

      await dispatch(fetchUserSession()).unwrap();

      let navigateTo = "/dashboard";
      if (role === "employee" && departmentName === "Finance") {
        navigateTo = "/finance";
      }
      if (userOrgId === ITECH_ORGANIZATION_ID || userOrgId === ASCENDION_ORGANIZATION_ID) {
        navigateTo = "/jobs";
      }
      
      console.log(`[9] Determining navigation path. Role: "${role}", Department: "${departmentName}". Navigating to: "${navigateTo}"`);
      console.log("--- LOGIN PROCESS COMPLETED SUCCESSFULLY ---");
      navigate(navigateTo);

    } catch (error) {
      console.error("🔴 LOGIN FAILED:", error.message);
      setError(error.message);
      console.log("--- LOGIN PROCESS HALTED DUE TO ERROR ---");
    } finally {
      setIsLoading(false);
    }
  };

    const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin(e);
    }
  };

  return (
    <Flex
      minH="100vh"
      bgGradient={bgGradient}
      align="center"
      justify="center"
      px={{ base: 4, md: 8, lg: 12 }}
      py={8}
    >
      <Flex
        direction={{ base: "column", md: "row" }}
        maxW="1200px"
        w="full"
        align="center"
        gap={{ base: 8, md: 12 }}
      >
        <MotionBox
          flex={{ base: "none", md: 1 }}
          textAlign={{ base: "center", md: "left" }}
          p={{ base: 6, md: 8 }}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Image
            src={logoSrc}
            width="600px"
            height="100%"
            alt="Hrumbles"
            mx={{ base: "auto", md: 0 }}
            mb={6}
            maxW={{ base: "150px", sm:"250px", md: "200px", lg:"350px" }}
          />
          {/* <Heading
            as="h1"
            size={{ base: "lg", md: "xl" }}
            color={textColor}
            mb={4}
          >
            Welcome to Hrumbles.ai
          </Heading> */}
          <Text
            fontSize={{ base: "md", md: "sm", lg:"xs",  xl:"lg" }}
            color={textColor}
            maxW="500px"
            mx={{ base: "auto", md: 0 }}
            lineHeight="tall"
            ml={{ base: 0, md: 2 }}
          >
            Reduce hiring risks and speed up decisions with Hrumbles.ai. Our platform brings instant pre-employment verification and smart candidate management together—so you can focus on making the right hires
          </Text>
        </MotionBox>

        <MotionBox
          w={{ base: "full", sm: "400px", md: "450px", lg:"550px", }}
          mx="auto"
          p={8}
          bg={cardBg}
          borderRadius="xl"
          boxShadow="2xl"
          border="1px solid"
          borderColor={useColorModeValue("gray.100", "gray.700")}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Flex justify="space-between" align="center" mb={6}>
            <Heading size="lg" color={textColor}>
              Sign In
            </Heading>
            {/* <IconButton
              icon={colorMode === "dark" ? <FiSun /> : <FiMoon />}
              onClick={toggleColorMode}
              aria-label="Toggle Theme"
              variant="ghost"
              color={textColor}
              size="lg"
              _hover={{ bg: useColorModeValue("gray.100", "gray.700") }}
            /> */}
          </Flex>
          <VStack spacing={5}>
          <Input
                name="email"
                placeholder="Enter your email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                size={{ base: "md", sm: "lg" }}
                borderRadius="md"
                focusBorderColor="purple.500"
                bg={useColorModeValue("gray.50", "gray.700")}
                _placeholder={{ color: useColorModeValue("gray.400", "gray.500") }}
              />
            <Input
              placeholder="Enter your password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              size="lg"
              borderRadius="md"
              focusBorderColor="purple.500"
              bg={useColorModeValue("gray.50", "gray.700")}
              _placeholder={{ color: useColorModeValue("gray.400", "gray.500") }}
            />
            {error && (
              <Text color="red.500" fontSize="sm" textAlign="center">
                {error}
              </Text>
            )}
            <Button
       
              backgroundColor="#8C52FF"
              color="white"
              width="full"
              size="lg"
              borderRadius="md"
              _hover={buttonHover}
              _active={{ transform: "scale(0.98)" }}
              isLoading={isLoading}
              onClick={handleLogin}
            >
              Sign In
            </Button>
          </VStack>
          <Text
            fontSize="sm"
            color={textColor}
            mt={6}
            textAlign="center"
          >
            Don’t have an account?{" "}
            <Box
              as="span"
              color="purple.500"
              cursor="pointer"
              _hover={{ color: "purple.700", textDecoration: "underline" }}
              transition="all 0.2s"
            >
              Sign Up
            </Box>
          </Text>
        </MotionBox>
      </Flex>
    </Flex>
  );
};

export default LoginPage;