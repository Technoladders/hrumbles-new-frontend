// src/pages/Global_Dashboard.tsx

import { useState, useEffect, FC, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Flex,
  Heading,
  Button,
  VStack,
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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  HStack
} from "@chakra-ui/react";
import { AddIcon, EditIcon, ChevronDownIcon, BellIcon, WarningTwoIcon } from "@chakra-ui/icons";
import { supabase } from "../integrations/supabase/client";
import CreateOrganizationModal from "../components/global/OrganizationManagement/CreateOrganizationModal";
import EditOrganizationModal from "../components/global/OrganizationManagement/EditOrganizationModal";
import moment from "moment";

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
  subscription_status: 'trial' | 'active' | 'expired' | 'canceled';
  trial_end_date: string | null;
  subscription_expires_at: string | null;
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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreateOpen, setCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setEditOpen] = useState<boolean>(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const toast = useToast();
  
  // Colors
  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

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

  const handleEditClick = (org: Organization) => {
    setSelectedOrg(org);
    setEditOpen(true);
  };

  // --- NEW: Handle Status Change ---
  const handleStatusChange = async (orgId: string, newStatus: string) => {
    try {
        const { error } = await supabase.rpc('update_organization_status', {
            p_org_id: orgId,
            p_new_status: newStatus
        });

        if (error) throw error;

        // Optimistic UI update
        setOrganizations(prev => prev.map(org => 
            org.id === orgId ? { ...org, status: newStatus as any } : org
        ));

        toast({
            title: "Status Updated",
            description: `Organization is now ${newStatus}`,
            status: "success",
            duration: 3000,
        });
    } catch (error: any) {
        toast({
            title: "Update Failed",
            description: error.message,
            status: "error",
            duration: 5000,
        });
    }
  };

  // --- NEW: Notification Logic ---
  const notifications = useMemo(() => {
    const alerts: any[] = [];
    const now = moment();

    organizations.forEach(org => {
        // 1. Trial Ending Soon (in 3 days)
        if (org.subscription_status === 'trial' && org.trial_end_date) {
            const endDate = moment(org.trial_end_date);
            const daysLeft = endDate.diff(now, 'days');
            if (daysLeft >= 0 && daysLeft <= 3) {
                alerts.push({
                    type: 'trial_warning',
                    orgName: org.name,
                    msg: `Trial ends in ${daysLeft} days`,
                    color: 'orange.500'
                });
            } else if (daysLeft < 0 && org.status === 'active') {
                 alerts.push({
                    type: 'trial_expired',
                    orgName: org.name,
                    msg: `Trial Expired - Action Needed`,
                    color: 'red.500'
                });
            }
        }

        // 2. Subscription Expiring Soon
        if (org.subscription_status === 'active' && org.subscription_expires_at) {
            const endDate = moment(org.subscription_expires_at);
            const daysLeft = endDate.diff(now, 'days');
            if (daysLeft >= 0 && daysLeft <= 7) {
                alerts.push({
                    type: 'sub_warning',
                    orgName: org.name,
                    msg: `Subscription renews/expires in ${daysLeft} days`,
                    color: 'purple.500'
                });
            }
        }
    });
    return alerts;
  }, [organizations]);


  const getStatusBadgeColor = (status: string) => {
    switch(status) {
        case 'active': return 'green';
        case 'inactive': return 'yellow';
        case 'suspended': return 'red';
        default: return 'gray';
    }
  };

  const renderCounts = (counts: Record<string, RoleCounts>, field: keyof RoleCounts) => (
    <VStack align="start" spacing={1} fontSize="xs">
      {Object.entries(roleDisplayNameMap).map(([roleKey, displayName]) => (
        <Text key={roleKey}>
          {displayName}:{" "}
          <Text as="span" fontWeight="bold">
            {counts[roleKey]?.[field] || 0}
          </Text>
        </Text>
      ))}
    </VStack>
  );

  return (
    <Box bg={bg} p={8} minH="100vh">
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            <Heading size="lg">Organization Management</Heading>
            
            {/* --- Notifications Bell --- */}
            <Popover>
              <PopoverTrigger>
                <Button variant="ghost" position="relative">
                    <BellIcon w={6} h={6} color="gray.600" />
                    {notifications.length > 0 && (
                        <Badge 
                            position="absolute" 
                            top="0" 
                            right="0" 
                            borderRadius="full" 
                            colorScheme="red"
                            fontSize="0.6em"
                        >
                            {notifications.length}
                        </Badge>
                    )}
                </Button>
              </PopoverTrigger>
              <PopoverContent maxH="300px" overflowY="auto">
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader fontWeight="bold">Notifications</PopoverHeader>
                <PopoverBody>
                    {notifications.length === 0 ? (
                        <Text fontSize="sm" color="gray.500">No new alerts.</Text>
                    ) : (
                        <VStack align="stretch" spacing={2}>
                            {notifications.map((note, idx) => (
                                <Box key={idx} p={2} bg="gray.50" borderRadius="md" borderLeft="4px solid" borderLeftColor={note.color}>
                                    <Text fontWeight="bold" fontSize="xs">{note.orgName}</Text>
                                    <Text fontSize="xs" color="gray.600">{note.msg}</Text>
                                </Box>
                            ))}
                        </VStack>
                    )}
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </HStack>

          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={() => setCreateOpen(true)}>
            Create Organization
          </Button>
        </Flex>

        <Box bg={cardBg} borderRadius="lg" boxShadow="md" overflowX="auto">
          {loading ? (
            <Flex justify="center" align="center" h="400px"><Spinner size="xl" /></Flex>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Organization</Th>
                  <Th>Status</Th>
                  <Th>Subscription</Th>
                  <Th>User Credits</Th>
                  <Th>Active Users</Th>
                  <Th>Inactive</Th>
                  <Th>Talent Pool</Th>
                  <Th>Superadmin Login</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {organizations.map((org) => (
                  <Tr key={org.id}>
                    <Td>
                        <Link to={`/organization/${org.id}`}>
                        <Text fontWeight="bold" color="blue.500" _hover={{ textDecoration: 'underline' }}>
                            {org.name}
                        </Text>
                        </Link>
                        <Text fontSize="sm" color="gray.500">{org.superadmin_email || 'No Admin'}</Text>
                    </Td>
                    
                    {/* --- Changeable Status Column --- */}
                    <Td>
                        <Menu>
                            <MenuButton 
                                as={Button} 
                                size="sm" 
                                rightIcon={<ChevronDownIcon />} 
                                colorScheme={getStatusBadgeColor(org.status)} 
                                variant="outline"
                                fontSize="xs"
                                h="8"
                            >
                                {org.status.toUpperCase()}
                            </MenuButton>
                            <MenuList zIndex={10}>
                                <MenuItem onClick={() => handleStatusChange(org.id, 'active')}>Active</MenuItem>
                                <MenuItem onClick={() => handleStatusChange(org.id, 'inactive')}>Inactive</MenuItem>
                                <MenuItem onClick={() => handleStatusChange(org.id, 'suspended')}>Suspended</MenuItem>
                            </MenuList>
                        </Menu>
                    </Td>

                    {/* --- Subscription Column --- */}
                    <Td>
                        <Badge colorScheme={org.subscription_status === 'active' ? 'green' : 'orange'}>
                            {org.subscription_status}
                        </Badge>
                        <Text fontSize="xs" color="gray.500">
                            {org.subscription_status === 'trial' && org.trial_end_date 
                                ? `Ends ${moment(org.trial_end_date).fromNow()}` 
                                : org.subscription_expires_at 
                                    ? `Exp ${moment(org.subscription_expires_at).format('MMM D')}` 
                                    : ''}
                        </Text>
                    </Td>

                    <Td>
                        <VStack align="start" spacing={1} fontSize="xs">
                            {Object.entries(roleDisplayNameMap).map(([roleKey, displayName]) => {
                                const count = org.user_counts[roleKey]?.total || 0;
                                const limit = org.role_credit_limits[roleKey] ?? 'N/A';
                                return (
                                    <Flex key={roleKey} gap={2} align="center">
                                        <Text>{displayName}:</Text>
                                        <Badge colorScheme={typeof limit === 'number' && count >= limit ? 'red' : 'gray'}>
                                            {count} / {limit}
                                        </Badge>
                                    </Flex>
                                );
                            })}
                        </VStack>
                    </Td>
                    <Td>{renderCounts(org.user_counts, 'active')}</Td>
                    <Td>{renderCounts(org.user_counts, 'inactive')}</Td>
                     <Td>
                    <Text fontWeight="bold">{org.talent_pool_count}</Text>
                  </Td>
                  <Td fontSize="sm">
                    {org.last_login 
                      ? moment(org.last_login).fromNow()
                      : <Badge colorScheme="gray">Never</Badge>}
                  </Td>
                    <Td fontSize="sm">{new Date(org.created_at).toLocaleDateString()}</Td>
                    <Td>
                      <Flex gap={1}>
                        <Tooltip label="Edit Organization" placement="top">
                          <IconButton
                            aria-label="Edit Organization"
                            icon={<EditIcon />}
                            size="sm"
                            onClick={() => handleEditClick(org)}
                          />
                        </Tooltip>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </VStack>

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