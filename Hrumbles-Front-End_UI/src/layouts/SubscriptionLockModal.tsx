import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  VStack,
  Icon,
  useColorModeValue,
  Box
} from '@chakra-ui/react';
import { FiAlertTriangle, FiLock } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../Redux/authSlice';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionLockModalProps {
  isOpen: boolean;
}

const SubscriptionLockModal: React.FC<SubscriptionLockModalProps> = ({ isOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const bg = useColorModeValue('white', 'gray.800');

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      dispatch(logout());
      localStorage.clear();
      // Force reload to clear any cached states
      window.location.href = '/login';
    } catch (error) {
      console.error("Logout failed", error);
      window.location.href = '/login';
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => {}} 
      isCentered 
      closeOnOverlayClick={false} 
      closeOnEsc={false}
      size="lg"
      // This ensures scrolling is disabled on the body behind the modal
      blockScrollOnMount={true}
    >
      {/* 
          FIX: Apply the backdrop filter here. 
          This blurs everything BEHIND the overlay, but keeps the ModalContent clear.
      */}
      <ModalOverlay 
        bg="blackAlpha.300" 
        backdropFilter="blur(10px) grayscale(0.8)" 
      />
      
      <ModalContent 
        bg={bg} 
        borderRadius="xl" 
        boxShadow="dark-lg" 
        border="1px solid"
        borderColor="gray.200"
      >
        <ModalHeader textAlign="center" pt={8}>
          <VStack spacing={3}>
            <Box p={3} bg="red.50" borderRadius="full">
              <Icon as={FiLock} w={8} h={8} color="red.500" />
            </Box>
            <Text fontSize="2xl" fontWeight="bold" color="red.600">
              Subscription Expired
            </Text>
          </VStack>
        </ModalHeader>
        
        <ModalBody textAlign="center" pb={6}>
          <VStack spacing={4}>
            <Text fontSize="md" color="gray.600">
              Your organization's subscription plan has expired. Access to the dashboard is restricted until the plan is renewed.
            </Text>
            
            <Box p={4} bg="orange.50" borderRadius="md" borderLeft="4px solid" borderColor="orange.400" width="100%">
              <Text fontSize="sm" color="orange.800" fontWeight="bold" display="flex" alignItems="center" justifyContent="center">
                <Icon as={FiAlertTriangle} mr={2} />
                Action Required
              </Text>
              <Text fontSize="sm" color="orange.700" mt={1}>
                Please contact the Administrator to restore access.
              </Text>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter justifyContent="center" pb={8}>
          <Button 
            colorScheme="red" 
            variant="outline" 
            onClick={handleLogout}
            _hover={{ bg: "red.50" }}
          >
            Log Out
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SubscriptionLockModal;