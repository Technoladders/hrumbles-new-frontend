import {
  VStack,
  IconButton,
  Tooltip,
  Box,
  Text,
  Flex,
  Icon,
  Image,
  Collapse,
  Spacer,
  useMediaQuery,
  HStack,
  Avatar,
  useDisclosure,
  Button,
  Spinner,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { logout } from "../../Redux/authSlice";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { menuItemsByRole } from "./SidebarMenuItem";
import { ArrowRightFromLine, ArrowLeftToLine, PlusCircle, Inbox } from 'lucide-react';
import supabase from "../../config/supabaseClient";
import { setSelectedWorkspace, setSelectedFile, setViewUnfiled } from '../../Redux/workspaceSlice';
import { useWorkspaces } from '../../hooks/sales/useWorkspaces';
import { useWorkspaceFiles } from '../../hooks/sales/useWorkspaceFiles';
import { useQuery } from '@tanstack/react-query';
import { AddWorkspaceItemDialog } from './AddWorkspaceItemDialog';

// Hook for unfiled contacts count
const useUnfiledContactsCount = () => {
  const organization_id = useSelector((state) => state.auth.organization_id);
  return useQuery({
    queryKey: ['unfiledContactsCount', organization_id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .is('file_id', null);
      if (error) return 0;
      return count;
    },
    enabled: !!organization_id,
  });
};

const MenuItem = ({ item, isExpanded, location, openDropdown, handleDropdownToggle, isWorkspaceSubmenuOpen, toggleWorkspaceSubmenu }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate(); // Added for navigation
  const { icon, label, path, dropdown } = item;
  const isActive = location.pathname === path || (dropdown && dropdown.some(sub => location.pathname.startsWith(sub.path)));
  const isDropdownOpen = openDropdown === label;
  const isContactsItem = label === "Contacts";
  const hoverBg = "#4A5568";
  const activeBg = "#7B43F1";
  const activeColor = "white";
  const textColor = "white";
  const iconColor = "white";
  const hoverTextColor = "#CBD5E0";

  // Workspace submenu logic for Contacts
  const { selectedWorkspaceId, selectedFileId, viewingMode } = useSelector((state) => state.workspace);
  const { data: unfiledCount = 0 } = useUnfiledContactsCount();
  const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useWorkspaces();
  const { data: files = [], isLoading: isLoadingFiles } = useWorkspaceFiles(selectedWorkspaceId);
  const { isOpen: isAddDialogOpen, onOpen: onOpenAddDialog, onClose: onCloseAddDialog } = useDisclosure();
  const [dialogItemType, setDialogItemType] = useState('workspace');

  const openAddWorkspaceDialog = (e) => {
    e.stopPropagation();
    setDialogItemType('workspace');
    onOpenAddDialog();
  };

  const openAddFileDialog = (e) => {
    e.stopPropagation();
    setDialogItemType('file');
    onOpenAddDialog();
  };

  const handleSelectWorkspace = (id) => {
    dispatch(setSelectedWorkspace(id));
    navigate('/contacts'); // Navigate to /contacts
  };

  const handleSelectFile = (id) => {
    dispatch(setSelectedFile(id));
    navigate('/contacts'); // Navigate to /contacts
  };

  const handleViewUnfiled = () => {
    dispatch(setViewUnfiled());
    navigate('/contacts'); // Navigate to /contacts
  };

  return (
    <Box key={label} w="full">
      <Tooltip label={label} placement="right" isDisabled={isExpanded}>
        <Flex
          as={isContactsItem ? "div" : Link}
          to={isContactsItem ? undefined : path}
          align="center"
          p={3}
          borderRadius="lg"
          role="group"
          cursor="pointer"
          bg={isActive ? activeBg : "transparent"}
          color={isActive ? activeColor : textColor}
          _hover={{ bg: !isActive && hoverBg, color: !isActive && hoverTextColor }}
          transition="background 0.2s, color 0.2s"
          onClick={() => isContactsItem && toggleWorkspaceSubmenu()}
        >
          <Icon as={icon} fontSize="22px" color={isActive ? activeColor : iconColor} _groupHover={{ color: hoverTextColor }} />
          {isExpanded && (
            <Flex justify="space-between" align="center" w="full" ml={4}>
              <Text fontWeight="medium">{label}</Text>
              {(dropdown || isContactsItem) && (
                <Icon
                  as={(isDropdownOpen || (isContactsItem && isWorkspaceSubmenuOpen)) ? ChevronUpIcon : ChevronDownIcon}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isContactsItem) toggleWorkspaceSubmenu();
                    else handleDropdownToggle(label, e);
                  }}
                />
              )}
            </Flex>
          )}
        </Flex>
      </Tooltip>
      {dropdown && isExpanded && (
        <Collapse in={isDropdownOpen} animateOpacity>
          <VStack pl={10} mt={2} spacing={2} align="start">
            {dropdown.map((subItem) => {
              const isSubActive = location.pathname === subItem.path;
              return (
                <Flex
                  key={subItem.label}
                  as={Link}
                  to={subItem.path}
                  align="center"
                  p={2}
                  borderRadius="md"
                  w="full"
                  bg={isSubActive ? "rgba(123, 67, 241, 0.3)" : "transparent"}
                  _hover={{ bg: "rgba(123, 67, 241, 0.2)" }}
                  color={isSubActive ? activeColor : textColor}
                >
                  <Text fontSize="sm">{subItem.label}</Text>
                </Flex>
              );
            })}
          </VStack>
        </Collapse>
      )}
      {isContactsItem && isExpanded && (
        <Collapse in={isWorkspaceSubmenuOpen} animateOpacity>
          <VStack
            pl={10}
            mt={2}
            spacing={1}
            align="stretch"
            bg="white"
            borderRadius="md"
            p={3}
            color="gray.700"
          >
            <Flex align="center" justify="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="semibold">Workspaces</Text>
              <Button variant="ghost" size="xs" onClick={openAddWorkspaceDialog}>
                <Icon as={PlusCircle} boxSize={4} color="gray.500" />
              </Button>
            </Flex>
            {unfiledCount > 0 && (
              <Button
                justifyContent="space-between"
                variant={viewingMode === 'unfiled' ? "solid" : "ghost"}
                colorScheme={viewingMode === 'unfiled' ? "blue" : "gray"}
                w="full"
                size="sm"
                leftIcon={<Icon as={Inbox} boxSize={4} />}
                onClick={handleViewUnfiled}
              >
                Unfiled
                <Text as="span" bg="blue.500" color="white" fontSize="xs" px={2} borderRadius="full">
                  {unfiledCount}
                </Text>
              </Button>
            )}
            {isLoadingWorkspaces && <Flex justify="center" p={2}><Spinner size="sm" /></Flex>}
            {workspaces.map(ws => (
              <Box key={ws.id} w="full">
                <Button
                  justifyContent="start"
                  variant={selectedWorkspaceId === ws.id ? "solid" : "ghost"}
                  colorScheme={selectedWorkspaceId === ws.id ? "purple" : "gray"}
                  w="full"
                  size="sm"
                  textAlign="left"
                  onClick={() => handleSelectWorkspace(ws.id)}
                  fontWeight={selectedWorkspaceId === ws.id ? "bold" : "medium"}
                >
                  {ws.name}
                </Button>
                {selectedWorkspaceId === ws.id && (
                  <VStack pl={4} mt={1} spacing={1} align="start">
                    {isLoadingFiles && <Text fontSize="xs" color="gray.500" pl={3} py={1}>Loading...</Text>}
                    {files.map(file => (
                      <Button
                        key={file.id}
                        justifyContent="start"
                        variant={selectedFileId === file.id ? "subtle" : "ghost"}
                        colorScheme={selectedFileId === file.id ? "purple" : "gray"}
                        size="xs"
                        w="full"
                        onClick={() => handleSelectFile(file.id)}
                        fontWeight="normal"
                      >
                        {file.name}
                      </Button>
                    ))}
                    <Button 
                      variant="link" 
                      size="xs" 
                      leftIcon={<Icon as={PlusCircle} boxSize={3}/>} 
                      colorScheme="gray" 
                      fontWeight="normal" 
                      onClick={openAddFileDialog}
                    >
                      Add File
                    </Button>
                  </VStack>
                )}
              </Box>
            ))}
          </VStack>
          <AddWorkspaceItemDialog
            isOpen={isAddDialogOpen}
            onClose={onCloseAddDialog}
            itemType={dialogItemType}
            workspaceId={selectedWorkspaceId}
          />
        </Collapse>
      )}
    </Box>
  );
};

const NewSidebar = ({ isExpanded, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { role, user } = useSelector((state) => state.auth);
  
  const [departmentName, setDepartmentName] = useState("Unknown Department");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isWorkspaceSubmenuOpen, setWorkspaceSubmenuOpen] = useState(false);
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const { isOpen: isProfileMenuOpen, onToggle: toggleProfileMenu } = useDisclosure();

  const bgColor = "#364153";
  const activeBg = "#7B43F1";
  const hoverBg = "#4A5568";
  const textColor = "white";

  const [activeSuite, setActiveSuite] = useState(() => {
    return localStorage.getItem('activeSuite') || null;
  });

  const menuConfig =
    role === "employee" || role === "admin"
      ? menuItemsByRole[role](departmentName)
      : menuItemsByRole[role] || [];

  const isCategorized = role === 'organization_superadmin' || (role === 'admin' && departmentName !== "Finance");

  const findSuiteForPath = (pathname) => {
    if (!isCategorized) return null;
    for (const suite of menuConfig) {
      const hasMatchingItem = suite.items.some(
        item =>
          item.path === pathname ||
          (item.dropdown && item.dropdown.some(subItem => pathname.startsWith(subItem.path)))
      );
      if (hasMatchingItem) return suite.title;
    }
    return menuConfig[0]?.title || null;
  };

  const getDefaultPathForSuite = (suiteTitle) => {
    const suite = menuConfig.find(s => s.title === suiteTitle);
    if (!suite || !suite.items || suite.items.length === 0) return '/dashboard';
    return suite.items[0].path;
  };

  useEffect(() => {
    const fetchEmployeeProfile = async () => {
      if (!user?.id) {
        setEmployeeProfile(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('hr_employees')
          .select('first_name, last_name, profile_picture_url')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        if (data) {
          setEmployeeProfile({
            firstName: data.first_name,
            lastName: data.last_name,
            avatarUrl: data.profile_picture_url,
          });
        }
      } catch (error) {
        console.error("Error fetching employee profile:", error.message);
        setEmployeeProfile(null);
      }
    };
    fetchEmployeeProfile();
  }, [user?.id]);

  useEffect(() => {
    const fetchDepartmentName = async () => {
      if (!user?.id) {
        setDepartmentName("Unknown Department");
        return;
      }
      try {
        const { data: employeeData, error: employeeError } = await supabase
          .from("hr_employees")
          .select("department_id")
          .eq("id", user.id)
          .single();
        if (employeeError) throw employeeError;
        if (!employeeData?.department_id) {
          setDepartmentName("Unknown Department");
          return;
        }
        const { data: departmentData, error: departmentError } = await supabase
          .from("hr_departments")
          .select("name")
          .eq("id", employeeData.department_id)
          .single();
        if (departmentError) throw departmentError;
        const newDepartment = departmentData.name || "Unknown Department";
        setDepartmentName(newDepartment);
        const currentSuite = localStorage.getItem('activeSuite');
        const newMenuConfig = menuItemsByRole[role](newDepartment);
        const suiteExists = newMenuConfig.some(suite => suite.title === currentSuite);
        if (!suiteExists && newMenuConfig.length > 0) {
          const defaultSuite = newMenuConfig[0].title;
          setActiveSuite(defaultSuite);
          localStorage.setItem('activeSuite', defaultSuite);
        }
      } catch (error) {
        console.error("Error fetching department:", error.message);
        setDepartmentName("Unknown Department");
      }
    };
    fetchDepartmentName();
  }, [user?.id, role]);

  useEffect(() => {
    if (isCategorized && menuConfig.length > 0) {
      const newSuite = findSuiteForPath(location.pathname);
      if (newSuite && newSuite !== activeSuite) {
        setActiveSuite(newSuite);
        localStorage.setItem('activeSuite', newSuite);
      } else if (!newSuite && menuConfig.length > 0) {
        const defaultSuite = menuConfig[0].title;
        setActiveSuite(defaultSuite);
        localStorage.setItem('activeSuite', defaultSuite);
      }
    }
  }, [location.pathname, menuConfig, activeSuite, isCategorized]);

  const itemsToRender = isCategorized
    ? menuConfig.find(suite => suite.title === activeSuite)?.items || []
    : menuConfig;

  const handleDropdownToggle = (label, e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(openDropdown === label ? null : label);
  };

  const toggleWorkspaceSubmenu = () => {
    setWorkspaceSubmenuOpen(!isWorkspaceSubmenuOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('activeSuite');
    navigate("/login");
  };

  const handleSuiteChange = (suiteTitle) => {
    if (suiteTitle !== activeSuite) {
      setActiveSuite(suiteTitle);
      localStorage.setItem('activeSuite', suiteTitle);
      const currentSuite = findSuiteForPath(location.pathname);
      if (currentSuite !== suiteTitle) {
        const defaultPath = getDefaultPathForSuite(suiteTitle);
        navigate(defaultPath);
      }
    }
  };

  const fullName = employeeProfile ? `${employeeProfile.firstName} ${employeeProfile.lastName}` : "User Name";

  return (
    <Flex
      direction="column"
      bg={bgColor}
      color={textColor}
      height="100vh"
      width={isExpanded ? "250px" : "80px"}
      transition="width 0.2s ease-in-out"
      position="fixed"
      left={0}
      top={0}
      p={isExpanded ? 4 : 2}
      zIndex={20}
    >
      <Flex align="center" mb={8} minH="40px" px={isExpanded ? 0 : 1}>
        {isExpanded && <Image src="/2-cropped.svg" alt="Logo" width="160px" />}
        <Spacer />
        {!isMobile && (
          <IconButton
            aria-label="Toggle Sidebar"
            icon={<Icon as={isExpanded ? ArrowLeftToLine : ArrowRightFromLine} />}
            variant="ghost"
            color="gray.400"
            _hover={{ bg: hoverBg, color: "white" }}
            onClick={toggleSidebar}
          />
        )}
      </Flex>
      
      <VStack
        spacing={2}
        align="stretch"
        flex="1"
        overflowY="auto"
        overflowX="hidden"
        css={{ "&::-webkit-scrollbar": { display: "none" }, "scrollbar-width": "none" }}
      >
        {isCategorized && isExpanded && (
          <Text px={3} py={2} fontSize="sm" fontWeight="bold" color="gray.400">
            {activeSuite || "Select a Suite"}
          </Text>
        )}
        {itemsToRender.length > 0 ? (
          itemsToRender.map((item) => (
            <MenuItem
              key={item.label}
              item={item}
              isExpanded={isExpanded}
              location={location}
              openDropdown={openDropdown}
              handleDropdownToggle={handleDropdownToggle}
              toggleWorkspaceSubmenu={toggleWorkspaceSubmenu}
              isWorkspaceSubmenuOpen={isWorkspaceSubmenuOpen}
            />
          ))
        ) : (
          <Text px={3} py={2} fontSize="sm" color="gray.400">
            No menu items available
          </Text>
        )}
      </VStack>

      <VStack spacing={2} align="stretch" mt={4}>
        {isExpanded && (
          <Box>
            <Flex
              align="center"
              p={2}
              bg="gray.700"
              borderRadius="lg"
              cursor="pointer"
              _hover={{ bg: "gray.600" }}
              onClick={toggleProfileMenu}
            >
              <Avatar size="sm" name={fullName} src={employeeProfile?.avatarUrl} />
              <Text ml={3} fontWeight="medium" noOfLines={1}>{fullName}</Text>
              <Spacer />
              <Icon as={isProfileMenuOpen ? ChevronUpIcon : ChevronDownIcon} />
            </Flex>
            <Collapse in={isProfileMenuOpen} animateOpacity>
              <VStack align="stretch" spacing={1} mt={2} pl={2}>
                {departmentName !== "Finance" && (
                  <Text as={Link} to="/profile" p={2} borderRadius="md" _hover={{ bg: hoverBg }}>
                    My Profile
                  </Text>
                )}
                <Text onClick={handleLogout} p={2} borderRadius="md" cursor="pointer" _hover={{bg: hoverBg}}>
                  Logout
                </Text>
              </VStack>
            </Collapse>
          </Box>
        )}
        
        {isCategorized && (
          <HStack
            justify="center"
            spacing={isExpanded ? 4 : 2}
            p={isExpanded ? 2 : 1}
            borderRadius="lg"
            bg="rgba(0,0,0,0.2)"
          >
            {(isExpanded ? menuConfig : menuConfig.filter(s => s.title === activeSuite)).map((suite) => (
              <Tooltip key={suite.title} label={suite.title} placement="top" isDisabled={isExpanded}>
                <IconButton
                  aria-label={suite.title}
                  icon={<Icon as={suite.icon} fontSize="20px" />}
                  isRound
                  size="md"
                  bg={activeSuite === suite.title ? activeBg : 'transparent'}
                  color="white"
                  _hover={{ bg: activeSuite !== suite.title && hoverBg }}
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
// 