// NewSidebar.js
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
  Divider
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { logout } from "../../Redux/authSlice";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { menuItemsByRole } from "./SidebarMenuItem";
import { ArrowRightFromLine, ArrowLeftToLine, BarChart3, TrendingUp } from 'lucide-react';
import supabase from "../../config/supabaseClient";
import { is } from "date-fns/locale";
import PurpleDock from '../ui/Reactbits-theme/PurpleDock';
import {  FiLogOut, FiSettings } from "react-icons/fi";


const MenuItem = ({ item, isExpanded, location, openDropdown, handleDropdownToggle }) => {
  const { icon, label, path, dropdown } = item;
  // const isActive = location.pathname === path || (dropdown && dropdown.some(sub => location.pathname.startsWith(sub.path)));
  const isDropdownOpen = openDropdown === label;

  const getIsActive = () => {
    // 1. Base Logic: Handles exact matches and nested routes.
    //    - Example: Activates "Employees" for "/employee" and "/employee/new".
    //    - The (path !== '/') check prevents the root Dashboard from always being active.
    if (location.pathname === path || (path !== '/' && location.pathname.startsWith(`${path}/`))) {
      return true;
    }

    // 2. Special Case Logic: Handles non-nested routes that are conceptually related.
    //    - Example: Activates "Jobs" for "/resume-analysis/..."
    if (path === '/jobs') {
      const jobRelatedPrefixes = ['/resume-analysis', '/jobstatuses'];
      const employeeJobRouteRegex = /^\/jobs\/[^/]+\/[^/]+$/; // For /employee/:candidateId/:jobId

      if (jobRelatedPrefixes.some(prefix => location.pathname.startsWith(prefix)) || employeeJobRouteRegex.test(location.pathname)) {
        return true;
      }
    }

    // 3. Dropdown Logic: Checks if any dropdown sub-item's path matches.
    if (dropdown && dropdown.some(sub => location.pathname.startsWith(sub.path))) {
      return true;
    }

    return false;
  };

  const isActive = getIsActive();

  const hoverBg = "#b9b7f8ff";
  const activeBg = "#7B43F1";
  const activeColor = "white";
  const textColor = "black";
  const iconColor = "black";
  const hoverTextColor = "black";

  return (
    <Box key={label} w="full">
      <Tooltip label={label} placement="right" isDisabled={isExpanded}>
        <Flex
          as={Link}
          to={path}
          align="center"
          p={3}
          borderRadius="lg"
          role="group"
          cursor="pointer"
          justify={isExpanded ? "flex-start" : "center"}
          bg={isActive ? activeBg : "transparent"}
          color={isActive ? activeColor : textColor}
          _hover={{ bg: !isActive && hoverBg, color: !isActive && hoverTextColor }}
          transition="background 0.1s, color 0.1s"
          onClick={(e) => {
            if (dropdown) {
              handleDropdownToggle(label, e);
            }
          }}
        >
          <Icon as={icon} fontSize="16px" color={isActive ? activeColor : iconColor} _groupHover={{ color: hoverTextColor }} />
          {isExpanded && (
            <Flex justify="space-between" align="center" w="full" ml={4} >
              <Box position="relative" display="inline-block">
  <Text fontWeight="medium">{label}</Text>
  {item.beta && (
    <Box
      position="absolute"
      top="-5px"
      right="-34px"
      fontSize="9px"
      fontWeight="bold"
      px={1.5}
      py="1px"
      borderRadius="sm"
      bg="red.500"
      color="white"
      lineHeight="1"
      textTransform="uppercase"
    >
      Beta
    </Box>
  )}
</Box>

              {dropdown && (
                <Icon
                  as={isDropdownOpen ? ChevronUpIcon : ChevronDownIcon}
                  onClick={(e) => handleDropdownToggle(label, e)}
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
    </Box>
  );
};

const NewSidebar = ({ isExpanded, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { role, user } = useSelector((state) => state.auth);
  const organizationId = useSelector((state) => state.auth.organization_id);

    const [organizationDetails, setOrganizationDetails] = useState(null);
     const [isPurelyPermanentOrg, setIsPurelyPermanentOrg] = useState(false);

    console.log("organizationDetails", isPurelyPermanentOrg);

  const [departmentName, setDepartmentName] = useState("Unknown Department");
  const [designationName, setDesignationName] = useState("Unknown Designation"); // New state for designation
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const { isOpen: isProfileMenuOpen, onToggle: toggleProfileMenu } = useDisclosure();

  const bgColor = "white";
  const railBg = "#fdfdfd"; // Slightly different to differentiate from the panel
  const borderColor = "gray.100";

  const [activeSuite, setActiveSuite] = useState(() => {
    return localStorage.getItem('activeSuite') || null;
  });

  console.log("designatookkmj", designationName);

   // --- START: New useEffect to fetch organization details ---
  useEffect(() => {
    const fetchOrganizationDetails = async () => {
      // Only run this fetch if the user is an org superadmin and has an org ID
      if (role === 'organization_superadmin' && organizationId) {
        try {
          const { data, error } = await supabase
            .from('hr_organizations')
            .select('id, is_recruitment_firm, is_verification_firm') // Select only the needed fields
            .eq('id', organizationId)
            .single();

          if (error) {
            throw error;
          }
          
          setOrganizationDetails(data);
        } catch (error) {
          console.error("Error fetching organization details:", error.message);
          setOrganizationDetails(null); // Reset on error to prevent crashes
        }
      }
    };

    fetchOrganizationDetails();
  }, [role, organizationId]); // Re-run if role or organizationId changes
  // --- END: New useEffect ---

  // --- START: Fetch Organization Details ---
  useEffect(() => {
    const fetchOrganizationDetails = async () => {
      if (role === 'organization_superadmin' && organizationId) {
        try {
          const { data, error } = await supabase
            .from('hr_organizations')
            .select('id, is_recruitment_firm, is_verification_firm')
            .eq('id', organizationId)
            .single();

          if (error) throw error;
          setOrganizationDetails(data);
        } catch (error) {
          console.error("Error fetching organization details:", error.message);
          setOrganizationDetails(null);
        }
      }
    };
    fetchOrganizationDetails();
  }, [role, organizationId]);
  // --- END: Fetch Organization Details ---

  // --- START: Check Client Service Types ---
  useEffect(() => {
    const checkClientServiceTypes = async () => {
      if (!organizationId) return;

      try {
        const { data: clients, error } = await supabase
          .from('hr_clients')
          .select('service_type')
          .eq('organization_id', organizationId);

        if (error) throw error;

        if (clients && clients.length > 0) {
          // Logic: Check if EVERY client has EXACTLY ["permanent"]
          const allPermanent = clients.every(client => 
            Array.isArray(client.service_type) &&
            client.service_type.length === 1 &&
            client.service_type[0] === 'permanent'
          );
          setIsPurelyPermanentOrg(allPermanent);
        } else {
          // If no clients, we don't restrict the menu (default behavior)
          setIsPurelyPermanentOrg(false);
        }

      } catch (error) {
        console.error("Error checking client service types:", error.message);
        setIsPurelyPermanentOrg(false);
      }
    };

    // Only run for roles that see these menus
    if (organizationId) {
        checkClientServiceTypes();
    }
  }, [organizationId]);
  // --- END: Check Client Service Types ---

  const menuConfig = (() => {
    const menuSource = menuItemsByRole[role];
    if (!menuSource) return [];

    switch (role) {
      case 'organization_superadmin':
       return organizationDetails ? menuSource(organizationId ,organizationDetails, isPurelyPermanentOrg) : [];
      case 'admin':
        return menuSource(departmentName, isPurelyPermanentOrg);
      case 'employee':
        return menuSource(departmentName, designationName, user?.id, isPurelyPermanentOrg);
      default:
        return menuSource;
    }
  })();

    const isCategorized = Array.isArray(menuConfig) && menuConfig.length > 0 && menuConfig[0].hasOwnProperty('title');

// In NewSidebar.jsx

  const findSuiteForPath = (pathname) => {
    if (!isCategorized) return null;
    for (const suite of menuConfig) {
      // === MODIFICATION START ===
      const hasMatchingItem = suite.items.some(
        item =>
          // This logic now mirrors the `getIsActive` logic, understanding nested routes.
          pathname === item.path ||
          (item.path !== '/' && pathname.startsWith(`${item.path}/`)) ||
          (item.dropdown && item.dropdown.some(subItem => pathname.startsWith(subItem.path)))
      );
      // === MODIFICATION END ===

      if (hasMatchingItem) return suite.title;
    }
    
    // Add special case for job-related routes that are not nested
    const jobRelatedPrefixes = ['/resume-analysis', '/jobstatuses'];
    const employeeJobRouteRegex = /^\/jobs\/[^/]+\/[^/]+$/;
    
    if (jobRelatedPrefixes.some(prefix => pathname.startsWith(prefix)) || employeeJobRouteRegex.test(pathname)) {
        // Find the suite that contains the "Jobs" menu item
        const hiringSuite = menuConfig.find(suite => suite.items.some(item => item.path === '/jobs'));
        if (hiringSuite) return hiringSuite.title;
    }

    return null;
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
        setDepartmentName("Unknown Department");
        setDesignationName("Unknown Designation");
        return;
      }
      try {
        // Fetch employee data including department_id and designation_id
        const { data: employeeData, error: employeeError } = await supabase
          .from('hr_employees')
          .select('first_name, last_name, profile_picture_url, department_id, designation_id')
          .eq('id', user.id)
          .single();
        if (employeeError) throw employeeError;

        if (employeeData) {
          setEmployeeProfile({
            firstName: employeeData.first_name,
            lastName: employeeData.last_name,
            avatarUrl: employeeData.profile_picture_url,
          });

          // Fetch department name
          if (employeeData.department_id) {
            const { data: departmentData, error: departmentError } = await supabase
              .from("hr_departments")
              .select("name")
              .eq("id", employeeData.department_id)
              .eq('organization_id', organizationId)
              .single();
            if (departmentError) throw departmentError;
            setDepartmentName(departmentData.name || "Unknown Department");
          } else {
            setDepartmentName("Unknown Department");
          }

          // Fetch designation name
          if (employeeData.designation_id) {
            const { data: designationData, error: designationError } = await supabase
              .from("hr_designations")
              .select("name")
              .eq("id", employeeData.designation_id)
              .eq('organization_id', organizationId)
              .single();
            if (designationError) throw designationError;
            setDesignationName(designationData.name || "Unknown Designation");
          } else {
            setDesignationName("Unknown Designation");
          }
        }
      } catch (error) {
        console.error("Error fetching employee profile or department/designation:", error.message);
        setEmployeeProfile(null);
        setDepartmentName("Unknown Department");
        setDesignationName("Unknown Designation");
      }
    };
    fetchEmployeeProfile();
  }, [user?.id]);

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

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('activeSuite');
    navigate("/login");
  };


const getSuiteIdFromTitle = (title) => {
    if (!title) return 'hiring';
    
    const lower = title.toLowerCase();
    
    if (lower.includes('hiring')) return 'hiring';
    if (lower.includes('project')) return 'project';
    if (lower.includes('verification')) return 'verification';
    if (lower.includes('sales')) return 'sales';
    if (lower.includes('finance')) return 'finance';
    if (lower.includes('hr')) return 'hr';
    
    return 'hiring';
  };

  // Convert suite ID (from dock) to suite title (for menuData)
  const getSuiteTitleFromId = (id) => {
    const map = {
      'hiring': 'HIRING SUITE',
      'project': 'PROJECT SUITE',
      'verification': 'VERIFICATION SUITE',
      'sales': 'SALES SUITE',
      'finance': 'FINANCE SUITE',
      'hr': 'HR Suite'
    };
    return map[id] || 'HIRING SUITE';
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


 const DockIcon = ({ icon: Icon, label, isActive, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [scale, setScale] = useState(1);

    return (
      <Tooltip label={label} placement="top" isOpen={isHovered}>
        <Box position="relative">
          <IconButton
            icon={<Icon />}
            aria-label={label}
            onClick={onClick}
            onMouseEnter={() => {
              setIsHovered(true);
              setScale(1.4); // Magnification effect
            }}
            onMouseLeave={() => {
              setIsHovered(false);
              setScale(1);
            }}
            bg={isActive ? "white" : "whiteAlpha.200"}
            color={isActive ? "#7B43F1" : "white"}
            _hover={{
              bg: isActive ? "white" : "whiteAlpha.300",
              transform: `scale(${scale})`,
            }}
            transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
            transform={`scale(${scale})`}
            size="md"
            borderRadius="xl"
            boxShadow={isActive ? "lg" : "none"}
          />
          
          {/* Active indicator dot */}
          {isActive && (
            <Box
              position="absolute"
              bottom="-6px"
              left="50%"
              transform="translateX(-50%)"
              w="4px"
              h="4px"
              bg="white"
              borderRadius="full"
            />
          )}
        </Box>
      </Tooltip>
    );
  };

return (
    <Flex
      position="fixed"
      left={0}
      top={0}
      height="100vh"
      zIndex={20}
      borderRight="1px solid"
      borderColor={borderColor}
    >
      {/* LEFT RAIL: Suite Switchers (Like the image's far left icons) */}
      <VStack
        w="74px"
        bg={railBg}
        py={6}
        spacing={6}
        borderRight="1px solid"
        borderColor={borderColor}
        align="center"
      >
        {isCategorized && menuConfig.map((suite) => (
          <Tooltip key={suite.title} label={suite.title} placement="right">
            <IconButton
              variant="ghost"
              icon={<Icon as={suite.icon} fontSize="22px" />}
              onClick={() => {
                setActiveSuite(suite.title);
                const defaultPath = getDefaultPathForSuite(suite.title);
                navigate(defaultPath);
              }}
              color={activeSuite === suite.title ? "#7B43F1" : "gray.400"}
              bg={activeSuite === suite.title ? "purple.50" : "transparent"}
              _hover={{ bg: "purple.50", color: "#7B43F1" }}
              borderRadius="xl"
              p={6}
            />
          </Tooltip>
        ))}
        
        <Spacer />
        
        {/* Bottom Icons (Settings/Help) */}
        <VStack spacing={4} pb={4}>
           <IconButton icon={<Icon as={FiSettings} />} variant="ghost" color="gray.400" />
           <IconButton icon={<Icon as={FiLogOut} />} onClick={handleLogout} variant="ghost" color="gray.400" />
        </VStack>
      </VStack>

      {/* RIGHT PANEL: Menu Items (Like the image's text menu) */}
      {isExpanded && (
        <Flex
          direction="column"
          w="206px"
          bg={bgColor}
          transition="width 0.2s"
          overflow="hidden"
        >
          <Box p={6}>
            <Text fontSize="xs" fontWeight="bold" color="gray.400" letterSpacing="wider" mb={4}>
              {activeSuite}
            </Text>
            
            <VStack spacing={1} align="stretch" overflowY="auto" css={{ "&::-webkit-scrollbar": { display: "none" } }}>
              {itemsToRender.map((item, idx) => (
                <React.Fragment key={item.label}>
                   <MenuItem
                    item={item}
                    isExpanded={true}
                    location={location}
                    openDropdown={openDropdown}
                    handleDropdownToggle={handleDropdownToggle}
                  />
                  {/* Visual Divider like the image (every 4 items or by logical group) */}
                  {(idx === 3 || idx === 7) && <Divider my={4} borderColor="gray.100" />}
                </React.Fragment>
              ))}
            </VStack>
          </Box>
        </Flex>
      )}
    </Flex>
  );
};

export default NewSidebar;