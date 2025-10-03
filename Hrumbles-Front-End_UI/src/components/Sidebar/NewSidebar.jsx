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
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { logout } from "../../Redux/authSlice";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { menuItemsByRole } from "./SidebarMenuItem";
import { ArrowRightFromLine, ArrowLeftToLine, BarChart3, TrendingUp } from 'lucide-react';
import supabase from "../../config/supabaseClient";

const MenuItem = ({ item, isExpanded, location, openDropdown, handleDropdownToggle }) => {
  const { icon, label, path, dropdown } = item;
  const isActive = location.pathname === path || (dropdown && dropdown.some(sub => location.pathname.startsWith(sub.path)));
  const isDropdownOpen = openDropdown === label;

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

    console.log("organizationDetails", organizationDetails);

  const [departmentName, setDepartmentName] = useState("Unknown Department");
  const [designationName, setDesignationName] = useState("Unknown Designation"); // New state for designation
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const { isOpen: isProfileMenuOpen, onToggle: toggleProfileMenu } = useDisclosure();

  const bgColor = "#ffffffff";
  const activeBg = "#ffffffff";
  const hoverBg = "#eee7f1dd";
  const textColor = "black";

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
            .select('id, is_recruitment_firm') // Select only the needed fields
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

  const menuConfig = (() => {
    const menuSource = menuItemsByRole[role];
    if (!menuSource) return [];

    switch (role) {
      case 'organization_superadmin':
       return organizationDetails ? menuSource(organizationId ,organizationDetails) : [];
      case 'admin':
        return menuSource(departmentName);
      case 'employee':
        return menuSource(departmentName, designationName, user?.id);
      default:
        return menuSource;
    }
  })();

    const isCategorized = Array.isArray(menuConfig) && menuConfig.length > 0 && menuConfig[0].hasOwnProperty('title');

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
      width={isExpanded ? "210px" : "74px"}
      transition="width 0.1s ease-in-out"
      position="fixed"
      left={0}
      top={0}
      p={isExpanded ? 4 : 2}
      zIndex={20}
    >
      <Flex align="center" mb={8} minH="40px" px={isExpanded ? 0 : 1}>
        {isExpanded && <Image className="mt-4" src="/1-cropped.svg" alt="Logo" width="120px" />}
        {!isExpanded && <Image src="/hrumbles-fav-blue-cropped.svg" alt="Logo" width="30px"  />}

        <Spacer />
        {!isMobile && (
          <IconButton
          marginTop={3}
            fontSize={isExpanded ? "18px" : "8px"}
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
          <Text px={3} py={2} fontSize="lg" fontWeight="bold" color="black">
            {activeSuite || "Select a Suite"}
          </Text>
        )}a
        {itemsToRender.length > 0 ? (
          itemsToRender.map((item) => (
            <MenuItem
              key={item.label}
              item={item}
              isExpanded={isExpanded}
              location={location}
              openDropdown={openDropdown}
              handleDropdownToggle={handleDropdownToggle}
            />
          ))
        ) : (
          <Text px={3} py={2} fontSize="sm" color="gray.400">
            No menu items available
          </Text>
        )}
      </VStack>

      <VStack spacing={2} align="stretch" mt={4}>
        {/* {isExpanded && (
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
        )} */}

        {isCategorized && (
          <HStack
            justify="center"
            spacing={isExpanded ? 4 : 0}
            p={isExpanded ? 2 : 1}
            borderRadius="lg"
            bg="#7B43F1"
          >
            {(isExpanded ? menuConfig : menuConfig.filter(s => s.title === activeSuite)).map((suite) => (
              <Tooltip
        key={suite.title}
        label={
          suite.title.charAt(0).toUpperCase() +
          suite.title.slice(1).toLowerCase()
        }
        placement="top"
        hasArrow
        bg="gray.700"
        color="white"
        fontSize="xs"
        p={1}
        borderRadius="sm"
      >
                <IconButton
                  aria-label={suite.title}
                   icon={
            <Icon
              as={suite.icon}
              fontSize={suite.title === "PROJECT SUITE" ? "20px" : "16px"}
            />
          }
                  isRound
                  size="sm"
                  bg={activeSuite === suite.title ? activeBg : 'transparent'}
                  color={activeSuite === suite.title ? 'black' : 'white'}
                  _hover={{
    bg: activeSuite !== suite.title ? hoverBg : activeBg,color: 'black', // 👈 make icon text white on hover
  }}
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