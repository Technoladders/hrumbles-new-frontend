import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Heading,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  useToast,
} from '@chakra-ui/react';
import { Plus, Phone, Mail, Calendar, DollarSign } from 'lucide-react';
import { useCreateDeal } from '@/hooks/sales/useSalesDashboard';
import { useSelector } from 'react-redux';
import type { DealStage } from '@/types/sales-dashboard.types';

const DEAL_STAGES: DealStage[] = [
  'Prospecting',
  'Qualification',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

const QuickActions: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const createDealMutation = useCreateDeal();
  const currentUser = useSelector((state: any) => state.auth.user);
  
  const [dealForm, setDealForm] = useState({
    name: '',
    description: '',
    deal_value: 0,
    stage: 'Prospecting' as DealStage,
    expected_close_date: '',
  });

  const handleCreateDeal = async () => {
    if (!dealForm.name) {
      toast({
        title: 'Validation Error',
        description: 'Deal name is required',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      await createDealMutation.mutateAsync({
        ...dealForm,
        deal_owner: currentUser?.id,
        status: 'Open',
      });

      toast({
        title: 'Deal Created',
        description: 'Your deal has been created successfully',
        status: 'success',
        duration: 3000,
      });

      // Reset form
      setDealForm({
        name: '',
        description: '',
        deal_value: 0,
        stage: 'Prospecting',
        expected_close_date: '',
      });

      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create deal',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <>
      <Box
        bg="white"
        p={4}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        shadow="sm"
      >
        <Heading size="sm" mb={4} color="gray.800">
          Quick Actions
        </Heading>
        <VStack spacing={2} align="stretch">
          <Button
            leftIcon={<Plus size={16} />}
            colorScheme="purple"
            size="sm"
            onClick={onOpen}
          >
            New Deal
          </Button>
          <Button
            leftIcon={<Phone size={16} />}
            variant="outline"
            size="sm"
            onClick={() => {
              toast({
                title: 'Feature Coming Soon',
                description: 'Log call feature will be available soon',
                status: 'info',
                duration: 2000,
              });
            }}
          >
            Log Call
          </Button>
          <Button
            leftIcon={<Mail size={16} />}
            variant="outline"
            size="sm"
            onClick={() => {
              toast({
                title: 'Feature Coming Soon',
                description: 'Send email feature will be available soon',
                status: 'info',
                duration: 2000,
              });
            }}
          >
            Send Email
          </Button>
          <Button
            leftIcon={<Calendar size={16} />}
            variant="outline"
            size="sm"
            onClick={() => {
              toast({
                title: 'Feature Coming Soon',
                description: 'Schedule meeting feature will be available soon',
                status: 'info',
                duration: 2000,
              });
            }}
          >
            Schedule Meeting
          </Button>
        </VStack>
      </Box>

      {/* Create Deal Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Deal</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Deal Name</FormLabel>
                <Input
                  placeholder="Enter deal name"
                  value={dealForm.name}
                  onChange={e => setDealForm({ ...dealForm, name: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Enter deal description"
                  value={dealForm.description}
                  onChange={e => setDealForm({ ...dealForm, description: e.target.value })}
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Deal Value ($)</FormLabel>
                <NumberInput
                  value={dealForm.deal_value}
                  onChange={(_, valueAsNumber) =>
                    setDealForm({ ...dealForm, deal_value: valueAsNumber || 0 })
                  }
                  min={0}
                >
                  <NumberInputField placeholder="0" />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Stage</FormLabel>
                <Select
                  value={dealForm.stage}
                  onChange={e => setDealForm({ ...dealForm, stage: e.target.value as DealStage })}
                >
                  {DEAL_STAGES.map(stage => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Expected Close Date</FormLabel>
                <Input
                  type="date"
                  value={dealForm.expected_close_date}
                  onChange={e => setDealForm({ ...dealForm, expected_close_date: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleCreateDeal}
              isLoading={createDealMutation.isPending}
            >
              Create Deal
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default QuickActions;
