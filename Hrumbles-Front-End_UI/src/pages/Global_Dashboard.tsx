// src/pages/Global_Dashboard.tsx

import { useState, useEffect, FC } from "react";
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
} from "@chakra-ui/react";
import { AddIcon, EditIcon, ViewIcon } from "@chakra-ui/icons";
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
  user_counts: Record<string, RoleCounts>;
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
  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      // Call the RPC function we created
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

  const getStatusBadge = (status: Organization['status']) => {
    const colorSchemes = {
      active: "green",
      inactive: "yellow",
      suspended: "red",
    };
    return <Badge colorScheme={colorSchemes[status]}>{status.toUpperCase()}</Badge>;
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
          <Heading size="lg">Organization Management</Heading>
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
                  <Th>User Credits</Th>
                  <Th>Active Users</Th>
                  <Th>Inactive Users</Th>
                  <Th>Terminated</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {organizations.map((org) => (
                  <Tr key={org.id}>
                    <Td>
                      <Text fontWeight="bold">{org.name}</Text>
                      <Text fontSize="sm" color="gray.500">{org.superadmin_email || 'No Admin'}</Text>
                    </Td>
                    <Td>{getStatusBadge(org.status)}</Td>
                    <Td>
                        <VStack align="start" spacing={1} fontSize="xs">
                            {Object.entries(roleDisplayNameMap).map(([roleKey, displayName]) => {
                                const count = org.user_counts[roleKey]?.total || 0;
                                const limit = org.role_credit_limits[roleKey] ?? 'N/A';
                                return (
                                    <Flex key={roleKey} gap={2} align="center">
                                        <Text>{displayName}:</Text>
                                        <Badge colorScheme={count >= limit ? 'red' : 'gray'}>
                                            {count} / {limit}
                                        </Badge>
                                    </Flex>
                                );
                            })}
                        </VStack>
                    </Td>
                    <Td>{renderCounts(org.user_counts, 'active')}</Td>
                    <Td>{renderCounts(org.user_counts, 'inactive')}</Td>
                    <Td>{renderCounts(org.user_counts, 'terminated')}</Td>
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

      {/* MODALS: Ensure these are also converted to .tsx and accept typed props */}
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