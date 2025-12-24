// src/components/global/OrganizationManagement/CreateOrganizationModal.tsx

import { useState, useEffect, FC, ChangeEvent, useCallback } from "react";

import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, VStack, Button, useToast, NumberInput,
  NumberInputField, Divider, Heading, Flex, Select, Checkbox, Text, Box, Badge,
  InputGroup, InputRightElement, Spinner, List, ListItem, Icon, IconButton,
  Collapse, useDisclosure
} from "@chakra-ui/react";
import { Search, Building2, CheckCircle, X, Edit2 } from "lucide-react";
import { createOrganizationWithSuperadmin, getAvailableRoles, searchCompanies, parseCompanyAddress, type CompanySearchResult } from "../../../utils/api";
import { supabase } from "../../../integrations/supabase/client";
import PhoneInput, { E164Number } from "react-phone-number-input";
import "react-phone-number-input/style.css";

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

interface OrganizationProfileData {
  cin: string; // 🆕 Added CIN
  company_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  authorized_cap: string;
  paidup_capital: string;
  company_status: string;
}

const CreateOrganizationModal: FC<CreateOrganizationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [adminDetails, setAdminDetails] = useState({
    firstName: "", lastName: "", email: "", password: ""
  });
  const [phone, setPhone] = useState<E164Number | undefined>();
  const [organizationName, setOrganizationName] = useState<string>("");
  const [subdomain, setSubdomain] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [isRecruitmentFirm, setIsRecruitmentFirm] = useState<boolean>(false);
  const [isVerificationFirm, setIsVerificationFirm] = useState<boolean>(false);
  const [roles, setRoles] = useState<Role[]>([]);

  // Company Search State
  const [companySearchTerm, setCompanySearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  // Profile Data State
const [profileData, setProfileData] = useState<OrganizationProfileData>({
  cin: "",
  company_name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip_code: "",
  country: "India",
  authorized_cap: "", // 🆕
  paidup_capital: "", // 🆕
  company_status: ""  // 🆕
});
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  // Plan State
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const [roleLimits, setRoleLimits] = useState({
    organization_superadmin: 1,
    admin: 0,
    employee: 0
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const toast = useToast();

  // Fetch Plans and Roles on Mount
  useEffect(() => {
    const initData = async () => {
      try {
        const availableRoles = await getAvailableRoles();
        setRoles(availableRoles);

        const { data: plansData, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true });
        
        if(error) throw error;
        setPlans(plansData || []);
        
        if(plansData && plansData.length > 0) {
            handlePlanChange(plansData[0].id, plansData);
        }

      } catch (error: any) {
        toast({ title: "Error Fetching Data", description: error.message, status: "error", duration: 5000, isClosable: true });
      }
    };
    if(isOpen) initData();
  }, [isOpen]);

  // Company Search with Debounce
// ✅ CHANGE 1: Update the search logic to ignore terms once a company is selected
  useEffect(() => {
    // If we've already selected a company, don't search again
    if (selectedCompany) {
      setIsSearching(false);
      setShowSearchResults(false);
      return;
    }

    const searchTimer = setTimeout(async () => {
      if (companySearchTerm.length >= 3) {
        setIsSearching(true);
        try {
          const results = await searchCompanies(companySearchTerm, 10);
          setSearchResults(results);
          setShowSearchResults(true);
        } catch (error: any) {
          console.error('Search error:', error);
          // Only show error if we aren't currently selecting a company
          if (!selectedCompany) {
            toast({ title: "Search Failed", description: error.message, status: "error", duration: 3000 });
          }
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [companySearchTerm, selectedCompany]); // Added selectedCompany to dependencies

const handleCompanySelect = (company: CompanySearchResult) => {
    setIsSearching(false); // ✅ CHANGE 2: Stop the loading spinner immediately
    setSelectedCompany(company);
    setCompanySearchTerm(company.company_name);
    setShowSearchResults(false);

    // Auto-populate organization name if empty
    if (!organizationName) {
      setOrganizationName(company.company_name);
    }

    // Parse and populate address
    const addressData = parseCompanyAddress(company.registered_address);
    setProfileData({
      cin: company.cin, 
      company_name: company.company_name,
      ...addressData,
      authorized_cap: company.authorized_cap || "0",
    paidup_capital: company.paidup_capital || "0",
    company_status: company.company_status || "Active"

    });
    

    setIsEditingProfile(false);

    toast({
      title: "Company Selected",
      description: `${company.company_name} - Details populated`,
      status: "success",
      duration: 3000,
      isClosable: true
    });
  };
  const handleClearCompanySelection = () => {
    setSelectedCompany(null);
    setCompanySearchTerm("");
    setProfileData({
      cin: "", // 🆕 Added CIN
      company_name: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      zip_code: "",
      country: "India"
    });
    setIsEditingProfile(false);
  };

  const handleAdminChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAdminDetails({ ...adminDetails, [e.target.name]: e.target.value });
  };

  const handlePlanChange = (planId: string, currentPlansList = plans) => {
    setSelectedPlanId(planId);
    const plan = currentPlansList.find(p => p.id === planId);
    if (plan) {
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

  const handleProfileDataChange = (field: keyof OrganizationProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    // Validate required fields
    if (!organizationName || !subdomain || !adminDetails.email || !adminDetails.password || 
        !adminDetails.firstName || !adminDetails.lastName || !role || !employeeId) {
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
      // Create organization with company_id (UUID) if selected
      const organizationData = await createOrganizationWithSuperadmin(
        adminDetails.email,
        adminDetails.password,
        adminDetails.firstName,
        adminDetails.lastName,
        organizationName,
        role,
        phone,
        subdomain,
        roleLimits,
        employeeId,
        isRecruitmentFirm,
        isVerificationFirm,
        selectedCompany?.id // CHANGED: Pass company UUID id instead of CIN
      );

      // If profile data exists, create/update organization profile
      if (profileData.company_name || profileData.address_line1) {
        await supabase
          .from('hr_organization_profile')
          .upsert({
            organization_id: organizationData.organization_id,
            ...profileData
          }, { onConflict: 'organization_id' });
      }

      toast({ 
        title: "Organization Created", 
        description: selectedCompany ? `Linked to ${selectedCompany.company_name}` : undefined,
        status: "success", 
        duration: 5000, 
        isClosable: true 
      });
      
      onSuccess();
      onClose();
      
      // Reset form
      resetForm();
    } catch (error: any) {
      toast({ title: "Creation Failed", description: error.message, status: "error", duration: 5000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setAdminDetails({ firstName: "", lastName: "", email: "", password: "" });
    setPhone(undefined);
    setOrganizationName("");
    setSubdomain("");
    setRole("");
    setEmployeeId("");
    setCompanySearchTerm("");
    setSelectedCompany(null);
 setProfileData({
    company_name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip_code: "",
    country: "India",
    authorized_cap: "", // 🆕
    paidup_capital: "", // 🆕
    company_status: ""  // 🆕
  });
    setIsEditingProfile(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>Create New Organization</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            
            {/* STEP 1: Company Search */}
            <Box bg="purple.50" p={4} borderRadius="md" borderWidth="1px" borderColor="purple.200">
              <Heading size="sm" color="purple.700" mb={3}>
                Step 1: Search Company (Optional)
              </Heading>
              <FormControl>
                <FormLabel fontSize="sm">Search by Company Name or CIN</FormLabel>
                <InputGroup>
                  <Input
                    placeholder="e.g., 'Acme Corp' or 'U12345DL2020PTC123456'"
                    value={companySearchTerm}
                    onChange={(e) => setCompanySearchTerm(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                    isDisabled={!!selectedCompany}
                    bg="white"
                  />
                  <InputRightElement>
                    {isSearching ? (
                      <Spinner size="sm" color="purple.500" />
                    ) : selectedCompany ? (
                      <IconButton
                        aria-label="Clear selection"
                        icon={<X size={16} />}
                        size="xs"
                        variant="ghost"
                        onClick={handleClearCompanySelection}
                      />
                    ) : (
                      <Icon as={Search} color="gray.400" />
                    )}
                  </InputRightElement>
                </InputGroup>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <Box
                    position="absolute"
                    zIndex={10}
                    bg="white"
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    mt={1}
                    maxH="300px"
                    overflowY="auto"
                    boxShadow="lg"
                    w="calc(100% - 2rem)"
                  >
                    <List spacing={0}>
                      {searchResults.map((company) => (
                        <ListItem
                          key={company.cin}
                          p={3}
                          cursor="pointer"
                          _hover={{ bg: "purple.50" }}
                          onClick={() => handleCompanySelect(company)}
                          borderBottomWidth="1px"
                          borderColor="gray.100"
                        >
                          <Flex justify="space-between" align="start">
                            <Box flex={1}>
                              <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                                {company.company_name}
                              </Text>
                              <Text fontSize="xs" color="gray.600" mt={1}>
                                CIN: {company.cin}
                              </Text>
                              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                                {company.registered_address}
                              </Text>
                            </Box>
                            <Badge colorScheme={company.company_status === 'Active' ? 'green' : 'gray'} ml={2}>
                              {company.company_status}
                            </Badge>
                          </Flex>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Selected Company Display */}
                {selectedCompany && (
                  <Box mt={3} p={3} bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.200">
                    <Flex align="start" gap={2}>
                      <Icon as={CheckCircle} color="green.600" mt={1} />
                      <Box flex={1}>
                        <Text fontSize="sm" fontWeight="bold" color="green.800">
                          {selectedCompany.company_name}
                        </Text>
                        <Text fontSize="xs" color="green.700">
                          CIN: {selectedCompany.cin} | {selectedCompany.state}
                        </Text>
                      </Box>
                    </Flex>
                  </Box>
                )}
              </FormControl>
            </Box>

            <Divider />

            {/* STEP 2: Organization Details */}
            <Heading size="sm" color="gray.600">Step 2: Organization Details</Heading>
            <Flex gap={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Organization Name</FormLabel>
                <Input 
                  placeholder="Acme Corp" 
                  value={organizationName} 
                  onChange={(e) => setOrganizationName(e.target.value)} 
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Subdomain</FormLabel>
                <Input 
                  placeholder="acmecorp" 
                  value={subdomain} 
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                />
              </FormControl>
            </Flex>
            
            {/* Plan Selection */}
            <FormControl isRequired>
                <FormLabel fontSize="sm">Subscription Plan</FormLabel>
                <Select value={selectedPlanId} onChange={(e) => handlePlanChange(e.target.value)}>
                    {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </Select>
            </FormControl>

            {/* Limits Visualization */}
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

            {/* Firm Type Checkboxes */}
            <Flex gap={4} direction="column">
                <FormControl>
                    <Checkbox 
                        isChecked={isRecruitmentFirm}
                        onChange={(e) => {
                            setIsRecruitmentFirm(e.target.checked);
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
                            if(e.target.checked) setIsRecruitmentFirm(false);
                        }}
                    >
                        Is this a Verification Firm?
                    </Checkbox>
                </FormControl>
             </Flex>

             {/* Company Profile Section */}
             {(selectedCompany || profileData.company_name) && (
               <>
                 <Divider />
                 <Box>
                   <Flex justify="space-between" align="center" mb={3}>
                     <Heading size="sm" color="gray.600">Company Profile (Auto-populated)</Heading>
                     <Button
                       size="sm"
                       leftIcon={<Edit2 size={14} />}
                       variant="ghost"
                       colorScheme="purple"
                       onClick={() => setIsEditingProfile(!isEditingProfile)}
                     >
                       {isEditingProfile ? 'Done Editing' : 'Edit Details'}
                     </Button>
                   </Flex>

                   {!isEditingProfile ? (
                     // View Mode
                     <Box bg="gray.50" p={4} borderRadius="md" borderWidth="1px">
                       <VStack align="stretch" spacing={2}>
                         {profileData.cin && (
                           <Box>
                             <Text fontSize="xs" color="gray.500" fontWeight="semibold">CIN (Company Identification Number)</Text>
                             <Text fontSize="sm" fontFamily="mono" fontWeight="medium" color="purple.600">{profileData.cin}</Text>
                           </Box>
                         )}
                         <Box>
                           <Text fontSize="xs" color="gray.500" fontWeight="semibold">Company Name</Text>
                           <Text fontSize="sm">{profileData.company_name}</Text>
                         </Box>
                         <Box>
                           <Text fontSize="xs" color="gray.500" fontWeight="semibold">Address</Text>
                           <Text fontSize="sm">
                             {[profileData.address_line1, profileData.address_line2].filter(Boolean).join(', ')}
                           </Text>
                         </Box>
                         <Flex gap={4}>
                           <Box flex={1}>
                             <Text fontSize="xs" color="gray.500" fontWeight="semibold">City</Text>
                             <Text fontSize="sm">{profileData.city || 'N/A'}</Text>
                           </Box>
                           <Box flex={1}>
                             <Text fontSize="xs" color="gray.500" fontWeight="semibold">State</Text>
                             <Text fontSize="sm">{profileData.state || 'N/A'}</Text>
                           </Box>
<Box flex={1}>
      <Text fontSize="xs" color="gray.500" fontWeight="semibold">PIN</Text>
      <Text fontSize="sm">{profileData.zip_code || 'N/A'}</Text>
    </Box>
  </Flex>

  {/* 🆕 Added Capital and Status Row */}
  <Flex gap={4} pt={2} borderTop="1px dashed" borderColor="gray.200">
    <Box flex={1}>
      <Text fontSize="xs" color="gray.500" fontWeight="semibold">Status</Text>
      <Badge colorScheme={profileData.company_status === 'Active' ? 'green' : 'gray'}>
        {profileData.company_status}
      </Badge>
    </Box>
    <Box flex={1}>
      <Text fontSize="xs" color="gray.500" fontWeight="semibold">Authorized Cap</Text>
      <Text fontSize="sm" fontWeight="medium">₹{profileData.authorized_cap}</Text>
    </Box>
    <Box flex={1}>
      <Text fontSize="xs" color="gray.500" fontWeight="semibold">Paid-up Cap</Text>
      <Text fontSize="sm" fontWeight="medium">₹{profileData.paidup_capital}</Text>
    </Box>
  </Flex>
</VStack>
                     </Box>
                   ) : (
                     // Edit Mode
                     <VStack spacing={3} bg="purple.50" p={4} borderRadius="md" borderWidth="1px" borderColor="purple.200">
                       {profileData.cin && (
                         <FormControl>
                           <FormLabel fontSize="sm">CIN (Company Identification Number)</FormLabel>
                           <Input
                             value={profileData.cin}
                             isReadOnly
                             isDisabled
                             bg="gray.100"
                             fontFamily="mono"
                             fontWeight="medium"
                             color="purple.700"
                             cursor="not-allowed"
                           />
                           <Text fontSize="xs" color="gray.500" mt={1}>
                             ℹ️ CIN cannot be edited - it's fetched from MCA database
                           </Text>
                         </FormControl>
                       )}
                       <FormControl>
                         <FormLabel fontSize="sm">Company Name</FormLabel>
                         <Input
                           value={profileData.company_name}
                           onChange={(e) => handleProfileDataChange('company_name', e.target.value)}
                           bg="white"
                         />
                       </FormControl>
                       <FormControl>
                         <FormLabel fontSize="sm">Address Line 1</FormLabel>
                         <Input
                           value={profileData.address_line1}
                           onChange={(e) => handleProfileDataChange('address_line1', e.target.value)}
                           bg="white"
                         />
                       </FormControl>
                       <FormControl>
                         <FormLabel fontSize="sm">Address Line 2</FormLabel>
                         <Input
                           value={profileData.address_line2}
                           onChange={(e) => handleProfileDataChange('address_line2', e.target.value)}
                           bg="white"
                         />
                       </FormControl>
                       <Flex gap={3}>
                         <FormControl>
                           <FormLabel fontSize="sm">City</FormLabel>
                           <Input
                             value={profileData.city}
                             onChange={(e) => handleProfileDataChange('city', e.target.value)}
                             bg="white"
                           />
                         </FormControl>
                         <FormControl>
                           <FormLabel fontSize="sm">State</FormLabel>
                           <Input
                             value={profileData.state}
                             onChange={(e) => handleProfileDataChange('state', e.target.value)}
                             bg="white"
                           />
                         </FormControl>
                         <FormControl>
                           <FormLabel fontSize="sm">ZIP Code</FormLabel>
                           <Input
                             value={profileData.zip_code}
                             onChange={(e) => handleProfileDataChange('zip_code', e.target.value)}
                             bg="white"
                           />
                         </FormControl>
                       </Flex>

                          <Flex gap={3} w="100%">
            <FormControl flex={1}>
              <FormLabel fontSize="sm">Company Status</FormLabel>
              <Select 
                value={profileData.company_status} 
                onChange={(e) => handleProfileDataChange('company_status', e.target.value)}
                bg="white"
                size="sm"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Struck Off">Struck Off</option>
              </Select>
            </FormControl>
            <FormControl flex={1}>
              <FormLabel fontSize="sm">Auth. Cap (₹)</FormLabel>
              <Input
                value={profileData.authorized_cap}
                onChange={(e) => handleProfileDataChange('authorized_cap', e.target.value)}
                bg="white"
                size="sm"
                placeholder="e.g. 100000"
              />
            </FormControl>
            <FormControl flex={1}>
              <FormLabel fontSize="sm">Paid-up Cap (₹)</FormLabel>
              <Input
                value={profileData.paidup_capital}
                onChange={(e) => handleProfileDataChange('paidup_capital', e.target.value)}
                bg="white"
                size="sm"
                placeholder="e.g. 100000"
              />
            </FormControl>
          </Flex>



                     </VStack>
                   )}
                 </Box>
               </>
             )}

            <Divider my={2} />

            {/* STEP 3: Superadmin User Details */}
            <Heading size="sm" color="gray.600">Step 3: Superadmin User Details</Heading>
            <Flex gap={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">First Name</FormLabel>
                <Input name="firstName" value={adminDetails.firstName} onChange={handleAdminChange} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Last Name</FormLabel>
                <Input name="lastName" value={adminDetails.lastName} onChange={handleAdminChange} />
              </FormControl>
            </Flex>
            <FormControl isRequired>
                <FormLabel fontSize="sm">Employee ID</FormLabel>
                <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="e.g., EMP001" />
              </FormControl>
             <FormControl isRequired>
               <FormLabel fontSize="sm">Email</FormLabel>
               <Input name="email" type="email" value={adminDetails.email} onChange={handleAdminChange} />
             </FormControl>
             
            <Flex gap={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Password</FormLabel>
                <Input name="password" type="password" value={adminDetails.password} onChange={handleAdminChange} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Phone Number</FormLabel>
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
          <Button colorScheme="purple" onClick={handleCreate} isLoading={isLoading}>
            Create Organization
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreateOrganizationModal;