// src/pages/Global_Dashboard.tsx

import { useState, useEffect, FC, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Flex,
  Heading,
  Button,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Spinner,
  Text,
  useToast,
  useColorModeValue,
  Tooltip,
  Progress,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Checkbox,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
} from "@chakra-ui/react";
import { 
  AddIcon, 
  EditIcon, 
  SearchIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  ViewIcon,
  EmailIcon,
  NotAllowedIcon,
  DownloadIcon
} from "@chakra-ui/icons";
import { supabase } from "../integrations/supabase/client";
import CreateOrganizationModal from "../components/global/OrganizationManagement/CreateOrganizationModal";
import EditOrganizationModal from "../components/global/OrganizationManagement/EditOrganizationModal";

// --- Type Definitions ---
interface RoleCounts {
  active: number;
  inactive: number;
  terminated: number;
  total: number;
}

interface Organization {
  id: string;
  name: string;
  created_at: string;
  status: 'active' | 'inactive' | 'suspended';
  superadmin_email: string | null;
  role_credit_limits: Record<string, number>;
  user_counts: Record<string, any>;
  talent_pool_count: number;
  last_login: string | null;
}

const roleDisplayNameMap: Record<string, string> = {
  organization_superadmin: 'Super Admins',
  admin: 'Admins',
  employee: 'Users',
};

const GlobalSuperadminDashboard: FC = () => {
  // --- State ---
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Modals
  const [isCreateOpen, setCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setEditOpen] = useState<boolean>(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: keyof Organization | 'created_at'; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toast = useToast();
  
  // Design Hooks
  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const pillBg = useColorModeValue("gray.100", "gray.700");
  const pillBorder = useColorModeValue("gray.200", "gray.600");

  // --- Fetch Logic ---
  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_organizations_with_stats');
      if (error) throw error;
      setOrganizations(data as Organization[]);
    } catch (error: any) {
      toast({
        title: "Error fetching organizations",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // --- Logic: Handle Status Change ---
  const handleStatusChange = async (orgId: string, newStatus: string) => {
    // 1. Optimistic Update (Update UI immediately)
    const previousOrgs = [...organizations];
    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === orgId ? { ...org, status: newStatus as any } : org
      )
    );

    try {
      // 2. Update Supabase
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', orgId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error: any) {
      // 3. Revert on Error
      setOrganizations(previousOrgs);
      toast({
        title: "Update Failed",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // --- Helpers & Logic ---

  // 1. Filter & Sort Logic
  const filteredAndSortedOrgs = useMemo(() => {
    let result = [...organizations];

// Filter by Status
    if (statusFilter === "requires_action") {
      // Logic for the "Inactive/Terminated" card (anything not active)
      result = result.filter(org => org.status !== 'active');
    } else if (statusFilter !== "all") {
      // Standard single status filter
      result = result.filter(org => org.status === statusFilter);
    }

    // Filter by Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(org => 
        org.name.toLowerCase().includes(lowerQuery) || 
        org.superadmin_email?.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === bValue) return 0;
      
      // Handle nulls
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (sortConfig.direction === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });

    return result;
  }, [organizations, statusFilter, searchQuery, sortConfig]);

  // 2. Selection Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredAndSortedOrgs.map(org => org.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSort = (key: keyof Organization) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 3. UI Helpers
  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return "red";
    if (percentage >= 80) return "orange";
    return "blue";
  };

  // --- Render Components ---

  // Summary Row Calculation
  const stats = useMemo(() => {
    const total = organizations.length;
    const active = organizations.filter(o => o.status === 'active').length;
    const inactive = organizations.filter(o => o.status !== 'active').length;
    const totalUsers = organizations.reduce((acc, org) => {
        return acc + (org.user_counts?.employee?.total || 0);
    }, 0);
    
    return { total, active, inactive, totalUsers };
  }, [organizations]);

  return (
    <Box bg={bg} p={6} minH="100vh">
      <VStack spacing={6} align="stretch">
        
{/* 1. Summary Row */}
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={5}>
            {/* CARD 1: Total - Resets filter to 'all' */}
            <Stat 
                bg={statusFilter === 'all' ? "blue.50" : cardBg} 
                p={4} 
                borderRadius="lg" 
                boxShadow="sm" 
                border="1px solid" 
                borderColor={statusFilter === 'all' ? "blue.400" : borderColor}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ transform: 'translateY(-2px)', shadow: 'md', borderColor: 'blue.400' }}
                onClick={() => setStatusFilter('all')}
            >
                <StatLabel>Total Organizations</StatLabel>
                <StatNumber>{stats.total}</StatNumber>
                <StatHelpText>System wide</StatHelpText>
            </Stat>

            {/* CARD 2: Active - Sets filter to 'active' */}
            <Stat 
                bg={statusFilter === 'active' ? "green.50" : cardBg} 
                p={4} 
                borderRadius="lg" 
                boxShadow="sm" 
                border="1px solid" 
                borderColor={statusFilter === 'active' ? "green.400" : borderColor}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ transform: 'translateY(-2px)', shadow: 'md', borderColor: 'green.400' }}
                onClick={() => setStatusFilter('active')}
            >
                <StatLabel>Active</StatLabel>
                <StatNumber color="green.500">{stats.active}</StatNumber>
                <StatHelpText>{stats.total > 0 ? ((stats.active/stats.total)*100).toFixed(0) : 0}% Rate</StatHelpText>
            </Stat>

            {/* CARD 3: Inactive - Sets filter to 'requires_action' */}
            <Stat 
                bg={statusFilter === 'requires_action' ? "red.50" : cardBg} 
                p={4} 
                borderRadius="lg" 
                boxShadow="sm" 
                border="1px solid" 
                borderColor={statusFilter === 'requires_action' ? "red.400" : borderColor}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ transform: 'translateY(-2px)', shadow: 'md', borderColor: 'red.400' }}
                onClick={() => setStatusFilter('requires_action')}
            >
                <StatLabel>Inactive/Terminated</StatLabel>
                <StatNumber color="red.500">{stats.inactive}</StatNumber>
                <StatHelpText>Requires Action</StatHelpText>
            </Stat>

            {/* CARD 4: Users - Not clickable (or resets) */}
            <Stat 
                bg={cardBg} 
                p={4} 
                borderRadius="lg" 
                boxShadow="sm" 
                border="1px solid" 
                borderColor={borderColor}
            >
                <StatLabel>Total Users Managed</StatLabel>
                <StatNumber color="blue.500">{stats.totalUsers}</StatNumber>
                <StatHelpText>Across all orgs</StatHelpText>
            </Stat>
        </SimpleGrid>

        {/* 2. Header & Actions */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <Heading size="lg">Organization Management</Heading>
          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={() => setCreateOpen(true)}>
            Create Organization
          </Button>
        </Flex>

        {/* 3. Advanced Filters & Bulk Actions Toolbar */}
        <Flex 
            bg={cardBg} 
            p={4} 
            borderRadius="lg" 
            boxShadow="sm" 
            justify="space-between" 
            align="center"
            wrap="wrap"
            gap={4}
        >
            <HStack spacing={4} flex={1}>
                <InputGroup maxWidth="300px">
                    <InputLeftElement pointerEvents="none" children={<SearchIcon color="gray.300" />} />
                    <Input 
                        placeholder="Search Organization..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </InputGroup>
                
<Select 
                    maxWidth="200px" 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">Status: All</option>
                    <option value="active">Active</option>
                    {/* New option to match the Red Card */}
                    <option value="requires_action">Action Needed</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Terminated</option>
                </Select>
            </HStack>

            {/* Bulk Actions (Visible only when items selected) */}
            {selectedIds.length > 0 && (
                <HStack>
                    <Text fontSize="sm" fontWeight="bold" color="blue.600">{selectedIds.length} Selected</Text>
                    <Menu>
                        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} size="sm" colorScheme="gray">
                            Bulk Actions
                        </MenuButton>
                        <MenuList>
                            <MenuItem icon={<EmailIcon />}>Send Reminder</MenuItem>
                            <MenuItem icon={<NotAllowedIcon />}>Deactivate Selected</MenuItem>
                            <MenuItem icon={<DownloadIcon />}>Export Data</MenuItem>
                        </MenuList>
                    </Menu>
                </HStack>
            )}
        </Flex>

        {/* 4. Data Table */}
        <Box bg={cardBg} borderRadius="lg" boxShadow="md" overflowX="auto">
          {loading ? (
            <Flex justify="center" align="center" h="400px"><Spinner size="xl" /></Flex>
          ) : (
            <Table variant="simple" size="md">
              <Thead bg={useColorModeValue("gray.50", "gray.700")}>
                <Tr>
                  <Th w="40px">
                    <Checkbox 
                        isChecked={selectedIds.length === filteredAndSortedOrgs.length && filteredAndSortedOrgs.length > 0}
                        isIndeterminate={selectedIds.length > 0 && selectedIds.length < filteredAndSortedOrgs.length}
                        onChange={handleSelectAll}
                    />
                  </Th>
                  <Th cursor="pointer" onClick={() => handleSort('name')}>
                    Organization {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />)}
                  </Th>
                  <Th cursor="pointer" onClick={() => handleSort('status')}>
                    Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />)}
                  </Th>
                  <Th>User Credits (Usage)</Th>
                  <Th>Active Users</Th>
                  <Th>Talent Pool</Th>
                  <Th cursor="pointer" onClick={() => handleSort('created_at')}>
                    Created {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />)}
                  </Th>
                  <Th>Actions</Th>
                </Tr>   
              </Thead>
              <Tbody>
                {filteredAndSortedOrgs.map((org) => (
                  <Tr key={org.id} _hover={{ bg: useColorModeValue("gray.50", "whiteAlpha.100") }}>
                    <Td>
                        <Checkbox 
                            isChecked={selectedIds.includes(org.id)}
                            onChange={() => handleSelectRow(org.id)}
                        />
                    </Td>
                    <Td>
                        <Popover trigger="hover" placement="top-start">
                            <PopoverTrigger>
                                <Box>
                                    <Link to={`/organization/${org.id}`}>
                                        <Text fontWeight="bold" color="blue.600" _hover={{ textDecoration: 'underline' }}>
                                            {org.name}
                                        </Text>
                                    </Link>
                                    <Text fontSize="xs" color="gray.500">{org.superadmin_email || 'No Admin'}</Text>
                                </Box>
                            </PopoverTrigger>
                            <PopoverContent>
                                <PopoverHeader fontWeight="semibold">Quick Stats</PopoverHeader>
                                <PopoverArrow />
                                <PopoverBody>
                                    <VStack align="start" spacing={1} fontSize="sm">
                                        <Text>Last Login: {org.last_login ? new Date(org.last_login).toLocaleDateString() : 'Never'}</Text>
                                        <Text>Total Users: {org.user_counts?.employee?.total || 0}</Text>
                                        <Text>Talent Pool: {org.talent_pool_count}</Text>
                                    </VStack>
                                </PopoverBody>
                            </PopoverContent>
                        </Popover>
                    </Td>
                    
                    {/* STATUS COLUMN - Editable Dropdown */}
                    <Td>
                      <Select
                        value={org.status}
                        onChange={(e) => handleStatusChange(org.id, e.target.value)}
                        size="xs"
                        variant="filled"
                        borderRadius="full"
                        fontWeight="bold"
                        textTransform="uppercase"
                        width="fit-content"
                        icon={<ChevronDownIcon />}
                        // Dynamic Colors based on status
                        bg={
                          org.status === 'active' ? 'green.100' :
                          org.status === 'inactive' ? 'gray.100' : 'red.100'
                        }
                        color={
                          org.status === 'active' ? 'green.700' :
                          org.status === 'inactive' ? 'gray.700' : 'red.700'
                        }
                        _hover={{ opacity: 0.8 }}
                        _focus={{ boxShadow: "outline" }}
                        sx={{
                          '> option': {
                            background: 'white',
                            color: 'black',
                            fontWeight: 'normal',
                            textTransform: 'capitalize'
                          }
                        }}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </Select>
                    </Td>
                    
                    {/* Visual Credits / Usage */}
                    <Td minW="200px">
                        <VStack align="stretch" spacing={2}>
                            {Object.entries(roleDisplayNameMap).map(([roleKey, displayName]) => {
                                const count = org.user_counts[roleKey]?.total || 0;
                                const limit = org.role_credit_limits[roleKey] || 0;
                                const percentage = limit > 0 ? (count / limit) * 100 : 0;
                                
                                return (
                                    <Box key={roleKey}>
                                        <Flex justify="space-between" fontSize="xs" mb={1}>
                                            <Text color="gray.600">{displayName}</Text>
                                            <Text fontWeight="bold">{count} / {limit}</Text>
                                        </Flex>
                                        <Progress 
                                            value={percentage} 
                                            size="xs" 
                                            colorScheme={getUsageColor(percentage)} 
                                            borderRadius="full"
                                            hasStripe={percentage >= 100}
                                        />
                                    </Box>
                                );
                            })}
                        </VStack>
                    </Td>

                    {/* Simplified Active Users Count */}
                    <Td>
                         <HStack>
                             <Badge colorScheme="green" variant="subtle" borderRadius="full">
                                {org.user_counts?.employee?.active || 0} Active
                             </Badge>
                             {(org.user_counts?.employee?.inactive || 0) > 0 && (
                                <Badge colorScheme="gray" variant="subtle" borderRadius="full">
                                    {org.user_counts?.employee?.inactive} Inactive
                                </Badge>
                             )}
                         </HStack>
                    </Td>

                    <Td>
                        <Text fontWeight="bold">{org.talent_pool_count}</Text>
                    </Td>
                    
                    <Td fontSize="sm" color="gray.600">{new Date(org.created_at).toLocaleDateString()}</Td>
                    
                    {/* ACTIONS COLUMN - Pill Shape (View & Edit Only) */}
                    <Td>
                      <HStack 
                        spacing={1} 
                        bg={pillBg} 
                        p={1} 
                        borderRadius="full" 
                        borderWidth="1px" 
                        borderColor={pillBorder}
                        width="fit-content"
                      >
                         {/* View Button */}
                         <Tooltip label="View Details" hasArrow>
                           <Link to={`/organization/${org.id}`}>
                             <IconButton
                               aria-label="View Details"
                               icon={<ViewIcon />}
                               size="xs"
                               variant="ghost"
                               colorScheme="purple"
                               isRound
                               _hover={{ bg: "purple.500", color: "white" }}
                             />
                           </Link>
                         </Tooltip>
                         
                         {/* Edit Button */}
                         <Tooltip label="Edit Organization" hasArrow>
                           <IconButton
                             aria-label="Edit Organization"
                             icon={<EditIcon />}
                             size="xs"
                             onClick={() => { setSelectedOrg(org); setEditOpen(true); }}
                             variant="ghost"
                             colorScheme="purple"
                             isRound
                             _hover={{ bg: "purple.500", color: "white" }}
                           />
                         </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
                {filteredAndSortedOrgs.length === 0 && (
                    <Tr>
                        <Td colSpan={8} textAlign="center" py={10} color="gray.500">
                            No organizations found matching your filters.
                        </Td>
                    </Tr>
                )}
              </Tbody>
            </Table>
          )}
        </Box>
      </VStack>

      {/* MODALS */}
      <CreateOrganizationModal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={fetchOrganizations}
      />

      {selectedOrg && (
        <EditOrganizationModal
          isOpen={isEditOpen}
          onClose={() => setEditOpen(false)}
          organization={selectedOrg}
          onSuccess={fetchOrganizations}
        />
      )}
    </Box>
  );
};

export default GlobalSuperadminDashboard;