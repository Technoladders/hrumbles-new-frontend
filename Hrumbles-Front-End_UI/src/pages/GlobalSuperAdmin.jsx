import { useState } from "react";
import { registerNewUser } from "../utils/api";
import { Box, Flex, Heading, Input, VStack, Button, useColorModeValue } from "@chakra-ui/react";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");

  const bg = useColorModeValue("gray.100", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  const handleSignup = async () => {
    const [firstName, lastName] = name.split(" ");
    try {
      const response = await registerNewUser(email, password, firstName || "", lastName || "", orgName, phoneNo);
      alert(response);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <Flex height="100vh" bg={bg} align="center" justify="center">
      <Box p={8} bg={cardBg} borderRadius="lg" boxShadow="lg" width="400px">
        <VStack spacing={4}>
          <Heading size="md">Sign Up</Heading>
          <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input placeholder="Organization Name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          <Input placeholder="Phone Number" value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} />
          <Button colorScheme="blue" onClick={handleSignup}>Sign Up</Button>
        </VStack>
      </Box>
    </Flex>
  );
};

export default Signup;
