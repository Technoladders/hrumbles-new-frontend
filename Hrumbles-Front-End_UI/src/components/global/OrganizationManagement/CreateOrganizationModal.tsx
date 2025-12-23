// src/components/global/OrganizationManagement/CreateOrganizationModal.tsx

import { useState, useEffect, FC, ChangeEvent } from "react";

import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, VStack, Button, useToast, NumberInput,
  NumberInputField, Divider, Heading, Flex, Select, Checkbox, Text, Box, Badge
} from "@chakra-ui/react";
import { createOrganizationWithSuperadmin, getAvailableRoles } from "../../../utils/api";
import { supabase } from "../../../integrations/supabase/client";
import PhoneInput, { E164Number } from "react-phone-number-input";
import "react-phone-number-input/style.css"; // Don't forget the CSS

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Role {
  id: string;
  name: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  limits: {
    organization_superadmin: number;
    admin: number;
    employee: number;
  };
}

const CreateOrganizationModal: FC<CreateOrganizationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [adminDetails, setAdminDetails] = useState({
    firstName: "", lastName: "", email: "", password: ""
  });
  const [phone, setPhone] = useState<E164Number | undefined>();
  const [organizationName, setOrganizationName] = useState<string>("");
  const [subdomain, setSubdomain] = useState<string>("");
  const [role, setRole] = useState<string>(""); // State for selected role
    const [employeeId, setEmployeeId] = useState<string>(""); 
  const [isRecruitmentFirm, setIsRecruitmentFirm] = useState<boolean>(false);
  const [isVerificationFirm, setIsVerificationFirm] = useState<boolean>(false); 
  const [roles, setRoles] = useState<Role[]>([]);

      // --- NEW: Plan State ---
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const [roleLimits, setRoleLimits] = useState({
    organization_superadmin: 1,
    admin: 0,
    employee: 0
  });



  const [isLoading, setIsLoading] = useState<boolean>(false);
  const toast = useToast();

  // 1. Fetch Plans and Roles on Mount
  useEffect(() => {
    const initData = async () => {
      try {
        const availableRoles = await getAvailableRoles();
        setRoles(availableRoles);

        // Fetch Plans
        const { data: plansData, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true });
        
        if(error) throw error;
        setPlans(plansData || []);
        
        // Default to first plan
        if(plansData && plansData.length > 0) {
            handlePlanChange(plansData[0].id, plansData);
        }

      } catch (error: any) {
        toast({ title: "Error Fetching Data", description: error.message, status: "error", duration: 5000, isClosable: true });
      }
    };
    if(isOpen) initData();
  }, [isOpen]);


  const handleAdminChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAdminDetails({ ...adminDetails, [e.target.name]: e.target.value });
  };

   // 2. Handle Plan Selection
  const handlePlanChange = (planId: string, currentPlansList = plans) => {
    setSelectedPlanId(planId);
    const plan = currentPlansList.find(p => p.id === planId);
    if (plan) {
        // Auto-fill limits based on the selected plan
        setRoleLimits({
            organization_superadmin: plan.limits.organization_superadmin || 1,
            admin: plan.limits.admin || 0,
            employee: plan.limits.employee || 0
        });
    }
  };
  
  const handleLimitChange = (role: string, value: string) => {
    // Optional: Allow manual override, but warn?
    setRoleLimits({ ...roleLimits, [role]: parseInt(value, 10) || 0 });
  };

  const handleCreate = async () => {
    // Validate required fields
    if (!organizationName || !subdomain || !adminDetails.email || !adminDetails.password || !adminDetails.firstName || !adminDetails.lastName || !role || !employeeId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields, including the role.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await createOrganizationWithSuperadmin(
        adminDetails.email,
        adminDetails.password,
        adminDetails.firstName,
        adminDetails.lastName,
        organizationName,
        role, // Pass selected role
        phone,
        subdomain,
        roleLimits,
        employeeId, // Pass employeeId
        isRecruitmentFirm, // Pass isRecruitmentFirm
        isVerificationFirm // Pass isVerificationFirm
      );
      toast({ title: "Organization Created", status: "success", duration: 5000, isClosable: true });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: "Creation Failed", description: error.message, status: "error", duration: 5000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Organization</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Heading size="sm" color="gray.600">Organization Details</Heading>
            <Flex gap={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Organization Name</FormLabel>
                <Input placeholder="Xrilic" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Subdomain</FormLabel>
                <Input placeholder="xrilic" value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
              </FormControl>
            </Flex>
            
              {/* --- NEW: Plan Selection --- */}
            <FormControl isRequired>
                <FormLabel fontSize="sm">Subscription Plan</FormLabel>
                <Select value={selectedPlanId} onChange={(e) => handlePlanChange(e.target.value)}>
                    {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </Select>
            </FormControl>

             {/* Limits Visualization (Read Only or Editable based on your preference) */}
            <Box bg="blue.50" p={3} borderRadius="md" borderWidth="1px" borderColor="blue.200">
                <Text fontSize="xs" fontWeight="bold" color="blue.700" mb={2}>Plan Limits (Auto-applied)</Text>
                <Flex gap={4} align="stretch">
                    <FormControl>
                    <FormLabel fontSize="xs">Super Admins</FormLabel>
                    <NumberInput value={roleLimits.organization_superadmin} isReadOnly>
                        <NumberInputField bg="white" />
                    </NumberInput>
                    </FormControl>
                    <FormControl>
                    <FormLabel fontSize="xs">Admins</FormLabel>
                    <NumberInput value={roleLimits.admin} isReadOnly>
                        <NumberInputField bg="white" />
                    </NumberInput>
                    </FormControl>
                    <FormControl>
                    <FormLabel fontSize="xs">Users</FormLabel>
                    <NumberInput value={roleLimits.employee} isReadOnly>
                        <NumberInputField bg="white" />
                    </NumberInput>
                    </FormControl>
                </Flex>
            </Box>

             {/* 3. Add the Checkboxes */}
             <Flex gap={4} direction="column">
                <FormControl>
                    <Checkbox 
                        isChecked={isRecruitmentFirm}
                        onChange={(e) => {
                            setIsRecruitmentFirm(e.target.checked);
                            // Optional: Prevent both being checked if they are mutually exclusive
                            if(e.target.checked) setIsVerificationFirm(false); 
                        }}
                    >
                        Is this a Recruitment Firm?
                    </Checkbox>
                </FormControl>

                <FormControl>
                    <Checkbox 
                        isChecked={isVerificationFirm}
                        onChange={(e) => {
                            setIsVerificationFirm(e.target.checked);
                            // Optional: Prevent both being checked
                            if(e.target.checked) setIsRecruitmentFirm(false);
                        }}
                    >
                        Is this a Verification Firm?
                    </Checkbox>
                </FormControl>
             </Flex>

            <Divider my={2} />
            <Heading size="sm" color="gray.600">Superadmin User Details</Heading>
            <Flex gap={4}>
              <FormControl isRequired><FormLabel fontSize="sm">First Name</FormLabel><Input name="firstName" value={adminDetails.firstName} onChange={handleAdminChange} /></FormControl>
              <FormControl isRequired><FormLabel fontSize="sm">Last Name</FormLabel><Input name="lastName" value={adminDetails.lastName} onChange={handleAdminChange} /></FormControl>
            </Flex>
            <FormControl isRequired>
                <FormLabel fontSize="sm">Employee ID</FormLabel>
                <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="e.g., EMP001" />
              </FormControl>
             <FormControl isRequired><FormLabel fontSize="sm">Email</FormLabel><Input name="email" type="email" value={adminDetails.email} onChange={handleAdminChange} /></FormControl>
             
            <Flex gap={4}>
              <FormControl isRequired><FormLabel fontSize="sm">Password</FormLabel><Input name="password" type="password" value={adminDetails.password} onChange={handleAdminChange} /></FormControl>
              <FormControl><FormLabel fontSize="sm">Phone Number</FormLabel>
                <PhoneInput 
                    international 
                    defaultCountry="IN" 
                    value={phone} 
                    onChange={setPhone}
                    className="phone-input-chakra"
                />
              </FormControl>
            </Flex>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Role</FormLabel>
              <Select placeholder="Select Role" value={role} onChange={(e) => setRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleCreate} isLoading={isLoading}>Create</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreateOrganizationModal;