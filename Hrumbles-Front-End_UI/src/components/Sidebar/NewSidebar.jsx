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
import { ArrowRightFromLine, ArrowLeftToLine } from 'lucide-react';
import supabase from "../../config/supabaseClient";

const MenuItem = ({ item, isExpanded, location, openDropdown, handleDropdownToggle }) => {
  const { icon, label, path, dropdown } = item;
  const isActive = location.pathname === path || (dropdown && dropdown.some(sub => location.pathname.startsWith(sub.path)));
  const isDropdownOpen = openDropdown === label;

  const hoverBg = "#4A5568";
  const activeBg = "#7B43F1";
  const activeColor = "white";
  const textColor = "white";
  const iconColor = "white";
  const hoverTextColor = "#CBD5E0";

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
          bg={isActive ? activeBg : "transparent"}
          color={isActive ? activeColor : textColor}
          _hover={{ bg: !isActive && hoverBg, color: !isActive && hoverTextColor }}
          transition="background 0.2s, color 0.2s"
          onClick={(e) => {
            if (dropdown) {
              handleDropdownToggle(label, e);
            }
          }}
        >
          <Icon as={icon} fontSize="22px" color={isActive ? activeColor : iconColor} _groupHover={{ color: hoverTextColor }} />
          {isExpanded && (
            <Flex justify="space-between" align="center" w="full" ml={4}>
              <Text fontWeight="medium">{label}</Text>
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

  const [departmentName, setDepartmentName] = useState("Unknown Department");
  const [designationName, setDesignationName] = useState("Unknown Designation"); // New state for designation
  const [openDropdown, setOpenDropdown] = useState(null);
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

  console.log("designatookkmj", designationName);

  const menuConfig = (() => {
    const menuSource = menuItemsByRole[role];
    if (!menuSource) return [];

    switch (role) {
      case 'organization_superadmin':
        return menuSource(organizationId); // Pass the organizationId
      case 'admin':
        return menuSource(departmentName);
      case 'employee':
        return menuSource(departmentName, designationName);
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
      width={isExpanded ? "250px" : "80px"}
      transition="width 0.2s ease-in-out"
      position="fixed"
      left={0}
      top={0}
      p={isExpanded ? 4 : 2}
      zIndex={20}
    >
      <Flex align="center" mb={8} minH="40px" px={isExpanded ? 0 : 1}>
        {isExpanded && <Image src="/hrumbles-wave-white.svg" alt="Logo" width="160px" />}
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
                {/* {departmentName !== "Finance" && (
                  <Text as={Link} to="/profile" p={2} borderRadius="md" _hover={{ bg: hoverBg }}>
                    My Profile
                  </Text>
                )} */}
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