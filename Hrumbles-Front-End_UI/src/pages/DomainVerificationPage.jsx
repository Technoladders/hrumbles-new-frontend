import { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Button, VStack, useColorModeValue,
  FormControl, FormLabel, InputGroup, InputLeftAddon, Input,
  InputRightElement, InputRightAddon, FormErrorMessage, Spinner, Icon, Center,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

import useDebounce from '../hooks/useDebounce'; // Import the hook
import { supabase } from "@/integrations/supabase/client";

const MotionBox = motion(Box);

const DomainVerificationPage = () => {
  const [subdomain, setSubdomain] = useState('');
  const [validationStatus, setValidationStatus] = useState('idle'); // 'idle', 'validating', 'valid', 'invalid'
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Use the debounce hook to get the value after 500ms of no typing
  const debouncedSubdomain = useDebounce(subdomain, 500);

  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.600", "gray.300");
  const brandColor = useColorModeValue("base.primary1", "base.primary2"); // Using your theme colors

  // This useEffect triggers the validation against the debounced value
  useEffect(() => {
    const checkSubdomain = async () => {
      if (debouncedSubdomain.length === 0) {
        setValidationStatus('idle');
        return;
      }
      setValidationStatus('validating');
      try {
        const { data, error } = await supabase
          .from('hr_organizations')
          .select('subdomain')
          .eq('subdomain', debouncedSubdomain.toLowerCase().trim())
          .single();

        if (error || !data) {
          setValidationStatus('invalid');
        } else {
          setValidationStatus('valid');
        }
      } catch (e) {
        setValidationStatus('invalid');
      }
    };

    checkSubdomain();
  }, [debouncedSubdomain]);

  const handleContinue = (e) => {
    e.preventDefault();
    if (validationStatus !== 'valid') return;
    setIsRedirecting(true);

    const rootDomain = import.meta.env.VITE_APP_ROOT_DOMAIN || 'hrumbles.ai';
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol;
    const host = window.location.hostname.includes('localhost') ? 'localhost' : rootDomain;
    
    // Redirect to the subdomain's login page
    window.location.href = `${protocol}//${debouncedSubdomain}.${host}${port}/login`;
  };
  
  const getValidationIcon = () => {
    switch (validationStatus) {
      case 'validating':
        return <Spinner size="sm" color="blue.500" />;
      case 'valid':
        return <Icon as={CheckCircleIcon} color="green.500" />;
      case 'invalid':
        return <Icon as={WarningTwoIcon} color="red.500" />;
      default:
        return null;
    }
  };

  return (
    <Flex direction="column" minH="100vh" bg={bg} align="center" justify="center" p={4}>
      <Center mb={8}>
        {/* Replace with your actual logo component if you have one */}
        <Heading color={useColorModeValue("gray.700", "white")}>hrumbles.ai</Heading>
      </Center>

      <MotionBox
        w={{ base: "100%", sm: "700px" }}
        p={8}
        bg={cardBg}
        borderRadius="lg"
        boxShadow="lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <form onSubmit={handleContinue}>
          <VStack spacing={6}>
            <Heading size="lg" fontWeight="semibold">Sign In</Heading>
            <FormControl isInvalid={validationStatus === 'invalid'} w="full">
              <FormLabel htmlFor="domain" fontWeight="medium">
                Your Domain <Text as="span" color="red.500">*</Text>
              </FormLabel>
<InputGroup size="lg">
  <InputLeftAddon
    children="https://"
    height="3rem" // Explicitly set height to match Input
    display="flex"
    alignItems="center"
    justifyContent="center"
  />
  <Flex position="relative" flex="1">
    <Input
      id="domain"
      placeholder="Enter subdomain"
      value={subdomain}
      onChange={(e) => setSubdomain(e.target.value)}
      autoComplete="off"
      autoCapitalize="none"
      pr="7rem" // Space for icon and addon
      height="3rem" // Explicitly set height
      borderRightRadius={0}
      display="flex"
      alignItems="center"
    />
    <InputRightElement width="20rem" children={getValidationIcon()} height="3rem" />
    <InputRightAddon
      children={`.${import.meta.env.VITE_APP_ROOT_DOMAIN || 'hrumbles.ai'}`}
      flexShrink={0}
      borderLeft="none"
      height="3rem" // Explicitly set height
      display="flex"
      alignItems="center"
      justifyContent="center"
    />
  </Flex>
</InputGroup>
              <FormErrorMessage mt={2}>
                This domain does not exist, please sign up.
              </FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              bg={brandColor}
              color="white"
              w="full"
              size="lg"
              _hover={{ opacity: 0.9 }}
              isDisabled={validationStatus !== 'valid'}
              isLoading={isRedirecting}
              loadingText="Redirecting..."
            >
              Continue
            </Button>

            <Text fontSize="sm" color={textColor}>
              Are you new?{' '}
              <Box as={RouterLink} to="/signup" color={brandColor} fontWeight="medium">
                Sign up for free trial
              </Box>
            </Text>
          </VStack>
        </form>
      </MotionBox>
    </Flex>
  );
};

export default DomainVerificationPage;