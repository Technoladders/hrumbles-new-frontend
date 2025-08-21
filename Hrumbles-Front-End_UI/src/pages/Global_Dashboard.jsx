import { useState, useEffect } from "react";
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
} from "@chakra-ui/react";
import { AddIcon, EditIcon } from "@chakra-ui/icons";
import { supabase } from "../integrations/supabase/client"; // Ensure this path is correct
import CreateOrganizationModal from "../components/global/OrganizationManagement/CreateOrganizationModal";
import EditOrganizationModal from "../components/global/OrganizationManagement/EditOrganizationModal";

const GlobalSuperadminDashboard = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const toast = useToast();

  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  const fetchOrganizations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hr_organizations")
      .select(`
        *,
        hr_employees (
          id,
          email,
          hr_roles (name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching organizations",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setOrganizations([]);
    } else {
      const orgsWithCounts = data.map(org => {
        const superadmin = org.hr_employees.find(emp => emp.hr_roles.name === 'organization_superadmin');
        return {
          ...org,
          user_count: org.hr_employees.length,
          superadmin_email: superadmin ? superadmin.email : 'N/A'
        };
      });
      setOrganizations(orgsWithCounts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleEditClick = (org) => {
    setSelectedOrg(org);
    setEditOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge colorScheme="green">Active</Badge>;
      case "inactive":
        return <Badge colorScheme="yellow">Inactive</Badge>;
      case "suspended":
        return <Badge colorScheme="red">Suspended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Box bg={bg} p={8} minH="100vh">
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg">Organization Management</Heading>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={() => setCreateOpen(true)}
          >
            Create Organization
          </Button>
        </Flex>

        <Box bg={cardBg} borderRadius="lg" boxShadow="md" p={4}>
          {loading ? (
            <Flex justify="center" align="center" h="400px">
              <Spinner size="xl" />
            </Flex>
          ) : organizations.length === 0 ? (
            <Text textAlign="center" p={10}>No organizations found.</Text>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Organization Name</Th>
                  <Th>Superadmin</Th>
                  <Th>Status</Th>
                  <Th>User Credits</Th>
                  <Th>Created At</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {organizations.map((org) => (
                  <Tr key={org.id}>
                    <Td fontWeight="medium">{org.name}</Td>
                    <Td>{org.superadmin_email}</Td>
                    <Td>{getStatusBadge(org.status)}</Td>
                    <Td>
                      <Text
                        fontWeight="bold"
                        color={org.user_count >= org.user_credit_limit ? 'red.500' : 'inherit'}
                      >
                        {org.user_count} / {org.user_credit_limit}
                      </Text>
                    </Td>
                    <Td>{new Date(org.created_at).toLocaleDateString()}</Td>
                    <Td>
                      <IconButton
                        aria-label="Edit Organization"
                        icon={<EditIcon />}
                        onClick={() => handleEditClick(org)}
                      />
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
