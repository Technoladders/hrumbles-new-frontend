import React, { useState, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Heading,
  Flex,
  Grid,
  GridItem,
  Card,
  CardBody,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  useColorModeValue,
  Icon,
  Tooltip,
  Progress,
} from '@chakra-ui/react';
import {
  Search,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  Award,
  ArrowUpRight,
  Filter,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { startOfMonth } from 'date-fns';
import moment from 'moment';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import {
  usePipelineOverview,
  useLeadsMetrics,
  useSalesPerformanceMetrics,
  useTopPerformers,
  useUpcomingActivities,
  useRecentActivityFeed,
  useKeyAccounts,
} from '@/hooks/sales/useSalesDashboard';
import type { DashboardFilters } from '@/types/sales-dashboard.types';
// import PipelineChart from '@/components/sales/dashboard/PipelineChart';
// import LeadsChart from '@/components/sales/dashboard/LeadsChart';
// import PerformanceChart from '@/components/sales/dashboard/PerformanceChart';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

const SalesDashboard: React.FC = () => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const bgCard = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: new Date(),
  });

  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: dateRange,
    teamMembers: [],
    stages: [],
    status: [],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Fetch data
  const { data: pipelineData = [], isLoading: isPipelineLoading } = usePipelineOverview(filters);
  const { data: leadsMetrics, isLoading: isLeadsLoading } = useLeadsMetrics(filters);
  const { data: performanceMetrics, isLoading: isPerformanceLoading } = useSalesPerformanceMetrics(selectedPeriod, filters);
  const { data: topPerformers = [], isLoading: isPerformersLoading } = useTopPerformers(selectedPeriod, 5);
  const { data: upcomingActivities = [], isLoading: isActivitiesLoading } = useUpcomingActivities(7);
  const { data: recentActivity = [], isLoading: isRecentActivityLoading } = useRecentActivityFeed(15);
  const { data: keyAccounts = [], isLoading: isKeyAccountsLoading } = useKeyAccounts(10);

  // Fetch team members for filter
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name')
        .eq('organization_id', organization_id)
        .order('first_name');
      return data || [];
    },
    enabled: !!organization_id,
  });

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    setFilters(prev => ({ ...prev, dateRange: newRange }));
  };

  const filteredUpcomingActivities = useMemo(() => {
    if (!searchTerm) return upcomingActivities;
    return upcomingActivities.filter(
      activity =>
        activity.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [upcomingActivities, searchTerm]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return Phone;
      case 'meeting':
        return Calendar;
      case 'email':
        return Mail;
      case 'task':
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  return (
    <Box p={{ base: 4, md: 6, lg: 8 }} bg="gray.50" minH="100vh">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading as="h1" size="xl" color="gray.800" mb={1}>
            Sales Dashboard
          </Heading>
          <Text color="gray.600" fontSize="sm">
            Track your sales pipeline, performance, and key metrics
          </Text>
        </Box>
        <Flex gap={3} align="center">
          <Select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value as any)}
            w="150px"
            bg={bgCard}
            size="sm"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </Select>
          <EnhancedDateRangeSelector value={dateRange} onChange={handleDateRangeChange} />
        </Flex>
      </Flex>

      {/* Key Metrics Cards */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6} mb={8}>
        {/* Total Revenue */}
        <GridItem>
          <Card bg={bgCard} borderWidth="1px" borderColor={borderColor} shadow="sm">
            <CardBody>
              <Flex justify="space-between" align="start">
                <Stat>
                  <StatLabel color="gray.600" fontSize="sm" fontWeight="medium">
                    Total Revenue
                  </StatLabel>
                  <StatNumber fontSize="2xl" fontWeight="bold" color="purple.600">
                    {isPerformanceLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      `$${(performanceMetrics?.total_revenue || 0).toLocaleString()}`
                    )}
                  </StatNumber>
                  <StatHelpText fontSize="xs" color="gray.500">
                    {isPerformanceLoading ? (
                      '...'
                    ) : (
                      <>
                        <StatArrow
                          type={
                            (performanceMetrics?.achievement_percentage || 0) >= 100
                              ? 'increase'
                              : 'decrease'
                          }
                        />
                        {performanceMetrics?.achievement_percentage.toFixed(1)}% of target
                      </>
                    )}
                  </StatHelpText>
                </Stat>
                <Box p={2} bg="purple.100" borderRadius="lg">
                  <Icon as={DollarSign} color="purple.600" boxSize={5} />
                </Box>
              </Flex>
              <Progress
                value={performanceMetrics?.achievement_percentage || 0}
                size="xs"
                colorScheme="purple"
                mt={3}
                borderRadius="full"
              />
            </CardBody>
          </Card>
        </GridItem>

        {/* Win Rate */}
        <GridItem>
          <Card bg={bgCard} borderWidth="1px" borderColor={borderColor} shadow="sm">
            <CardBody>
              <Flex justify="space-between" align="start">
                <Stat>
                  <StatLabel color="gray.600" fontSize="sm" fontWeight="medium">
                    Win Rate
                  </StatLabel>
                  <StatNumber fontSize="2xl" fontWeight="bold" color="green.600">
                    {isPerformanceLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      `${(performanceMetrics?.win_rate || 0).toFixed(1)}%`
                    )}
                  </StatNumber>
                  <StatHelpText fontSize="xs" color="gray.500">
                    {performanceMetrics?.won_deals || 0} won / {performanceMetrics?.lost_deals || 0} lost
                  </StatHelpText>
                </Stat>
                <Box p={2} bg="green.100" borderRadius="lg">
                  <Icon as={Target} color="green.600" boxSize={5} />
                </Box>
              </Flex>
            </CardBody>
          </Card>
        </GridItem>

        {/* Active Opportunities */}
        <GridItem>
          <Card bg={bgCard} borderWidth="1px" borderColor={borderColor} shadow="sm">
            <CardBody>
              <Flex justify="space-between" align="start">
                <Stat>
                  <StatLabel color="gray.600" fontSize="sm" fontWeight="medium">
                    Active Opportunities
                  </StatLabel>
                  <StatNumber fontSize="2xl" fontWeight="bold" color="blue.600">
                    {isLeadsLoading ? <Spinner size="sm" /> : leadsMetrics?.active_opportunities_count || 0}
                  </StatNumber>
                  <StatHelpText fontSize="xs" color="gray.500">
                    {leadsMetrics?.new_leads_count || 0} new this month
                  </StatHelpText>
                </Stat>
                <Box p={2} bg="blue.100" borderRadius="lg">
                  <Icon as={TrendingUp} color="blue.600" boxSize={5} />
                </Box>
              </Flex>
            </CardBody>
          </Card>
        </GridItem>

        {/* Avg Deal Size */}
        <GridItem>
          <Card bg={bgCard} borderWidth="1px" borderColor={borderColor} shadow="sm">
            <CardBody>
              <Flex justify="space-between" align="start">
                <Stat>
                  <StatLabel color="gray.600" fontSize="sm" fontWeight="medium">
                    Avg Deal Size
                  </StatLabel>
                  <StatNumber fontSize="2xl" fontWeight="bold" color="orange.600">
                    {isPerformanceLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      `$${(performanceMetrics?.average_deal_size || 0).toLocaleString()}`
                    )}
                  </StatNumber>
                  <StatHelpText fontSize="xs" color="gray.500">
                    {performanceMetrics?.average_sales_cycle_days.toFixed(0) || 0} days avg cycle
                  </StatHelpText>
                </Stat>
                <Box p={2} bg="orange.100" borderRadius="lg">
                  <Icon as={BarChart3} color="orange.600" boxSize={5} />
                </Box>
              </Flex>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Main Content Grid */}
      <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={6} mb={6}>
        {/* Pipeline Overview - 2 columns */}
        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <Card bg={bgCard} borderWidth="1px" borderColor={borderColor} shadow="sm" h="full">
            <CardBody>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md" color="gray.800">
                  Pipeline Overview
                </Heading>
                <Button
                  as={RouterLink}
                  to="/deals"
                  size="sm"
                  variant="ghost"
                  colorScheme="purple"
                  rightIcon={<Icon as={ArrowUpRight} />}
                >
                  View All Deals
                </Button>
              </Flex>
              {isPipelineLoading ? (
                <Flex justify="center" align="center" h="300px">
                  <Spinner color="purple.500" />
                </Flex>
              ) : (
            <Box p={8} textAlign="center">
  <Text color="gray.500">Pipeline Chart - Coming Soon</Text>
  <Text fontSize="sm" color="gray.400" mt={2}>
    Charts will be enabled once configured
  </Text>
</Box>
              )}
            </CardBody>
          </Card>
        </GridItem>

        {/* Top Performers - 1 column */}
        <GridItem>
          <Card bg={bgCard} borderWidth="1px" borderColor={borderColor} shadow="sm" h="full">
            <CardBody>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md" color="gray.800">
                  Top Performers
                </Heading>
                <Icon as={Award} color="purple.600" boxSize={5} />
              </Flex>
              {isPerformersLoading ? (
                <Flex justify="center" align="center" h="200px">
                  <Spinner color="purple.500" />
                </Flex>
              ) : topPerformers.length === 0 ? (
                <Flex direction="column" align="center" justify="center" h="200px" color="gray.400">
                  <Icon as={Users} boxSize={12} mb={2} />
                  <Text fontSize="sm">No performance data yet</Text>
                </Flex>
              ) : (
                <Box>
                  {topPerformers.map((performer, idx) => (
                    <Flex
                      key={performer.employee_id}
                      justify="space-between"
                      align="center"
                      py={3}
                      borderBottomWidth={idx < topPerformers.length - 1 ? '1px' : '0'}
                      borderColor={borderColor}
                    >
                      <Flex align="center" gap={3}>
                        <Badge
                          colorScheme={idx === 0 ? 'purple' : idx === 1 ? 'blue' : 'gray'}
                          fontSize="xs"
                          px={2}
                          py={1}
                          borderRadius="full"
                        >
                          #{idx + 1}
                        </Badge>
                        <Box>
                          <Text fontWeight="semibold" fontSize="sm" color="gray.800">
                            {performer.employee_name}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {performer.deals_won} deals won
                          </Text>
                        </Box>
                      </Flex>
                      <Box textAlign="right">
                        <Text fontWeight="bold" fontSize="sm" color="green.600">
                          ${performer.total_revenue.toLocaleString()}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {performer.achievement_percentage.toFixed(0)}% target
                        </Text>
                      </Box>
                    </Flex>
                  ))}
                </Box>
              )}
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Second Row */}
      <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6} mb={6}>
        {/* Tasks & Follow-ups */}
        <GridItem>
          <Card bg={bgCard} borderWidth="1px" borderColor={borderColor} shadow="sm" h="full" maxH="500px">
            <CardBody display="flex" flexDirection="column">
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md" color="gray.800">
                  Upcoming Tasks
                </Heading>
                <InputGroup size="sm" w="200px">
                  <InputLeftElement>
                    <Icon as={Search} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    bg="gray.50"
                    borderRadius="md"
                  />
                </InputGroup>
              </Flex>
              <Box overflowY="auto" flex="1">
                {isActivitiesLoading ? (
                  <Flex justify="center" align="center" h="200px">
                    <Spinner color="purple.500" />
                  </Flex>
                ) : filteredUpcomingActivities.length === 0 ? (
                  <Flex direction="column" align="center" justify="center" h="200px" color="gray.400">
                    <Icon as={CheckCircle} boxSize={12} mb={2} />
                    <Text fontSize="sm">No upcoming tasks</Text>
                  </Flex>
                ) : (
                  filteredUpcomingActivities.map(activity => (
                    <Flex
                      key={activity.id}
                      p={3}
                      mb={2}
                      bg="gray.50"
                      borderRadius="md"
                      borderLeftWidth="3px"
                      borderLeftColor={`${getPriorityColor(activity.priority)}.500`}
                      _hover={{ bg: 'gray.100' }}
                      cursor="pointer"
                    >
                      <Box flex="1">
                        <Flex align="center" gap={2} mb={1}>
                          <Icon as={getActivityIcon(activity.activity_type)} boxSize={4} color="purple.600" />
                          <Text fontWeight="semibold" fontSize="sm" color="gray.800">
                            {activity.subject}
                          </Text>
                          <Badge colorScheme={getPriorityColor(activity.priority)} fontSize="xs">
                            {activity.priority}
                          </Badge>
                        </Flex>
                        {activity.description && (
                          <Text fontSize="xs" color="gray.600" noOfLines={1} mb={1}>
                            {activity.description}
                          </Text>
                        )}
                        <Flex align="center" gap={3} fontSize="xs" color="gray.500">
                          <Flex align="center" gap={1}>
                            <Icon as={Calendar} boxSize={3} />
                            <Text>{moment(activity.due_date).format('MMM DD, h:mm A')}</Text>
                          </Flex>
                          {activity.assigned_to_employee && (
                            <Flex align="center" gap={1}>
                              <Icon as={Users} boxSize={3} />
                              <Text>
                                {activity.assigned_to_employee.first_name} {activity.assigned_to_employee.last_name}
                              </Text>
                            </Flex>
                          )}
                        </Flex>
                      </Box>
                    </Flex>
                  ))
                )}
              </Box>
            </CardBody>
          </Card>
        </GridItem>

        {/* Recent Activity Feed */}
        <GridItem>
          <Card bg={bgCard} borderWidth="1px" borderColor={borderColor} shadow="sm" h="full" maxH="500px">
            <CardBody display="flex" flexDirection="column">
              <Heading size="md" color="gray.800" mb={4}>
                Recent Activity
              </Heading>
              <Box overflowY="auto" flex="1">
                {isRecentActivityLoading ? (
                  <Flex justify="center" align="center" h="200px">
                    <Spinner color="purple.500" />
                  </Flex>
                ) : recentActivity.length === 0 ? (
                  <Flex direction="column" align="center" justify="center" h="200px" color="gray.400">
                    <Icon as={Clock} boxSize={12} mb={2} />
                    <Text fontSize="sm">No recent activity</Text>
                  </Flex>
                ) : (
                  recentActivity.map((activity, idx) => (
                    <Flex
                      key={activity.id}
                      gap={3}
                      py={3}
                      borderBottomWidth={idx < recentActivity.length - 1 ? '1px' : '0'}
                      borderColor={borderColor}
                    >
                      <Avatar size="sm" name={activity.user.name} bg="purple.500" color="white" />
                      <Box flex="1">
                        <Text fontSize="sm" color="gray.800" fontWeight="medium" mb={1}>
                          {activity.user.name}{' '}
                          <Text as="span" fontWeight="normal" color="gray.600">
                            {activity.title.toLowerCase()}
                          </Text>
                        </Text>
                        <Text fontSize="xs" color="gray.600" noOfLines={2} mb={1}>
                          {activity.description}
                        </Text>
                        <Flex align="center" gap={2}>
                          <Text fontSize="xs" color="gray.400">
                            {moment(activity.timestamp).fromNow()}
                          </Text>
                          {activity.related_entity && (
                            <>
                              <Text fontSize="xs" color="gray.300">
                                •
                              </Text>
                              <Text fontSize="xs" color="purple.600" fontWeight="medium">
                                {activity.related_entity.name}
                              </Text>
                            </>
                          )}
                        </Flex>
                      </Box>
                    </Flex>
                  ))
                )}
              </Box>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Key Accounts */}
      <Card bg={bgCard} borderWidth="1px" borderColor={borderColor} shadow="sm">
        <CardBody>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md" color="gray.800">
              Key Accounts
            </Heading>
            <Button
              as={RouterLink}
              to="/companies"
              size="sm"
              variant="ghost"
              colorScheme="purple"
              rightIcon={<Icon as={ArrowUpRight} />}
            >
              View All Companies
            </Button>
          </Flex>
          {isKeyAccountsLoading ? (
            <Flex justify="center" align="center" h="200px">
              <Spinner color="purple.500" />
            </Flex>
          ) : keyAccounts.length === 0 ? (
            <Flex direction="column" align="center" justify="center" h="200px" color="gray.400">
              <Icon as={Users} boxSize={12} mb={2} />
              <Text fontSize="sm">No key accounts yet</Text>
            </Flex>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Company</Th>
                    <Th isNumeric>Total Deal Value</Th>
                    <Th isNumeric>Active Deals</Th>
                    <Th isNumeric>Won Deals</Th>
                    <Th>Account Owner</Th>
                    <Th>Last Activity</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {keyAccounts.map(account => (
                    <Tr key={account.company_id} _hover={{ bg: 'gray.50' }}>
                      <Td>
                        <Flex align="center" gap={3}>
                          <Avatar size="sm" name={account.company_name} src={account.logo_url} />
                          <Text fontWeight="semibold" fontSize="sm" color="gray.800">
                            {account.company_name}
                          </Text>
                        </Flex>
                      </Td>
                      <Td isNumeric>
                        <Text fontWeight="bold" fontSize="sm" color="green.600">
                          ${account.total_deal_value.toLocaleString()}
                        </Text>
                      </Td>
                      <Td isNumeric>
                        <Badge colorScheme="blue">{account.active_deals_count}</Badge>
                      </Td>
                      <Td isNumeric>
                        <Badge colorScheme="green">{account.won_deals_count}</Badge>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="gray.600">
                          {account.account_owner_name || 'Unassigned'}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="xs" color="gray.500">
                          {account.last_activity_date ? moment(account.last_activity_date).fromNow() : 'N/A'}
                        </Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>
    </Box>
  );
};

export default SalesDashboard;