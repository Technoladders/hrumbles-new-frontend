// src/components/global/OrganizationManagement/EditOrganizationModal.tsx

import { useState, useEffect, FC } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Select, VStack, Button, useToast, NumberInput, NumberInputField, 
  Input, Flex, Checkbox, SimpleGrid, Text, Box, Divider, Tabs, TabList, TabPanels, Tab, TabPanel 
} from "@chakra-ui/react";
import { ShieldCheck, Settings } from "lucide-react";
import { supabase } from "../../../integrations/supabase/client";
import GlobalPermissionConfigurator from "./GlobalPermissionConfigurator";

interface Organization {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  subdomain?: string | null;
  role_credit_limits: Record<string, number>;
  subscription_features?: Record<string, boolean>; // Added this
}

interface EditOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organization: Organization;
}

const EditOrganizationModal: FC<EditOrganizationModalProps> = ({ isOpen, onClose, organization, onSuccess }) => {
  const [roleLimits, setRoleLimits] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Organization['status']>('active');
  const [subdomain, setSubdomain] = useState<string>('');
  const [features, setFeatures] = useState<Record<string, boolean>>({
    hiring_suite: true,
    project_suite: true,
    verification_suite: true,
    sales_suite: true,
    finance_suite: true,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const toast = useToast();

  const featureKeys = ['hiring_suite', 'project_suite', 'verification_suite', 'sales_suite', 'finance_suite'] as const;
  const featureLabels: Record<typeof featureKeys[number], string> = {
    hiring_suite: 'Hiring Suite',
    project_suite: 'Project Suite',
    verification_suite: 'Verification Suite',
    sales_suite: 'Sales Suite',
    finance_suite: 'Finance Suite',
  };

  useEffect(() => {
    if (organization) {
      setRoleLimits(organization.role_credit_limits || { organization_superadmin: 1, admin: 0, employee: 0 });
      setStatus(organization.status);
      setSubdomain(organization.subdomain || '');
      // Merge existing features with defaults to handle new organizations
      setFeatures({
        hiring_suite: true,
        project_suite: true,
        verification_suite: true,
        sales_suite: true,
        finance_suite: true,
        ...(organization.subscription_features || {})
      });
    }
  }, [organization]);
  
  const handleLimitChange = (role: string, value: string) => {
    setRoleLimits({ ...roleLimits, [role]: parseInt(value, 10) || 0 });
  };

  const handleFeatureToggle = (key: string, isChecked: boolean) => {
    setFeatures(prev => ({ ...prev, [key]: isChecked }));
  };

  const handleSelectAll = (isChecked: boolean) => {
    setFeatures(prev => ({
      ...prev,
      ...featureKeys.reduce((acc, key) => ({ ...acc, [key]: isChecked }), {})
    }));
  };

  const isAllSelected = featureKeys.every(key => features[key]);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("hr_organizations")
        .update({
          role_credit_limits: roleLimits,
          status: status,
          subdomain: subdomain,
          subscription_features: features, // Saving the suite toggles
        })
        .eq("id", organization.id);

      if (error) throw error;

      toast({ title: "Organization Updated", status: "success", duration: 3000, isClosable: true });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, status: "error", duration: 5000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

return (
  <Modal isOpen={isOpen} onClose={onClose} isCentered size="4xl"> {/* Increased size for the grid */}
    <ModalOverlay />
    <ModalContent height="100vh"> {/* Fixed height for scrollable permission list */}
      <ModalHeader borderBottomWidth="1px" py={4}>
        Edit Organization: {organization.name}
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody p={0}> {/* Remove padding to let tabs handle it */}
        <Tabs isFitted variant="enclosed" colorScheme="purple">
          <TabList mb="1em">
            <Tab fontWeight="bold" py={4}>
              <Settings size={16} style={{marginRight: '8px'}} />
              General Settings
            </Tab>
            <Tab fontWeight="bold" py={4}>
              <ShieldCheck size={16} style={{marginRight: '8px'}} />
              Menu Access Control
            </Tab>
          </TabList>
          <TabPanels>
            {/* TAB 1: EXISTING SETTINGS */}
            <TabPanel px={6}>
              <VStack spacing={6} align="stretch">
                <Flex gap={4}>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="bold">Subdomain</FormLabel>
                    <Input bg="gray.50" placeholder="acme" value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="bold">Status</FormLabel>
                    <Select bg="gray.50" value={status} onChange={(e) => setStatus(e.target.value as Organization['status'])}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </Select>
                  </FormControl>
                </Flex>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="bold">License Limits</FormLabel>
                  <Flex gap={4} p={4} borderWidth={1} borderRadius="md" bg="gray.50">
                    <FormControl>
                      <FormLabel fontSize="xs">Super Admins</FormLabel>
                      <NumberInput size="sm" value={roleLimits.organization_superadmin} onChange={(val) => handleLimitChange('organization_superadmin', val)} min={1}>
                        <NumberInputField bg="white" />
                      </NumberInput>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs">Admins</FormLabel>
                      <NumberInput size="sm" value={roleLimits.admin} onChange={(val) => handleLimitChange('admin', val)} min={0}>
                        <NumberInputField bg="white" />
                      </NumberInput>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs">Users</FormLabel>
                      <NumberInput size="sm" value={roleLimits.employee} onChange={(val) => handleLimitChange('employee', val)} min={0}>
                        <NumberInputField bg="white" />
                      </NumberInput>
                    </FormControl>
                  </Flex>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="bold">Subscription Features</FormLabel>
                  <Box p={4} borderWidth={1} borderRadius="md" bg="gray.50">
                    <Checkbox 
                      mb={4} 
                      isChecked={isAllSelected} 
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      colorScheme="purple"
                    >
                      Select All Suites
                    </Checkbox>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                      {featureKeys.map((key) => (
                        <Checkbox
                          key={key}
                          isChecked={features[key]}
                          onChange={(e) => handleFeatureToggle(key, e.target.checked)}
                          colorScheme="purple"
                        >
                          {featureLabels[key]}
                        </Checkbox>
                      ))}
                    </SimpleGrid>
                  </Box>
                </FormControl>

                <Box textAlign="right">
                  <Button colorScheme="purple" onClick={handleUpdate} isLoading={isLoading}>
                    Update Organization
                  </Button>
                </Box>
              </VStack>
            </TabPanel>
            {/* TAB 2: THE NEW GLOBAL CONFIGURATOR */}
            <TabPanel px={6} overflowY="auto" maxHeight="70vh">
              <GlobalPermissionConfigurator organizationId={organization.id} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ModalBody>
      <ModalFooter borderTopWidth="1px">
        <Button variant="ghost" mr={3} onClick={onClose}>Close</Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);
};

export default EditOrganizationModal;