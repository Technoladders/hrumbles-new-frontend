import { Box, Flex, IconButton, Input, InputGroup, InputLeftElement, Avatar, Menu, MenuButton, MenuList, MenuItem, useColorMode, Text, useMediaQuery, Badge, Spinner } from "@chakra-ui/react";
import { FiSearch, FiBell, FiSun, FiLogOut, FiUser, FiMenu } from "react-icons/fi";
import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom"; 
import NewSidebar from "../components/Sidebar/NewSidebar"; 
import { signOut } from "../utils/api";
import { useSelector, useDispatch } from "react-redux"; 
import { logout } from "../Redux/authSlice";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isSameDay } from "date-fns";

const MainLayout = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const [isSidebarExpanded, setSidebarExpanded] = useState(!isMobile);
  const [interviews, setInterviews] = useState([]);
  const [hasTodayInterview, setHasTodayInterview] = useState(false);
  
  // MODIFICATION: Get role and organization_id from Redux store
  const user = useSelector((state) => state.auth.user);
  const role = useSelector((state) => state.auth.role);
  const organizationId = useSelector((state) => state.auth.organization_id);

    // MODIFICATION: State to hold organization credit details
  const [orgCredits, setOrgCredits] = useState(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);

  console.log("userrrrrrrr", user);

  useEffect(() => {
    setSidebarExpanded(!isMobile);
  }, [isMobile]);

  // MODIFICATION: New useEffect to fetch organization credit data
  useEffect(() => {
    const fetchOrganizationCredits = async () => {
      // Only run this for the specified role
      if (role !== 'organization_superadmin' || !organizationId) {
        setIsLoadingCredits(false);
        return;
      }

      try {
        setIsLoadingCredits(true);
        // Fetch credit limits and user counts in parallel
        const [orgDetails, employees] = await Promise.all([
          supabase
            .from('hr_organizations')
            .select('role_credit_limits')
            .eq('id', organizationId)
            .single(),
          supabase
            .from('hr_employees')
            .select('id, hr_roles(name)')
            .eq('organization_id', organizationId)
        ]);

        if (orgDetails.error) throw orgDetails.error;
        if (employees.error) throw employees.error;

        const limits = orgDetails.data.role_credit_limits;

        // Calculate current user counts for each role
        const counts = employees.data.reduce((acc, employee) => {
          const roleName = employee.hr_roles?.name;
          if (roleName) {
            acc[roleName] = (acc[roleName] || 0) + 1;
          }
          return acc;
        }, {});

        // Combine limits and counts into a single object for easy rendering
        const combinedCredits = Object.keys(limits).reduce((acc, roleName) => {
          acc[roleName] = {
            limit: limits[roleName],
            count: counts[roleName] || 0
          };
          return acc;
        }, {});

        setOrgCredits(combinedCredits);

      } catch (error) {
        console.error("Error fetching organization credits:", error);
        toast.error("Could not load user credit details.");
      } finally {
        setIsLoadingCredits(false);
      }
    };

    fetchOrganizationCredits();
  }, [role, organizationId]); // Rerun if role or org ID changes

  // MODIFICATION: Add a new useEffect for the real-time status listener
  useEffect(() => {
    // Ensure we have a user before subscribing
    if (!user?.id) return;

    // Define the channel and subscription
    const channel = supabase
      .channel(`employee-status-channel:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hr_employees',
          filter: `id=eq.${user.id}`, // Only listen for changes to the currently logged-in user
        },
        (payload) => {
          console.log('Received a real-time update for the current user:', payload);
          
          const updatedEmployee = payload.new;
          
          // Check if the user's status is no longer 'active'
          if (updatedEmployee.status !== 'active') {
            console.log(`User status changed to "${updatedEmployee.status}". Forcing logout.`);
            
            // Show a toast message to inform the user
            toast.warning("Your account is disabled. Please contact your administrator.");

            // Dispatch the logout action and redirect
            dispatch(logout());
            navigate("/login");
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Realtime channel subscribed for user: ${user.id}`);
        }
        if (err) {
          console.error('Realtime subscription error:', err);
        }
      });

    // IMPORTANT: Cleanup function to unsubscribe when the component unmounts or the user changes
    return () => {
      console.log('Unsubscribing from realtime channel.');
      supabase.removeChannel(channel);
    };

  }, [user, dispatch, navigate]); // Rerun this effect if the user object changes


  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        if (!user?.id || !user?.user_metadata?.first_name || !user?.user_metadata?.last_name) {
          throw new Error("User data incomplete");
        }

        const fullName = `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;

        const { data: candidatesData, error: candidatesError } = await supabase
          .from("hr_job_candidates")
          .select("name, interview_date, interview_time, interview_location, interview_type, round")
          .eq("main_status_id", "f72e13f8-7825-4793-85e0-e31d669f8097")
          .eq("applied_from", fullName)
          .not("interview_date", "is", null);

        if (candidatesError) {
          throw new Error(`Failed to fetch interviews: ${candidatesError.message}`);
        }

        const currentDate = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(currentDate.getTime() + istOffset);
        const upcomingInterviews = candidatesData
          .filter((candidate) => {
            if (!candidate.interview_date) return false;
            const interviewDateTime = new Date(
              `${candidate.interview_date}T${candidate.interview_time || "00:00:00"}+05:30`
            );
            return interviewDateTime >= currentDate;
          })
          .map((candidate) => ({
            name: candidate.name,
            interview_date: candidate.interview_date,
            interview_time: candidate.interview_time,
            interview_location: candidate.interview_location,
            interview_type: candidate.interview_type,
            round: candidate.round,
          }));

        setInterviews(upcomingInterviews);

        const today = new Date("2025-05-20T21:23:00+05:30");
        const hasInterviewToday = upcomingInterviews.some((interview) =>
          isSameDay(new Date(interview.interview_date), today)
        );
        setHasTodayInterview(hasInterviewToday);
      } catch (error) {
        console.error("Error fetching interviews:", error.message);
        toast.error("Failed to load interviews");
        setInterviews([]);
        setHasTodayInterview(false);
      }
    };

    if (user?.id) {
      fetchInterviews();
    }
  }, [user?.id]);

  const roleDisplayNameMap = {
  organization_superadmin: 'Super Admin',
  admin: 'Admin', // Changed to "Admins" to match the plural context, but you can change it back to "Admin" if you prefer
  employee: 'Users',
};

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const formatInterviewDate = (date) => {
    const interviewDate = new Date(date);
    const options = { month: "short", day: "numeric" };
    return interviewDate.toLocaleDateString("en-US", options);
  };

  const formatInterviewTime = (time) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const expandedSidebarWidth = "250px";
  const collapsedSidebarWidth = "80px";
  const mainSidebarWidth = isSidebarExpanded ? expandedSidebarWidth : collapsedSidebarWidth;

  const toggleSidebar = () => {
    setSidebarExpanded(!isSidebarExpanded);
  };

  return (
    <Flex height="100vh" overflow="hidden" bg={colorMode === "dark" ? "gray.800" : "gray.50"}>
      {isMobile && isSidebarExpanded && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          zIndex={15}
          onClick={toggleSidebar}
        />
      )}
      
      <NewSidebar isExpanded={isSidebarExpanded} toggleSidebar={toggleSidebar} />

      <Flex 
        direction="column" 
        flex="1" 
        ml={{ base: isMobile ? "0" : mainSidebarWidth, md: mainSidebarWidth }}
        transition="margin-left 0.2s ease-in-out"
      >
        <Flex
          as="header"
          align="center"
          justify="space-between"
          w={{
            base: "100%",
            md: `calc(100% - ${mainSidebarWidth})`
          }}
          position="fixed"
          top={0}
          p={4}
          height="70px"
          bg={colorMode === "dark" ? "base.bgdark" : "white"}
          zIndex={10}
          transition="width 0.2s ease-in-out"
          boxShadow="sm"
        >
          <Flex align="center" gap={2}>
            {isMobile && (
              <IconButton
                icon={<FiMenu />}
                aria-label="Toggle Sidebar"
                onClick={toggleSidebar}
                variant="ghost"
              />
            )}
            <InputGroup width={{ base: "150px", md: "20em" }} height="2.5em">
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray.500" />
              </InputLeftElement>
              <Input
                placeholder="Search..."
                bg={colorMode === "dark" ? "box.bgboxdark" : "box.bgboxlight"}
                borderRadius="50px"
                _placeholder={{ color: "gray.500" }}
              />
            </InputGroup>
          </Flex>

          <Flex align="center" gap={4}>

             {role === 'organization_superadmin' && (
              <Flex 
                align="center" 
                gap={4} // Increased gap for better spacing between vertical blocks
                display={{ base: "none", lg: "flex" }} 
                bg={colorMode === 'dark' ? 'gray.700' : 'gray.100'}
                px={3} // Use padding on X-axis
                py={1} // Use padding on Y-axis
                borderRadius="md"
              >
                <Text fontSize="sm" fontWeight="bold" alignSelf="center">Subscription:</Text>
                {isLoadingCredits ? (
                  <Spinner size="sm" />
                ) : (
                  orgCredits && Object.entries(orgCredits).map(([roleName, data]) => (
                    data.limit > 0 && (
                      // MODIFICATION: Changed Flex direction and content
                      <Flex 
                        key={roleName} 
                        direction="column" // Stack items vertically
                        align="center"     // Center them horizontally
                      >
                        <Text fontSize="xs" fontWeight="medium">
                          {/* Use the map to get the display name, with a fallback */}
                          {roleDisplayNameMap[roleName] || roleName}
                        </Text>
                        <Badge 
                          colorScheme={data.count >= data.limit ? "red" : "green"}
                          variant="solid"
                          fontSize="xs"
                          w="full" // Make badge take full width of the flex container
                          textAlign="center"
                        >
                          {data.count}/{data.limit}
                        </Badge>
                      </Flex>
                    )
                  ))
                )}
              </Flex>
            )}
            <Menu>
              <MenuButton
                as={IconButton}
                icon={
                  <Box position="relative">
                    <FiBell />
                    {hasTodayInterview && (
                      <Box
                        position="absolute"
                        top="-2px"
                        right="-2px"
                        width="8px"
                        height="8px"
                        bg="red.500"
                        borderRadius="full"
                        border="1px solid"
                        borderColor={colorMode === "dark" ? "base.bgdark" : "white"}
                      />
                    )}
                  </Box>
                }
                size="lg"
                aria-label="Notifications"
                variant="ghost"
                color={colorMode === "dark" ? "white" : "base.greylg"}
              />
              <MenuList maxW="300px" p={2}>
                {interviews.length > 0 ? (
                  interviews.map((interview, index) => (
                    <MenuItem key={index} bg="transparent" _hover={{ bg: "gray.100" }} p={2}>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" isTruncated>
                          {interview.name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {formatInterviewDate(interview.interview_date)} at{" "}
                          {formatInterviewTime(interview.interview_time)}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {interview.interview_location || "N/A"}
                        </Text>
                        <Text fontSize="xs" color="blue.600">
                          {interview.interview_type || "N/A"} - {interview.round || "N/A"}
                        </Text>
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem bg="transparent" p={2}>
                    <Text fontSize="sm" color="gray.500">No upcoming interviews.</Text>
                  </MenuItem>
                )}
              </MenuList>
            </Menu>
            <IconButton
              icon={<FiSun />}
              aria-label="Toggle theme"
              variant="ghost"
              size="lg"
              color={colorMode === "dark" ? "yellow.400" : "base.greylg"}
              onClick={toggleColorMode}
            />
            <Menu>
              <MenuButton>
                <Flex align="center" gap={4}>
                  <Box textAlign="left" display={{ base: "none", md: "block" }}>
                    <Text fontSize="sm" fontWeight="bold">{`${user?.user_metadata?.first_name || "User"} ${user?.user_metadata?.last_name || "Name"}`}</Text>
                    <Text fontSize="xs" color="gray.500">{user?.email || "user@example.com"}</Text>
                  </Box>
                  <Avatar size="sm" name={`${user?.user_metadata?.first_name || "User"} ${user?.user_metadata?.last_name || "Name"}`} src="/user-avatar.png" />
                </Flex>
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => navigate("/profile")} icon={<FiUser />}>View Profile</MenuItem>
                <MenuItem onClick={handleLogout} icon={<FiLogOut />}>Logout</MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>

        <Box flex="1" overflowY="auto" p={6} mt="60px" bg={colorMode}>
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};

export default MainLayout;