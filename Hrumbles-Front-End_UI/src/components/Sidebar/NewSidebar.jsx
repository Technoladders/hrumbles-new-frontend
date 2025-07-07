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
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { logout } from "../../Redux/authSlice";
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { menuItemsByRole } from "./SidebarMenuItem";
import { ArrowRightFromLine, ArrowLeftToLine} from 'lucide-react';
import supabase from "../../config/supabaseClient";

// MenuItem component remains the same as before.
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
          as={Link} to={path} align="center" p={3} borderRadius="lg"
          role="group" cursor="pointer" bg={isActive ? activeBg : "transparent"}
          color={isActive ? activeColor : textColor}
          _hover={{ bg: !isActive && hoverBg, color: !isActive && hoverTextColor }}
          transition="background 0.2s, color 0.2s"
        >
          <Icon as={icon} fontSize="22px" color={isActive ? activeColor : iconColor} _groupHover={{ color: hoverTextColor }} />
          {isExpanded && (
            <Flex justify="space-between" align="center" w="full" ml={4}>
              <Text fontWeight="medium">{label}</Text>
              {dropdown && <Icon as={isDropdownOpen ? ChevronUpIcon : ChevronDownIcon} onClick={(e) => handleDropdownToggle(label, e)} />}
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
                <Flex key={subItem.label} as={Link} to={subItem.path} align="center" p={2} borderRadius="md" w="full"
                  bg={isSubActive ? "rgba(123, 67, 241, 0.3)" : "transparent"} _hover={{ bg: "rgba(123, 67, 241, 0.2)" }}
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
  
  const [departmentName, setDepartmentName] = useState("Unknown Department");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isMobile] = useMediaQuery("(max-width: 768px)");

  console.log('Role', role)
  console.log('departmentName', departmentName)


  // --- NEW: State for employee profile and profile menu toggle ---
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const { isOpen: isProfileMenuOpen, onToggle: toggleProfileMenu } = useDisclosure();

  // --- Theme Colors ---
  const bgColor = "#364153";
  const activeBg = "#7B43F1";
  const hoverBg = "#4A5568";
  const textColor = "white";

  // --- NEW: Fetch employee profile data ---
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
        // Step 1: Fetch department_id from hr_employees where id matches user.id
        const { data: employeeData, error: employeeError } = await supabase
          .from("hr_employees")
          .select("department_id")
          .eq("id", user.id)
          .single();

        if (employeeError) {
          console.error("Error fetching employee data:", employeeError);
          setDepartmentName("Unknown Department");
          return;
        }

        if (!employeeData?.department_id) {
          setDepartmentName("Unknown Department");
          return;
        }

        // Step 2: Fetch department name from hr_departments using department_id
        const { data: departmentData, error: departmentError } = await supabase
          .from("hr_departments")
          .select("name")
          .eq("id", employeeData.department_id)
          .single();

        if (departmentError) {
          console.error("Error fetching department data:", departmentError);
          setDepartmentName("Unknown Department");
          return;
        }

        setDepartmentName(departmentData.name || "Unknown Department");
      } catch (error) {
        console.error("Unexpected error:", error);
        setDepartmentName("Unknown Department");
      }
    };

    fetchDepartmentName();
  }, [user?.id]);

  const menuConfig =
    role === "employee" || role === "admin"
      ? menuItemsByRole[role](departmentName)
      : menuItemsByRole[role] || [];
  
  const isCategorized = role === 'organization_superadmin';
  const [activeSuite, setActiveSuite] = useState(isCategorized ? menuConfig[0].title : null);
  
  const itemsToRender = isCategorized
    ? menuConfig.find(suite => suite.title === activeSuite)?.items || []
    : menuConfig;

  const handleDropdownToggle = (label, e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(openDropdown === label ? null : label);
  };
  
  // --- NEW: Handlers for profile menu actions ---
  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const fullName = employeeProfile ? `${employeeProfile.firstName} ${employeeProfile.lastName}` : "User Name";

  return (
    <Flex
      direction="column" bg={bgColor} color={textColor} height="100vh"
      width={isExpanded ? "250px" : "80px"} transition="width 0.2s ease-in-out"
      position="fixed" left={0} top={0} p={isExpanded ? 4 : 2} zIndex={20}
    >
      {/* Header (unchanged) */}
      <Flex align="center" mb={8} minH="40px" px={isExpanded ? 0 : 1}>
        {isExpanded && <Image src="/2-cropped.svg" alt="Logo" width="160px" />}
        <Spacer />
        {!isMobile && (
          <IconButton aria-label="Toggle Sidebar" icon={<Icon as={isExpanded ? ArrowLeftToLine : ArrowRightFromLine} />}
            variant="ghost" color="gray.400" _hover={{ bg: hoverBg, color: "white" }} onClick={toggleSidebar}
          />
        )}
      </Flex>
      
      {/* Main Menu Area - Pushes footer down */}
      <VStack
        spacing={2} align="stretch" flex="1" overflowY="auto" overflowX="hidden"
        css={{ "&::-webkit-scrollbar": { display: "none" }, "scrollbar-width": "none" }}
      >
        {isCategorized && isExpanded && (
          <Text px={3} py={2} fontSize="sm" fontWeight="bold" color="gray.400">
            {activeSuite}
          </Text>
        )}
        {itemsToRender.map((item) => (
          <MenuItem 
            key={item.label} item={item} isExpanded={isExpanded}
            location={location} openDropdown={openDropdown}
            handleDropdownToggle={handleDropdownToggle}
          />
        ))}
      </VStack>

      {/* --- MODIFIED: Footer section with Profile Menu and Suite Switcher --- */}
      <VStack spacing={2} align="stretch" mt={4}>
        {/* User Profile Menu - Visible only when expanded */}
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
                <Text as={Link} to="/profile" p={2} borderRadius="md" _hover={{bg: hoverBg}}>My Profile</Text>
                <Text onClick={handleLogout} p={2} borderRadius="md" cursor="pointer" _hover={{bg: hoverBg}}>Logout</Text>
              </VStack>
            </Collapse>
          </Box>
        )}
        
        {/* Suite Switcher */}
        {isCategorized && (
          <HStack
            justify="center"
            spacing={isExpanded ? 4 : 2}
            p={isExpanded ? 2 : 1}
            borderRadius="lg"
            bg="rgba(0,0,0,0.2)"
          >
            {/* --- MODIFIED: Show all suites when expanded, only active when collapsed --- */}
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
                  onClick={() => setActiveSuite(suite.title)}
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