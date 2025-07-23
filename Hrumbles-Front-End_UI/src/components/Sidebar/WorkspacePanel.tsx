// src/components/Sidebar/NewSidebar.jsx

import {
  VStack, IconButton, Tooltip, Box, Text, Flex, Icon, Image,
  Collapse, Spacer, useMediaQuery, HStack, Avatar, useDisclosure,
  Button, Spinner
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { logout } from "../../Redux/authSlice";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { menuItemsByRole } from "./SidebarMenuItem";
import { ArrowRightFromLine, ArrowLeftToLine, PlusCircle, Inbox } from 'lucide-react';
import { supabase } from "../../integrations/supabase/client";
import { useQuery } from '@tanstack/react-query';
import { setSelectedWorkspace, setSelectedFile, setViewUnfiled } from '../../Redux/workspaceSlice';
import { useWorkspaces } from '../../hooks/sales/useWorkspaces';
import { useWorkspaceFiles } from '../../hooks/sales/useWorkspaceFiles';
import { AddWorkspaceItemDialog } from './AddWorkspaceItemDialog';

// Hook to get the count of unfiled contacts
const useUnfiledContactsCount = () => {
    const organization_id = useSelector((state) => state.auth.organization_id);
    return useQuery({
        queryKey: ['unfiledContactsCount', organization_id],
        queryFn: async () => {
            const { count, error } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('organization_id', organization_id).is('file_id', null);
            if (error) return 0;
            return count;
        },
        enabled: !!organization_id,
    });
};

// Component for the Workspace UI, to be nested inside the sidebar
const SalesSuiteContent = () => {
    const dispatch = useDispatch();
    const { selectedWorkspaceId, selectedFileId, viewingMode } = useSelector((state) => state.workspace);
    const { data: unfiledCount = 0 } = useUnfiledContactsCount();
    const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useWorkspaces();
    const { data: files = [], isLoading: isLoadingFiles } = useWorkspaceFiles(selectedWorkspaceId);
    const { isOpen: isAddDialogOpen, onOpen: onOpenAddDialog, onClose: onCloseAddDialog } = useDisclosure();
    const [dialogItemType, setDialogItemType] = useState('workspace');

    const openAddWorkspaceDialog = () => { setDialogItemType('workspace'); onOpenAddDialog(); };
    const openAddFileDialog = (e) => { e.stopPropagation(); setDialogItemType('file'); onOpenAddDialog(); };
    const handleSelectWorkspace = (id) => { dispatch(setSelectedWorkspace(id)); };
    const handleSelectFile = (id) => { dispatch(setSelectedFile(id)); };
    const handleViewUnfiled = () => { dispatch(setViewUnfiled()); };

    const activeBg = "#7B43F1";
    const hoverBg = "#4A5568";

    return (
        <>
            <Box p={2} bg="rgba(0,0,0,0.1)" borderRadius="md" mt={2}> 
                <Flex align="center" justify="space-between" mb={4}>
                    <Text fontSize="md" fontWeight="bold" color="white">Workspaces</Text>
                    <IconButton variant="ghost" size="sm" onClick={openAddWorkspaceDialog} aria-label="Add Workspace" icon={<Icon as={PlusCircle} boxSize={5} color="gray.300" />} _hover={{bg: hoverBg}} />
                </Flex>
                {unfiledCount > 0 && (
                     <Box w="full" mb={2}>
                        <Button
                            justifyContent="space-between" w="full" variant={viewingMode === 'unfiled' ? 'solid' : 'ghost'}
                            colorScheme={viewingMode === 'unfiled' ? 'purple' : 'gray'} bg={viewingMode === 'unfiled' ? activeBg : 'transparent'}
                            _hover={{bg: hoverBg}} leftIcon={<Icon as={Inbox} boxSize={5} />} onClick={handleViewUnfiled}
                        >
                            Unfiled
                            <Text as="span" bg="blue.500" color="white" fontSize="xs" fontWeight="bold" px={2} borderRadius="full">{unfiledCount}</Text>
                        </Button>
                    </Box>
                )}
                <VStack spacing={1} align="stretch" flex="1" overflowY="auto"
                    css={{ "&::-webkit-scrollbar": { display: "none" }, "scrollbar-width": "none" }}
                >
                    {isLoadingWorkspaces && <Flex justify="center" p={4}><Spinner size="md" color="white" /></Flex>}
                    {workspaces.map(ws => (
                        <Box key={ws.id} w="full">
                            <Button justifyContent="start" w="full" textAlign="left" variant={'ghost'} bg={selectedWorkspaceId === ws.id ? activeBg : 'transparent'}
                                _hover={{bg: selectedWorkspaceId !== ws.id && hoverBg}} onClick={() => handleSelectWorkspace(ws.id)} fontWeight="medium">
                                {ws.name}
                            </Button>
                            {selectedWorkspaceId === ws.id && (
                                <VStack pl={4} mt={1} spacing={1} align="start">
                                    {isLoadingFiles && <Text fontSize="xs" color="gray.400" pl={3} py={1}>Loading files...</Text>}
                                    {files.map(file => (
                                        <Button key={file.id} justifyContent="start" size="sm" w="full" fontWeight="normal" variant={'ghost'}
                                            bg={selectedFileId === file.id ? "rgba(123, 67, 241, 0.5)" : 'transparent'}
                                            _hover={{bg: selectedFileId !== file.id && hoverBg}} onClick={() => handleSelectFile(file.id)}>
                                            {file.name}
                                        </Button>
                                    ))}
                                    <Button variant="link" size="sm" color="gray.300" _hover={{color: 'white'}}
                                        leftIcon={<Icon as={PlusCircle} boxSize={3}/>} fontWeight="normal" onClick={openAddFileDialog}>
                                        Add File
                                    </Button>
                                </VStack>
                            )}
                        </Box>
                    ))}
                </VStack>
            </Box>
            <AddWorkspaceItemDialog isOpen={isAddDialogOpen} onClose={onCloseAddDialog} itemType={dialogItemType} workspaceId={selectedWorkspaceId} />
        </>
    );
};

// Standard menu item component for non-special items
const StandardMenuItem = ({ item, isExpanded, location }) => {
    const { icon, label, path } = item;
    const isActive = location.pathname.startsWith(path);
    const hoverBg = "#4A5568";
    const activeBg = "#7B43F1";

    return (
        <Tooltip label={label} placement="right" isDisabled={isExpanded}>
            <Flex
                as={Link} to={path} align="center" p={3} borderRadius="lg"
                role="group" cursor="pointer" bg={isActive ? activeBg : "transparent"}
                color={"white"} _hover={{ bg: !isActive && hoverBg }}
                transition="background 0.2s, color 0.2s"
            >
                <Icon as={icon} fontSize="22px" />
                {isExpanded && <Text ml={4} fontWeight="medium">{label}</Text>}
            </Flex>
        </Tooltip>
    );
};

// --- Main NewSidebar Component ---
const NewSidebar = ({ isExpanded, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
    const [isMobile] = useMediaQuery("(max-width: 768px)");
  const { role, user } = useSelector((state) => state.auth);
  
  const [departmentName, setDepartmentName] = useState("Unknown Department");
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const { isOpen: isProfileMenuOpen, onToggle: toggleProfileMenu } = useDisclosure();
  
  // State to specifically control the visibility of the workspace sub-menu
  const [isWorkspaceVisible, setIsWorkspaceVisible] = useState(false);

  const bgColor = "#364153";
  const activeBg = "#7B43F1";
  const hoverBg = "#4A5568";
  
  const [activeSuite, setActiveSuite] = useState(() => localStorage.getItem('activeSuite') || "HR Suite");
  const menuConfig = role === "employee" || role === "admin" ? menuItemsByRole[role](departmentName) : menuItemsByRole[role] || [];
  const isCategorized = role === 'organization_superadmin' || (role === 'admin' && departmentName !== "Finance");

  const findSuiteForPath = (pathname) => {
    if (!isCategorized) return null;
    for (const suite of menuConfig) {
      if (!suite.items) continue;
      const hasMatchingItem = suite.items.some(
        item => pathname.startsWith(item.path) && item.path !== '/'
      );
      if (hasMatchingItem) return suite.title;
    }
    return null; // Return null if no match, so it doesn't wrongly switch
  };
  
  const getDefaultPathForSuite = (suiteTitle) => {
    const suite = menuConfig.find(s => s.title === suiteTitle);
    return suite?.items?.[0]?.path || '/dashboard';
  };

  // Dummy useEffects for data fetching - replace with your actual implementation
  useEffect(() => { /* Fetch employee profile */ }, [user?.id]);
  useEffect(() => { /* Fetch department name */ }, [user?.id, role]);

  useEffect(() => {
    if (isCategorized && menuConfig.length > 0) {
      const newSuite = findSuiteForPath(location.pathname);
      if (newSuite && newSuite !== activeSuite) {
        setActiveSuite(newSuite);
        localStorage.setItem('activeSuite', newSuite);
      }
    }
  }, [location.pathname, menuConfig, activeSuite, isCategorized]);
  
  // Effect to automatically open the workspace sub-menu if the URL is relevant
  useEffect(() => {
    if (location.pathname.startsWith('/contacts')) {
        setIsWorkspaceVisible(true);
    }
  }, [location.pathname]);

  const itemsToRender = isCategorized ? menuConfig.find(suite => suite.title === activeSuite)?.items || [] : menuConfig;

  const handleLogout = () => { dispatch(logout()); localStorage.removeItem('activeSuite'); navigate("/login"); };

  const handleSuiteChange = (suiteTitle) => {
    if (suiteTitle !== activeSuite) {
      setActiveSuite(suiteTitle);
      localStorage.setItem('activeSuite', suiteTitle);
      const currentSuite = findSuiteForPath(location.pathname);
      if (currentSuite !== suiteTitle) {
        navigate(getDefaultPathForSuite(suiteTitle));
      }
    }
  };

  const fullName = employeeProfile ? `${employeeProfile.firstName} ${employeeProfile.lastName}` : "User Name";

  return (
    <Flex
      direction="column" bg={bgColor} color={"white"} height="100vh"
      width={isExpanded ? "250px" : "80px"} transition="width 0.2s ease-in-out"
      position="fixed" left={0} top={0} p={isExpanded ? 4 : 2} zIndex={20}
    >
      <Flex align="center" mb={8} minH="40px" px={isExpanded ? 0 : 1}>
        {isExpanded && <Image src="/2-cropped.svg" alt="Logo" width="160px" />}
        <Spacer />
        {!isMobile && (
          <IconButton aria-label="Toggle Sidebar" icon={<Icon as={isExpanded ? ArrowLeftToLine : ArrowRightFromLine} />}
            variant="ghost" color="gray.400" _hover={{ bg: hoverBg, color: "white" }} onClick={toggleSidebar}
          />
        )}
      </Flex>
      
      <VStack spacing={2} align="stretch" flex="1" overflowY="auto" overflowX="hidden"
        css={{ "&::-webkit-scrollbar": { display: "none" }, "scrollbar-width": "none" }}
      >
        {isCategorized && isExpanded && (
          <Text px={3} py={2} fontSize="sm" fontWeight="bold" color="gray.400">{activeSuite || "Select a Suite"}</Text>
        )}

        {itemsToRender.map((item) => {
          // Special Case: The 'Contacts' item in the 'Sales Suite'
          if (activeSuite === 'Sales Suite' && item.label === 'Contacts') {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Box key={item.label} w="full">
                <Tooltip label={item.label} placement="right" isDisabled={isExpanded}>
                  <Flex
                    align="center" p={3} borderRadius="lg" role="group" cursor="pointer"
                    bg={isActive ? activeBg : "transparent"} _hover={{ bg: !isActive && hoverBg }}
                    onClick={() => { 
                        setIsWorkspaceVisible(!isWorkspaceVisible);
                        if (!isActive) navigate(item.path); // Navigate if not already active
                    }}
                  >
                    <Icon as={item.icon} fontSize="22px" />
                    {isExpanded && (
                      <Flex justify="space-between" align="center" w="full" ml={4}>
                        <Text fontWeight="medium">{item.label}</Text>
                        <Icon as={isWorkspaceVisible ? ChevronUpIcon : ChevronDownIcon} />
                      </Flex>
                    )}
                  </Flex>
                </Tooltip>
                
                {isExpanded && (
                  <Collapse in={isWorkspaceVisible} animateOpacity>
                    <SalesSuiteContent />
                  </Collapse>
                )}
              </Box>
            );
          } 
          // Default Case: All other menu items
          else {
            return (
              <StandardMenuItem key={item.label} item={item} isExpanded={isExpanded} location={location} />
            );
          }
        })}
      </VStack>

      <VStack spacing={2} align="stretch" mt={4}>
        {isExpanded && (
            <Box>
                <Flex align="center" p={2} bg="gray.700" borderRadius="lg" cursor="pointer" _hover={{ bg: "gray.600" }} onClick={toggleProfileMenu}>
                <Avatar size="sm" name={fullName} src={employeeProfile?.avatarUrl} />
                <Text ml={3} fontWeight="medium" noOfLines={1}>{fullName}</Text>
                <Spacer />
                <Icon as={isProfileMenuOpen ? ChevronUpIcon : ChevronDownIcon} />
                </Flex>
                <Collapse in={isProfileMenuOpen} animateOpacity>
                <VStack align="stretch" spacing={1} mt={2} pl={2}>
                    {departmentName !== "Finance" && (
                    <Text as={Link} to="/profile" p={2} borderRadius="md" _hover={{ bg: hoverBg }}>My Profile</Text>
                    )}
                    <Text onClick={handleLogout} p={2} borderRadius="md" cursor="pointer" _hover={{bg: hoverBg}}>Logout</Text>
                </VStack>
                </Collapse>
            </Box>
        )}
        {isCategorized && (
            <HStack justify="center" spacing={isExpanded ? 4 : 2} p={isExpanded ? 2 : 1} borderRadius="lg" bg="rgba(0,0,0,0.2)">
                {(menuConfig || []).map((suite) => (
                <Tooltip key={suite.title} label={suite.title} placement="top" isDisabled={isExpanded}>
                    <IconButton
                    aria-label={suite.title}
                    icon={<Icon as={suite.icon} fontSize="20px" />}
                    isRound size="md" bg={activeSuite === suite.title ? activeBg : 'transparent'}
                    color="white" _hover={{ bg: activeSuite !== suite.title && hoverBg }}
                    onClick={() => handleSuiteChange(suite.title)}
                    flex="1"
                    />
                </Tooltip>
                ))}
            </HStack>
        )}
      </VStack>
    </Flex>
  );
};

export default NewSidebar;




import { Box, Flex, IconButton, Input, InputGroup, InputLeftElement, Avatar, Menu, MenuButton, MenuList, MenuItem, useColorMode, Text, useMediaQuery } from "@chakra-ui/react";
import { FiSearch, FiBell, FiSun, FiLogOut, FiUser, FiMenu } from "react-icons/fi";
import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom"; 
import NewSidebar from "../components/Sidebar/NewSidebar"; 
// --- REMOVED: WorkspaceSidebar is no longer needed here ---
// import { WorkspaceSidebar } from "../components/Sidebar/WorkspaceSidebar";
import { useSelector, useDispatch } from "react-redux"; 
import { logout } from "../Redux/authSlice";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isSameDay, isAfter, parseISO } from "date-fns";

const MainLayout = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation(); // Use location hook

  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const [isSidebarExpanded, setSidebarExpanded] = useState(!isMobile);
  const [interviews, setInterviews] = useState([]);
  const [hasTodayInterview, setHasTodayInterview] = useState(false);

  const user = useSelector((state) => state.auth.user);

  // --- REMOVED: State for the second sidebar is no longer needed ---
  // const [showWorkspaceSidebar, setShowWorkspaceSidebar] = useState(false);

  // Update sidebar state if screen size changes
  useEffect(() => {
    setSidebarExpanded(!isMobile);
  }, [isMobile]);
  
  // --- REFACTORED & CORRECTED: Fetch interviews for the logged-in employee
  useEffect(() => {
    if (!user?.id) return;

    const fetchInterviews = async () => {
      try {
        // Fetching by a unique user ID is more robust than by name.
        const { data, error } = await supabase
          .from("hr_job_candidates")
          .select("name, interview_date, interview_time, interview_location, interview_type, round")
          .eq("main_status_id", "f72e13f8-7825-4793-85e0-e31d669f8097")
          .eq("interviewer_id", user.id) // CORRECT: Use user ID
          .not("interview_date", "is", null);

        if (error) throw new Error(`Failed to fetch interviews: ${error.message}`);

        const now = new Date(); // CORRECT: Use current date
        const upcomingInterviews = data
          .filter(candidate => {
            if (!candidate.interview_date) return false;
            const interviewDateTime = parseISO(`${candidate.interview_date}T${candidate.interview_time || "00:00:00"}`);
            return isAfter(interviewDateTime, now);
          })
          .map(candidate => ({ ...candidate }));

        setInterviews(upcomingInterviews);

        const hasInterviewToday = upcomingInterviews.some(interview =>
          isSameDay(parseISO(interview.interview_date), now)
        );
        setHasTodayInterview(hasInterviewToday);
      } catch (error) {
        console.error("Error fetching interviews:", error.message);
        toast.error("Failed to load interviews");
      }
    };

    fetchInterviews();
  }, [user?.id]);

  // Handle Logout Function
  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('activeSuite'); // Also clear suite preference on logout
    navigate("/login");
  };
  
  // Format interview date as "MMM D"
  const formatInterviewDate = (date) => {
    if (!date) return "N/A";
    return parseISO(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Format interview time as "h:mm A"
  const formatInterviewTime = (time) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const toggleSidebar = () => {
    setSidebarExpanded(!isSidebarExpanded);
  };

  // --- SIMPLIFIED: Layout calculations for a single sidebar ---
  const expandedSidebarWidth = "250px";
  const collapsedSidebarWidth = "80px";
  const mainSidebarWidth = isSidebarExpanded ? expandedSidebarWidth : collapsedSidebarWidth;
  
  // --- REMOVED: useEffect for showing workspace sidebar is no longer needed ---
  // --- REMOVED: Complex margin calculation is no longer needed ---

  return (
    <Flex height="100vh" overflow="hidden" bg={colorMode === "dark" ? "gray.800" : "gray.50"}>
      {/* --- Mobile-only Overlay for the main sidebar --- */}
      {isMobile && isSidebarExpanded && (
        <Box
          position="fixed" top={0} left={0} right={0} bottom={0}
          bg="blackAlpha.600" zIndex={15} onClick={toggleSidebar}
        />
      )}
      
      {/* --- SIMPLIFIED: Render the one and only sidebar --- */}
      <NewSidebar isExpanded={isSidebarExpanded} toggleSidebar={toggleSidebar} />

      {/* --- REMOVED: The second Workspace Sidebar is gone --- */}
      
      {/* --- SIMPLIFIED: Main Content Area --- */}
      <Flex 
        direction="column" flex="1" 
        // Margin now only depends on the single sidebar's width
        ml={{ base: isMobile ? "0" : mainSidebarWidth }}
        transition="margin-left 0.2s ease-in-out"
      >
        {/* Header */}
        <Flex
          as="header" align="center" justify="space-between"
          w={{
            base: "100%",
            // Width also only depends on the single sidebar's width
            md: `calc(100% - ${mainSidebarWidth})`
          }}
          position="fixed" top={0} p={4} height="70px"
          bg={colorMode === "dark" ? "base.bgdark" : "white"}
          zIndex={10} transition="width 0.2s ease-in-out" boxShadow="sm"
        >
          {/* Left Section - Mobile Menu Toggle & Search */}
          <Flex align="center" gap={2}>
            <IconButton
              display={{ base: "flex", md: "none" }} // Show only on mobile
              icon={<FiMenu />}
              aria-label="Toggle Sidebar"
              onClick={toggleSidebar}
              variant="ghost"
            />
            <InputGroup width={{ base: "150px", md: "20em" }} height="2.5em">
              <InputLeftElement pointerEvents="none" children={<FiSearch color="gray.500" />} />
              <Input
                placeholder="Search..."
                bg={colorMode === "dark" ? "box.bgboxdark" : "box.bgboxlight"}
                borderRadius="50px"
                _placeholder={{ color: "gray.500" }}
              />
            </InputGroup>
          </Flex>

          {/* Right Section - Icons and User Profile */}
          <Flex align="center" gap={4}>
            <Menu>
              <MenuButton as={IconButton} variant="ghost" size="lg" aria-label="Notifications" color={colorMode === "dark" ? "white" : "base.greylg"}
                icon={
                  <Box position="relative">
                    <FiBell />
                    {hasTodayInterview && (
                      <Box position="absolute" top="-2px" right="-2px" w="8px" h="8px" bg="red.500" borderRadius="full" border="1px solid" borderColor={colorMode === "dark" ? "base.bgdark" : "white"}/>
                    )}
                  </Box>
                }
              />
              <MenuList maxW="300px" p={2}>
                {interviews.length > 0 ? (
                  interviews.map((interview, index) => (
                    <MenuItem key={index} bg="transparent" _hover={{ bg: "gray.100" }} p={2}>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" isTruncated>{interview.name}</Text>
                        <Text fontSize="xs" color="gray.500">{formatInterviewDate(interview.interview_date)} at {formatInterviewTime(interview.interview_time)}</Text>
                        <Text fontSize="xs" color="gray.600">{interview.interview_location || "N/A"}</Text>
                        <Text fontSize="xs" color="blue.600">{interview.interview_type || "N/A"} - {interview.round || "N/A"}</Text>
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
              icon={<FiSun />} aria-label="Toggle theme" variant="ghost" size="lg"
              color={colorMode === "dark" ? "yellow.400" : "base.greylg"} onClick={toggleColorMode}
            />
            <Menu>
              <MenuButton>
                <Flex align="center" gap={4}>
                  <Box textAlign="left" display={{ base: "none", md: "block" }}>
                    <Text fontSize="sm" fontWeight="bold">{`${user?.user_metadata?.first_name || "User"} ${user?.user_metadata?.last_name || "Name"}`}</Text>
                    <Text fontSize="xs" color="gray.500">{user?.email || "user@example.com"}</Text>
                  </Box>
                  <Avatar size="sm" name={`${user?.user_metadata?.first_name || "User"} ${user?.user_metadata?.last_name || "Name"}`} src={user?.user_metadata?.avatar_url || "/user-avatar.png"} />
                </Flex>
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => navigate("/profile")} icon={<FiUser />}>View Profile</MenuItem>
                <MenuItem onClick={handleLogout} icon={<FiLogOut />}>Logout</MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>

        {/* Main Content - Only Content is Scrollable */}
        <Box flex="1" overflowY="auto" p={6} mt="70px">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};

export default MainLayout;