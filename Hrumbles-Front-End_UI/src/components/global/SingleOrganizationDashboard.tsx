// src/pages/SingleOrganizationDashboard.tsx

import { FC, useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Box,
  Heading,
  Spinner,
  Flex,
  Text,
  Grid,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { Users, FileText, SearchCheck, DollarSign, Clock } from 'lucide-react';

// Define the type for our detailed organization data
interface OrgDetails {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  subdomain: string | null;
  user_stats: { status: string; count: number }[];
  talent_pool_count: number;
  verification_stats: {
    total_checks: number;
    total_cost: number;
  };
  recent_users: {
    email: string;
    first_name: string;
    last_name: string;
    created_at: string;
  }[];
}

const StatCard = ({ title, value, icon, description }: any) => (
  <Card bg={useColorModeValue("white", "gray.800")} boxShadow="md">
    <CardBody>
      <Flex alignItems="center">
        <Box
          bg={useColorModeValue('gray.100', 'gray.700')}
          p={3}
          borderRadius="full"
          mr={4}
        >
          {icon}
        </Box>
        <Box>
          <Stat>
            <StatLabel color="gray.500">{title}</StatLabel>
            <StatNumber>{value}</StatNumber>
            {description && <StatHelpText>{description}</StatHelpText>}
          </Stat>
        </Box>
      </Flex>
    </CardBody>
  </Card>
);

const SingleOrganizationDashboard: FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [organization, setOrganization] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!organizationId) return;
      setLoading(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_organizations_with_stats', {
          org_id: organizationId,
        });
        if (rpcError) throw rpcError;
        setOrganization(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [organizationId]);

  if (loading) {
    return <Flex justify="center" align="center" minH="100vh"><Spinner size="xl" /></Flex>;
  }
  if (error) {
    return <Flex justify="center" align="center" minH="100vh"><Text color="red.500">Error: {error}</Text></Flex>;
  }
  if (!organization) {
    return <Flex justify="center" align="center" minH="100vh"><Text>Organization not found.</Text></Flex>;
  }
  
  const totalUsers = organization.user_stats.reduce((sum, s) => sum + s.count, 0);
  const activeUsers = organization.user_stats.find(s => s.status === 'active')?.count || 0;

  return (
    <Box p={8} bg={useColorModeValue('gray.50', 'gray.900')} minH="100vh">
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Box>
            <RouterLink to="/organization">
              <Flex align="center" color="blue.500" mb={2}>
                <ArrowBackIcon mr={2} />
                <Text>Back to All Organizations</Text>
              </Flex>
            </RouterLink>
            <Heading size="lg">{organization.name}</Heading>
            <Text color="gray.500">Subdomain: {organization.subdomain || 'N/A'}</Text>
          </Box>
          <Badge colorScheme={organization.status === 'active' ? 'green' : 'red'} p={2} borderRadius="md">
            {organization.status.toUpperCase()}
          </Badge>
        </Flex>

        {/* --- ENRICHED STATS GRID --- */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6}>
            <StatCard title="Total Users" value={totalUsers} icon={<Users color="#3182CE" />} description={`${activeUsers} active`} />
            <StatCard title="Talent Pool" value={organization.talent_pool_count} icon={<FileText color="#38A169" />} description="Candidates" />
            <StatCard title="Total Verifications" value={organization.verification_stats?.total_checks || 0} icon={<SearchCheck color="#DD6B20" />} description="Checks performed"/>
            <StatCard title="Verification Cost" value={`₹${(organization.verification_stats?.total_cost || 0).toLocaleString()}`} icon={<DollarSign color="#D53F8C" />} description="Total Billed"/>
        </Grid>

        <Card bg={useColorModeValue("white", "gray.800")} boxShadow="md">
          <CardHeader><Heading size="md">Recent Users</Heading></CardHeader>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Date Joined</Th>
                </Tr>
              </Thead>
              <Tbody>
                {organization.recent_users?.map(user => (
                  <Tr key={user.email}>
                    <Td>{user.first_name} {user.last_name}</Td>
                    <Td>{user.email}</Td>
                    <Td>{new Date(user.created_at).toLocaleDateString()}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>

      </VStack>
    </Box>
  );
};

export default SingleOrganizationDashboard;