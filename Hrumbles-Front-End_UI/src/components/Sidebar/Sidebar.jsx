import { VStack, IconButton, Tooltip, Box, Text, Flex, useColorModeValue, Icon, Image, useMediaQuery } from "@chakra-ui/react";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { menuItemsByRole, extraMenuItems } from "./SidebarMenuItem";
import { logout } from "../../Redux/authSlice"; // 🚀 Import Logout Action

const Sidebar = ({ isExpanded, setExpanded }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { role } = useSelector((state) => state.auth);
  const menuItems = menuItemsByRole[role] || [];
  const [isMobile] = useMediaQuery("(max-width: 768px)");

  const bgColor = useColorModeValue("#F6F6FC", "base.bgdark");
  const hoverBg = useColorModeValue("rgba(123, 67, 241, 0.1)", "secondary.800");
  const activeBg = useColorModeValue("rgba(123, 67, 241, 0.3)", "brand.activeBg");
  const textColor = useColorModeValue("black", "white");
  const iconColor = useColorModeValue("gray.600", "gray.300");
  const activeIconColor = useColorModeValue("#7B43F1", "base.primary1");
  const activeTextColor = useColorModeValue("#7B43F1", "base.primary1");
  const scrolbarColor = useColorModeValue("#F6F6FC", "base.bgboxdark");

  // ✅ Handle Logout Function
  const handleLogout = () => {
    dispatch(logout()); // 🚀 Logout via Redux
    navigate("/login"); // 🚀 Redirect to Login
  };

  return (
    <Flex
      direction="column"
      bg={bgColor}
      color={textColor}
      height="100vh"
      width={isExpanded ? "200px" : "80px"} // ✅ Fixed Collapse Size
      transition="width 0.3s ease-in-out"
      position="fixed"
      left={0}
      top={0}
      bottom={0}
      p={4}
      boxShadow="sm"
      justifyContent="space-between"
      onMouseEnter={() => !isMobile && setExpanded(true)}
      onMouseLeave={() => !isMobile && setExpanded(false)}
      display={isMobile && !isExpanded ? "none" : "flex"} // ✅ Hide on Mobile When Collapsed
    >
      {/* Sidebar Header */}
      <Box textAlign="center" mb={6}>
        <Image src="/hr-icon.svg" alt="Logo" boxSize={isExpanded ? "50px" : "40px"} transition="box-size 0.3s ease" mb={2} />
        {isExpanded && <Text fontSize="md" fontWeight="bold">Hello!</Text>}
        {isExpanded && <Text fontSize="sm" color="gray.500">Good Morning</Text>}
      </Box>

      {/* Scrollable Menu */}
      <VStack
        spacing={2}
        overflowY="auto"
        flex="1"
        borderRadius="12px"
        transition="border-radius 0.3s ease"
        boxShadow="lg"
        bg={scrolbarColor}
        css={{
          "&::-webkit-scrollbar": { width: "6px", display: "none" },
          "&::-webkit-scrollbar-thumb": { background: "#888", borderRadius: "4px" },
          "scroll-behavior": "smooth",
        }}
      >
        {menuItems.map(({ icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Tooltip key={label} label={label} placement="right" isDisabled={isExpanded}>
              <Flex
                as={path !== "#" ? Link : "div"}
                to={path !== "#" ? path : undefined}
                align="center"
                gap={1}
                px={isExpanded ? 4 : 2}
                py={1}
                borderRadius="12px"
                bg={isActive ? activeBg : "transparent"}
                _hover={{ bg: hoverBg }}
                transition="background 0.3s ease-in-out"
                w="full"
                cursor={path !== "#" ? "pointer" : "default"}
              >
                <IconButton
                  icon={<Icon as={icon} color={isActive ? activeIconColor : iconColor} />}
                  aria-label={label}
                  variant="ghost"
                  size="md"
                  _hover={{ color: activeIconColor }}
                />
                {isExpanded && <Text fontWeight={isActive ? "bold" : "normal"} color={isActive ? activeTextColor : textColor}>{label}</Text>}
              </Flex>
            </Tooltip>
          );
        })}
      </VStack>

      {/* Extra Menu Items (Try Premium, Logout) */}
      <VStack spacing={4} mt={4}>
        {extraMenuItems.map(({ icon, label, action }) => (
          <Tooltip key={label} label={label} placement="right" isDisabled={isExpanded}>
            <Flex
              align="center"
              gap={4}
              px={isExpanded ? 4 : 2}
              py={3}
              borderRadius="12px"
              _hover={{ bg: hoverBg }}
              transition="background 0.3s ease-in-out"
              w="full"
              cursor="pointer"
              onClick={action === "logout" ? handleLogout : undefined} // ✅ Logout Click Handler
            >
              <IconButton
                icon={<Icon as={icon} color={iconColor} />}
                aria-label={label}
                variant="ghost"
                size="md"
                _hover={{ color: activeIconColor }}
              />
              {isExpanded && <Text fontWeight="normal" color={textColor}>{label}</Text>}
            </Flex>
          </Tooltip>
        ))}
      </VStack>
    </Flex>
  );
};

export default Sidebar;

//Responsive Sidebar
