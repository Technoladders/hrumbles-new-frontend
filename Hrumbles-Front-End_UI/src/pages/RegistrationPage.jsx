import { useState, useEffect } from "react";
import { Box, Flex, Heading, Text, Button, Input, VStack, Select, useColorModeValue } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import supabase from "../config/supabaseClient";

const RegisterPage = () => {
  const navigate = useNavigate();
  const bg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.700", "white");
  const buttonBg = useColorModeValue("blue.500", "blue.600");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState(""); 
  const [isGlobalSuperadmin, setIsGlobalSuperadmin] = useState(false);
  const [error, setError] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState("");

  useEffect(() => {
    checkIfFirstUser();
  }, []);

  const checkIfFirstUser = async () => {
    const { data, error } = await supabase.from("users").select("id");
    if (error) {
      console.error("Error checking users:", error);
    } else {
      setIsGlobalSuperadmin(data.length === 0);
    }
  };

  const handleRegister = async () => {
    setError(null);
    try {
      // Create user with Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.signUp({ email, password });

      if (authError) throw authError;

      const userId = authUser.user.id;

      if (isGlobalSuperadmin) {
        // Create Default Organization for First User
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .insert([{ name: "Hrumbles" }])
          .select("id")
          .single();

        if (orgError) throw orgError;

        // Insert User as Global Superadmin
        await supabase.from("users").insert([
          {
            id: userId,
            email,
            name,
            organization_id: orgData.id,
            role_id: await getRoleId("global_superadmin"),
            created_at: new Date(),
          },
        ]);
      } else {
        // Ensure the user is a Global Superadmin before creating another Superadmin
        if (!selectedOrganization) {
          setError("Please select an organization.");
          return;
        }

        // Insert User as Organization Superadmin
        await supabase.from("users").insert([
          {
            id: userId,
            email,
            name,
            organization_id: selectedOrganization,
            role_id: await getRoleId("organization_superadmin"),
            created_at: new Date(),
          },
        ]);
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Registration Error:", err);
      setError("Registration failed. Please try again.");
    }
  };

  const getRoleId = async (roleName) => {
    const { data, error } = await supabase.from("roles").select("id").eq("name", roleName).single();
    if (error) {
      console.error("Error fetching role ID:", error);
      return null;
    }
    return data.id;
  };

  return (
    <Flex height="100vh" bg={bg} align="center" justify="center">
      <Box p={8} bg={cardBg} borderRadius="lg" boxShadow="lg" width="400px">
        <Heading size="lg" textAlign="center" color={textColor} mb={4}>
          {isGlobalSuperadmin ? "Setup Global Superadmin" : "Create Organization Superadmin"}
        </Heading>
        <VStack spacing={4}>
          <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          {isGlobalSuperadmin ? (
            <Input value="Hrumbles" isDisabled />
          ) : (
            <Select placeholder="Select Organization" value={selectedOrganization} onChange={(e) => setSelectedOrganization(e.target.value)}>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </Select>
          )}

          {error && <Text color="red.500">{error}</Text>}
          <Button bg={buttonBg} color="white" width="full" onClick={handleRegister}>
            Register
          </Button>
        </VStack>
      </Box>
    </Flex>
  );
};

export default RegisterPage;
