import { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Heading,
  Input,
  VStack,
  Button,
  Select,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { createOrganizationWithSuperadmin, getAvailableRoles } from "../utils/api";
import { useNavigate } from "react-router-dom";

const GlobalSuperadminDashboard = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [role, setRole] = useState("");
  const [roles, setRoles] = useState([]);
  const toast = useToast();
  const navigate = useNavigate();

  const bg = useColorModeValue("white", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  useEffect(() => {
    const fetchRoles = async () => {
      const availableRoles = await getAvailableRoles();
      setRoles(availableRoles);
    };
    fetchRoles();
  }, []);

  const handleCreateOrganization = async () => {
    try {
      await createOrganizationWithSuperadmin(
        email,
        password,
        firstName,
        lastName,
        organizationName,
        role
      );
      toast({
        title: "Organization Created",
        description: "Organization and Superadmin successfully created!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      navigate("/organization"); 
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Flex height="100vh" bg={bg} align="center" justify="center">
      <Box p={8} bg={cardBg} borderRadius="lg" boxShadow="lg" width="500px">
        <form autoComplete="off"> {/* ✅ Prevents autofill */}
          <VStack spacing={4}>
            <Heading size="md">Create Organization & Superadmin</Heading>
            <Input 
              placeholder="First Name" 
              value={firstName} 
              onChange={(e) => setFirstName(e.target.value)} 
              autoComplete="off" // ✅ Prevents autofill
            />
            <Input 
              placeholder="Last Name" 
              value={lastName} 
              onChange={(e) => setLastName(e.target.value)} 
              autoComplete="off"
            />
            <Input 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              autoComplete="off" // ✅ Prevents autofill
              name="new-email" // ✅ Unique name prevents autofill
            />
            <Input 
              placeholder="Password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              autoComplete="new-password" // ✅ Forces new password input
              name="new-password" // ✅ Unique name prevents autofill
            />
            <Input placeholder="Phone Number" value={phoneNo}  onChange={(e) => setPhoneNo(e.target.value)}  autoComplete="new-phone"
              name="new-phone" />
            <Input 
              placeholder="Organization Name" 
              value={organizationName} 
              onChange={(e) => setOrganizationName(e.target.value)} 
              autoComplete="off"
            />
            <Select placeholder="Select Role" value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </Select>
            <Button colorScheme="blue" width="full" onClick={handleCreateOrganization}>
              Create Organization
            </Button>
          </VStack>
        </form>
      </Box>
    </Flex>
  );
};

export default GlobalSuperadminDashboard;
