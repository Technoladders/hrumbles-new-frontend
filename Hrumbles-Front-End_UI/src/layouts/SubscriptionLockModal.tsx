// src/layouts/SubscriptionLockModal.tsx
// Old Chakra UI design preserved exactly.
// Added: `reason` prop → changes icon, title, message per state (expired/suspended/inactive)

import React from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, Button, Text, VStack,
  Icon, useColorModeValue, Box,
} from '@chakra-ui/react';
import { FiAlertTriangle, FiLock, FiPauseCircle, FiXCircle, FiMail } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { logout } from '../Redux/authSlice';
import { supabase } from '@/integrations/supabase/client';

type LockReason = 'expired' | 'suspended' | 'inactive' | null;

interface SubscriptionLockModalProps {
  isOpen: boolean;
  reason?: LockReason;  // NEW — defaults to 'expired' to match old behaviour
}

// ── Per-reason content — old design, new messages ────────────────────────────
const CONTENT: Record<NonNullable<LockReason>, {
  icon: any;
  iconColor: string;
  iconBg: string;
  title: string;
  titleColor: string;
  message: string;
  alertBg: string;
  alertBorder: string;
  alertText: string;
  alertSubText: string;
  buttonScheme: string;
  showContact: boolean;
}> = {
  expired: {
    icon: FiLock,
    iconColor: 'red.500',
    iconBg: 'red.50',
    title: 'Subscription Expired',
    titleColor: 'red.600',
    message: "Your organization's subscription plan has expired. Access to the dashboard is restricted until the plan is renewed.",
    alertBg: 'orange.50',
    alertBorder: 'orange.400',
    alertText: 'Action Required',
    alertSubText: 'Please contact the Administrator to restore access.',
    buttonScheme: 'red',
    showContact: false,
  },
  suspended: {
    icon: FiPauseCircle,
    iconColor: 'orange.500',
    iconBg: 'orange.50',
    title: 'Account Suspended',
    titleColor: 'orange.600',
    message: "Your organization's account has been temporarily suspended by the platform administrator.",
    alertBg: 'orange.50',
    alertBorder: 'orange.400',
    alertText: 'Action Required',
    alertSubText: 'Please contact support to resolve this.',
    buttonScheme: 'orange',
    showContact: true,
  },
  inactive: {
    icon: FiXCircle,
    iconColor: 'gray.500',
    iconBg: 'gray.100',
    title: 'Account Inactive',
    titleColor: 'gray.700',
    message: "Your organization's account is currently inactive. Access to the dashboard has been restricted.",
    alertBg: 'gray.50',
    alertBorder: 'gray.400',
    alertText: 'Action Required',
    alertSubText: 'Please contact your administrator or platform support to reactivate.',
    buttonScheme: 'gray',
    showContact: true,
  },
};

const SubscriptionLockModal: React.FC<SubscriptionLockModalProps> = ({
  isOpen,
  reason = 'expired',
}) => {
  const dispatch = useDispatch();
  const bg = useColorModeValue('white', 'gray.800');
  const cfg = CONTENT[reason || 'expired'];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      dispatch(logout());
      localStorage.clear();
      window.location.href = '/login';
    } catch {
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
      blockScrollOnMount={true}
    >
      {/* Old backdrop — blur + grayscale, same as original */}
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
        {/* Header — icon + title change per reason */}
        <ModalHeader textAlign="center" pt={8}>
          <VStack spacing={3}>
            <Box p={3} bg={cfg.iconBg} borderRadius="full">
              <Icon as={cfg.icon} w={8} h={8} color={cfg.iconColor} />
            </Box>
            <Text fontSize="2xl" fontWeight="bold" color={cfg.titleColor}>
              {cfg.title}
            </Text>
          </VStack>
        </ModalHeader>

        {/* Body — message + alert box change per reason */}
        <ModalBody textAlign="center" pb={6}>
          <VStack spacing={4}>
            <Text fontSize="md" color="gray.600">
              {cfg.message}
            </Text>

            <Box
              p={4}
              bg={cfg.alertBg}
              borderRadius="md"
              borderLeft="4px solid"
              borderColor={cfg.alertBorder}
              width="100%"
            >
              <Text
                fontSize="sm"
                color="orange.800"
                fontWeight="bold"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FiAlertTriangle} mr={2} />
                {cfg.alertText}
              </Text>
              <Text fontSize="sm" color="orange.700" mt={1}>
                {cfg.alertSubText}
              </Text>
            </Box>
          </VStack>
        </ModalBody>

        {/* Footer — logout always shown; contact support added for suspended/inactive */}
        <ModalFooter justifyContent="center" gap={3} pb={8}>
          <Button
            colorScheme={cfg.buttonScheme}
            variant="outline"
            onClick={handleLogout}
            _hover={{ bg: `${cfg.buttonScheme}.50` }}
          >
            Log Out
          </Button>

          {/* {cfg.showContact && (
            <Button
              colorScheme={cfg.buttonScheme}
              leftIcon={<Icon as={FiMail} />}
              onClick={() =>
                window.open(
                  `mailto:support@xrilic.ai?subject=Account%20${reason || 'issue'}`,
                  '_blank'
                )
              }
            >
              Contact Support
            </Button>
          )} */}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SubscriptionLockModal;