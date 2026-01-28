// Hrumbles-Front-End_UI\src\layouts\MainLayout.jsx
import { Box, Flex, IconButton, Input, InputGroup, InputLeftElement, Avatar, Menu, MenuButton, MenuList, MenuItem, useColorMode, Text, useMediaQuery, Badge, Spinner, Image } from "@chakra-ui/react";
import { FiSearch, FiBell, FiSun, FiLogOut, FiUser, FiMenu } from "react-icons/fi";
import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom"; 
import NewSidebar from "../components/Sidebar/NewSidebar"; 
import { signOut } from "../utils/api";
import { useSelector, useDispatch } from "react-redux"; 
import { logout, setLoggingOut } from "../Redux/authSlice";
import { useActivityTracker } from "../hooks/useActivityTracker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isSameDay } from "date-fns";
import { CreditBalanceDisplay } from "./CreditBalanceDisplay";
import SubscriptionLockModal from "../layouts/SubscriptionLockModal";

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

   // NEW STATE: Track subscription status locally for UI locking
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);

    // MODIFICATION: State to hold organization credit details
  const [orgCredits, setOrgCredits] = useState(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);

  // NEW: Reactive activeSuite state with localStorage listener
  const [activeSuite, setActiveSuite] = useState(() => localStorage.getItem('activeSuite') || 'HIRING SUITE');

  // NEW: Listen for localStorage changes to update logo reactively
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'activeSuite') {
        setActiveSuite(e.newValue || 'HIRING SUITE');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for same-tab changes (localStorage doesn't trigger on same tab, so poll or use custom event)
    const interval = setInterval(() => {
      const stored = localStorage.getItem('activeSuite');
      if (stored !== activeSuite) {
        setActiveSuite(stored || 'HIRING SUITE');
      }
    }, 100); // Poll every 100ms for reactivity

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [activeSuite]);

  // NEW: Function to determine logo based on suite
  const getLogoSrc = (suite) => {
    const s = suite?.toUpperCase();
    if (s?.includes("RECRUIT") || s?.includes("HIRING")) return "/xrilic/Xrilic Recruit.svg";
    if (s?.includes("PROJECT")) return "/xrilic/Xrilic Recruit.svg";
    if (s?.includes("VERIFICATION")) return "/xrilic/Xrilic Verify Black.svg";
    if (s?.includes("SALES")) return "/xrilic/Xrilic CRM.svg";
    if (s?.includes("FINANCE")) return "/xrilic/Xrilic Books.svg";
    return "/xrilic/Xrilic logo.svg";
  };

   useActivityTracker({ inactivityThreshold: 300000 }); 

  console.log("userrrrrrrr", user);

  // --- 1. DEFINE LOGOUT FUNCTION WITH MEMOIZATION ---
  // We wrap this in useCallback so we can use it inside useEffect dependencies
  const handleLogout = useCallback(async () => {
    dispatch(setLoggingOut(true));
    
    try {
      // 1. Log the activity
      if (user?.id && organizationId) {
        /* Your log logic here (omitted for brevity, keeping your existing logic) */
        // await logUserActivity(...) 
      }

      // 2. Sign out from Supabase (Invalidates session on server & client)
      await supabase.auth.signOut();
      
      // 3. Clear Redux
      dispatch(logout());

      // 4. AGGRESSIVELY Clear Local Storage
      // This loops through all keys and removes anything related to Supabase
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.clear(); // Clear everything else
      sessionStorage.clear();

    } catch (error) {
      console.error("Error during logout:", error);
      // Fallback cleanup
      localStorage.clear();
      sessionStorage.clear();
    } finally {
      // 5. Force redirect
      navigate("/login", { replace: true });
    }
  }, [dispatch, navigate, user?.id, organizationId]);


  const logUserActivity = async (
    userId, // No type annotation here as it's a .jsx file, not .tsx
    organizationId,
    eventType,
    details = {} // Default to empty object if no details are provided
  ) => {
    try {
      // Ensure we have essential data before attempting to log
      if (!userId || !organizationId) {
        console.warn("Skipping activity log: Missing userId or organizationId.");
        return;
      }

      const { error } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          event_type: eventType,
          ip_address: details.ip_address,
          ipv6_address: details.ipv6_address,
          city: details.city,
          country: details.country,
          latitude: details.latitude,
          longitude: details.longitude,
          device_info: details.device_info || navigator.userAgent, // Capture user agent
          details: details.errorMessage ? { errorMessage: details.errorMessage } : null, // Store error message for failed logins
        });

      if (error) {
        console.error("Error logging user activity:", error.message);
      } else {
        console.log(`User activity '${eventType}' logged successfully for user ${userId}.`);
      }
    } catch (err) {
      console.error("Unexpected error logging user activity:", err);
    }
  };

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

  // --- NEW: Check Initial Subscription Status & Listen for Changes ---
  useEffect(() => {
    if (!organizationId) return;

    // 1. Initial Check Function
    const checkSubscription = async () => {
      const { data } = await supabase
        .from('hr_organizations')
        .select('subscription_status')
        .eq('id', organizationId)
        .single();
      
      if (data) {
        const expired = data.subscription_status === 'expired' || data.subscription_status === 'inactive';
        setIsSubscriptionExpired(expired);
        
        // If expired and NOT superadmin, force logout immediately
        if (expired && role !== 'organization_superadmin' && role !== 'global_superadmin') {
            handleLogout();
        }
      }
    };

    checkSubscription();

    // 2. Realtime Listener for Organization Changes
    const orgChannel = supabase
      .channel(`org-status-check:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hr_organizations',
          filter: `id=eq.${organizationId}`,
        },
        (payload) => {
          const newStatus = payload.new.subscription_status;
          console.log("Organization Subscription Updated:", newStatus);
          
          const expired = newStatus === 'expired' || newStatus === 'inactive';
          setIsSubscriptionExpired(expired);

          // Force logout for non-superadmins immediately upon realtime update
          if (expired && role !== 'organization_superadmin' && role !== 'global_superadmin') {
             toast.error("Organization subscription has expired.");
             handleLogout();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orgChannel);
    };
  }, [organizationId, role, handleLogout]);

// --- 2. UPDATED REAL-TIME LISTENER ---
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`employee-status-channel:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hr_employees',
          filter: `id=eq.${user.id}`, 
        },
        async (payload) => { // Make async
          console.log('Realtime update:', payload);
          const updatedEmployee = payload.new;
          
          if (updatedEmployee.status !== 'active') {
            console.log(`User inactive. Forcing logout.`);
            toast.warning("Your account is disabled. Please contact your administrator.");

            // ✅ CRITICAL FIX: Call the full handleLogout function, 
            // do not just dispatch(logout) or the token remains.
            await handleLogout(); 
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [user?.id, handleLogout]); // Add handleLogout to dependency


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

  const headerHeight = "70px";
  const expandedSidebarWidth = "210px";
  const collapsedSidebarWidth = "74px";
  const mainSidebarWidth = isSidebarExpanded ? expandedSidebarWidth : collapsedSidebarWidth;

  const toggleSidebar = () => {
    setSidebarExpanded(!isSidebarExpanded);
  };

  return (
    <Flex direction="column" height="100vh" overflow="hidden" bg={colorMode === "dark" ? "gray.800" : "#F8F7F7"}>

      <SubscriptionLockModal isOpen={isSubscriptionExpired && role === 'organization_superadmin'} />

      {/* NEW: Full-width Header */}
      <Flex
        as="header"
        align="center"
        justify="space-between"
        w="100%"
        height={headerHeight}
        p={4}
        bg={colorMode === "dark" ? "base.bgdark" : "white"}
        boxShadow="sm"
        zIndex={10}
      >
        {/* Logo */}
        <Image 
          key={activeSuite} // NEW: Key to force re-render on suite change
          src={getLogoSrc(activeSuite)} 
          alt="Logo" 
          width={{ base: "100px", md: "140px" }} 
          height="auto"
          mr={4}
          transition="opacity 0.2s ease-in-out" // NEW: Smooth transition for logo change
        />

        {/* Mobile Menu and Search */}
        <Flex align="center" gap={2} flex="1" justify="center">
          {isMobile && (
            <IconButton
              icon={<FiMenu />}
              aria-label="Toggle Sidebar"
              onClick={toggleSidebar}
              variant="ghost"
            />
          )}
          {/* <InputGroup width={{ base: "150px", md: "20em" }} height="2.5em">
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.500" />
            </InputLeftElement>
            <Input
              placeholder="Search..."
              bg={colorMode === "dark" ? "box.bgboxdark" : "box.bgboxlight"}
              borderRadius="50px"
              _placeholder={{ color: "gray.500" }}
            />
          </InputGroup> */}
        </Flex>

        {/* Right-side elements */}
        <Flex align="center" gap={4}>
          {role === 'organization_superadmin' && <CreditBalanceDisplay />}
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
          {/* <IconButton
            icon={<FiSun />}
            aria-label="Toggle theme"
            variant="ghost"
            size="lg"
            color={colorMode === "dark" ? "yellow.400" : "base.greylg"}
            onClick={toggleColorMode}
          /> */}
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

      {/* NEW: Container for Sidebar and Main Content below Header */}
      <Flex flex="1" overflow="hidden">
        {/* Mobile Overlay */}
        {isMobile && isSidebarExpanded && (
          <Box
            position="fixed"
            top={headerHeight}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.600"
            zIndex={15}
            onClick={toggleSidebar}
          />
        )}
        
        {/* Sidebar - Adjusted to start below header */}
        <NewSidebar 
          isExpanded={isSidebarExpanded} 
          toggleSidebar={toggleSidebar}
          headerHeight={headerHeight}
          mainSidebarWidth={mainSidebarWidth}
        />

        {/* Main Content */}
        <Box 
          flex="1" 
          overflowY="auto" 
          p={1} 
          bg={colorMode} 
          overflowX="hidden" 
          w="100%" 
          maxW="100%"
          ml={{ base: isMobile ? "0" : mainSidebarWidth, md: mainSidebarWidth }}
          transition="margin-left 0.1s ease-in-out"
        >
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};

export default MainLayout;