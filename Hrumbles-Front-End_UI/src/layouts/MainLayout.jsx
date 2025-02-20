import { Box, Flex, IconButton, Input, InputGroup, InputLeftElement, Avatar, Menu, MenuButton, MenuList, MenuItem, useColorMode, Text, useMediaQuery } from "@chakra-ui/react";
import { FiSearch, FiBell, FiSun, FiLogOut, FiUser, FiMenu } from "react-icons/fi";
import { useState } from "react";
import { Outlet } from "react-router-dom"; 
import Sidebar from "../components/Sidebar/Sidebar";
import { signOut } from "../utils/api";

const MainLayout = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [isSidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile] = useMediaQuery("(max-width: 768px)"); // ✅ Detect mobile screens

  // ✅ Dynamically Adjust Sidebar Width Based on Expansion and Screen Size
  const sidebarWidth = isMobile ? (isSidebarExpanded ? "200px" : "0px") : isSidebarExpanded ? "200px" : "80px";
  

  return (
    <Flex height="100vh" overflow="hidden">
      {/* Mobile Toggle Button */}
      {isMobile && (
        <IconButton
          icon={<FiMenu />}
          aria-label="Toggle Sidebar"
          position="fixed"
          top="70px"
          left="10px"
          zIndex="1000"
          onClick={() => setSidebarExpanded(!isSidebarExpanded)}
          size="lg"
          variant="ghost"
          color="gray.600"
        />
      )}

      {/* Fixed Sidebar */}
      <Box
        as="nav"
        position="fixed"
        left={0}
        top={0}
        bottom={0}
        width={sidebarWidth}
        transition="width 0.3s ease"
        bg={colorMode === "dark" ? "base.bgdark" : "#F6F6FC"}
        display={isMobile && !isSidebarExpanded ? "none" : "block"} // ✅ Hide on Mobile When Collapsed
      >
        <Sidebar isExpanded={isSidebarExpanded} setExpanded={setSidebarExpanded} />
      </Box>

      {/* Main Content Area */}
      <Flex direction="column" flex="1" ml={sidebarWidth} transition="margin-left 0.3s ease">
        {/* Fixed Header */}
        <Flex
          as="header"
          width={`calc(100% - ${sidebarWidth})`}
          justify="space-between"
          align="center"
          p={4}
          bg={colorMode === "dark" ? "base.bgdark" : "white"}
          position="fixed"
          top={0}
          height="60px"
          zIndex={10}
          transition="width 0.3s ease"
        >
          {/* Left Section - Search Bar */}
          <Flex align="center" gap={2} minWidth="250px">
            <InputGroup width="20em" height="2.5em">
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

          {/* Right Section - Icons and User Profile */}
          <Flex align="center" gap={4}>
            <IconButton icon={<FiBell />} size="lg" aria-label="Notifications" variant="ghost" color={colorMode === "dark" ? "white" : "base.greylg"} />
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
                    <Text fontSize="sm" fontWeight="bold">Kamesh Thirumalaisamy</Text>
                    <Text fontSize="xs" color="gray.500">kamesh.t@technoladders.com</Text>
                  </Box>
                  <Avatar size="sm" name="Kamesh Thirumalaisamy" src="/user-avatar.png" />
                </Flex>
              </MenuButton>
              <MenuList>
                <MenuItem icon={<FiUser />}>View Profile</MenuItem>
                <MenuItem onClick={signOut} icon={<FiLogOut />}>Logout</MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>

        {/* Main Content - Only Content is Scrollable */}
        <Box flex="1" overflowY="auto" p={6} mt="60px" bg={colorMode}>
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};

export default MainLayout;
