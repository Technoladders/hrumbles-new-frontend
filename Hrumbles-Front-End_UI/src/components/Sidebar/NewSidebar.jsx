import {
  VStack, IconButton, Tooltip, Box, Text, Flex, Icon, Collapse, HStack, useMediaQuery, Divider
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useSelector } from "react-redux";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { menuItemsByRole } from "./SidebarMenuItem";
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import supabase from "../../config/supabaseClient";

// 1. MEMOIZED MENU ITEM - Entry animations removed to prevent flickering/reloading feel
const MenuItem = memo(({ item, isExpanded, currentPath, openDropdown, handleDropdownToggle }) => {
  const { icon, label, path, dropdown } = item;
  const isDropdownOpen = openDropdown === label;

  const isActive = useMemo(() => {
    if (currentPath === path || (path !== '/' && currentPath.startsWith(`${path}/`))) return true;
    if (path === '/jobs') {
      const jobRelatedPrefixes = ['/resume-analysis', '/jobstatuses'];
      if (jobRelatedPrefixes.some(prefix => currentPath.startsWith(prefix))) return true;
    }
    if (dropdown && dropdown.some(sub => currentPath.startsWith(sub.path))) return true;
    return false;
  }, [currentPath, path, dropdown]);

  const activeBg = "#7B43F1";
  const MotionFlex = motion(Flex);

  return (
    <Box key={label} w="full">
      <Tooltip label={label} placement="right" isDisabled={isExpanded}>
        <MotionFlex
          as={Link}
          to={path}
          align="center"
          p={3}
          borderRadius="lg"
          cursor="pointer"
          justify={isExpanded ? "flex-start" : "center"}
          bg={isActive ? activeBg : "transparent"}
          color={isActive ? "white" : "black"}
          _hover={{ bg: isActive ? activeBg : "#eee7f1" }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            if (dropdown) handleDropdownToggle(label, e);
          }}
        >
          <Icon as={icon} fontSize="16px" />
          {isExpanded && (
            <Flex justify="space-between" align="center" w="full" ml={4} >
              <Box position="relative" display="inline-block">
                <Text fontWeight="medium" fontSize="sm">{label}</Text>
                {item.beta && (
                  <Box position="absolute" top="-5px" right="-34px" fontSize="9px" fontWeight="bold" px={1.5} py="1px" borderRadius="sm" bg="red.500" color="white" lineHeight="1" textTransform="uppercase">
                    Beta
                  </Box>
                )}
              </Box>
              {dropdown && <Icon as={isDropdownOpen ? ChevronUpIcon : ChevronDownIcon} />}
            </Flex>
          )}
        </MotionFlex>
      </Tooltip>
      {dropdown && isExpanded && (
        <Collapse in={isDropdownOpen} animateOpacity>
          <VStack pl={10} mt={1} spacing={1} align="start">
            {dropdown.map((subItem) => (
              <Text
                key={subItem.label}
                as={Link}
                to={subItem.path}
                fontSize="xs"
                p={2}
                w="full"
                borderRadius="md"
                color={currentPath === subItem.path ? "#7B43F1" : "gray.600"}
                fontWeight={currentPath === subItem.path ? "bold" : "normal"}
                _hover={{ color: "#7B43F1" }}
              >
                {subItem.label}
              </Text>
            ))}
          </VStack>
        </Collapse>
      )}
    </Box>
  );
});

const NewSidebar = memo(({ isExpanded, toggleSidebar, headerHeight }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { userPermissions } = useSelector((state) => state.permissions);
  const { role, organization_id: organizationId } = useSelector((state) => state.auth);
  const [isMobile] = useMediaQuery("(max-width: 768px)");

  const [organizationDetails, setOrganizationDetails] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeSuite, setActiveSuite] = useState(() => localStorage.getItem('activeSuite') || "GENERAL SUITE");

  useEffect(() => {
    if (role === 'organization_superadmin' && organizationId) {
      supabase.from('hr_organizations').select('id, subscription_features').eq('id', organizationId).single()
        .then(({ data }) => setOrganizationDetails(data));
    }
  }, [role, organizationId]);

  // Stable Menu Configuration
  const menuConfig = useMemo(() => {
    if (role === 'global_superadmin') return menuItemsByRole.global_superadmin || [];
    const source = menuItemsByRole[role];
    if (!source) return [];
    return source(organizationId, organizationDetails, false, userPermissions);
  }, [role, organizationDetails, userPermissions, organizationId]);

  // Detect if menu is Suite-based or Flat-based
  const isCategorized = useMemo(() => 
    Array.isArray(menuConfig) && menuConfig.length > 0 && !!menuConfig[0].title
  , [menuConfig]);

  // Determine which items to show
  const currentItems = useMemo(() => {
    if (!isCategorized) return menuConfig; // Return flat list for Global Superadmin
    return menuConfig.find(suite => suite.title === activeSuite)?.items || [];
  }, [isCategorized, menuConfig, activeSuite]);

  const handleDropdownToggle = useCallback((label, e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(prev => prev === label ? null : label);
  }, []);

  const handleSuiteChange = useCallback((suiteTitle) => {
    if (suiteTitle !== activeSuite) {
      setActiveSuite(suiteTitle);
      localStorage.setItem('activeSuite', suiteTitle);
      const suite = menuConfig.find(s => s.title === suiteTitle);
      if (suite?.items?.[0]?.path) navigate(suite.items[0].path);
    }
  }, [activeSuite, menuConfig, navigate]);

  return (
    <Flex
      direction="column"
      bg="white"
      height={`calc(100vh - ${headerHeight})`}
      width={isExpanded ? "210px" : "74px"}
      transition="width 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      position="fixed"
      left={0}
      top={headerHeight}
      p={isExpanded ? 3 : 2}
      zIndex={20}
      borderRight="1px solid #E2E8F0"
    >
      {!isMobile && (
        <IconButton
          position="absolute"
          top="-10px"
          right="-12px"
          size="xs"
          isRound
          bg="white"
          border="1px solid #E2E8F0"
          icon={isExpanded ? <ChevronsLeft size={14}/> : <ChevronsRight size={14}/>}
          onClick={toggleSidebar}
          _hover={{ bg: "#7B43F1", color: "white" }}
        />
      )}

      <VStack spacing={4} align="stretch" flex="1" overflowY="auto" css={{ "&::-webkit-scrollbar": { display: "none" } }}>
        
        {/* Only show Suite Icons if the menu is categorized (Org-level) */}
        {isCategorized && isExpanded && menuConfig.length > 0 && (
          <HStack spacing={3} justify="center" py={2}>
            {menuConfig.map((suite) => (
              <Tooltip key={suite.title} label={suite.title}>
                <IconButton
                  icon={<suite.icon size="18px" />}
                  aria-label={suite.title}
                  onClick={() => handleSuiteChange(suite.title)}
                  bg={activeSuite === suite.title ? "#7B43F1" : "whiteAlpha.800"}
                  color={activeSuite === suite.title ? "white" : "gray.500"}
                  _hover={{ bg: activeSuite === suite.title ? "#7B43F1" : "gray.100" }}
                  size="md"
                  borderRadius="xl"
                />
              </Tooltip>
            ))}
          </HStack>
        )}

        {/* Display Suite Title only for categorized menus */}
        {isCategorized && isExpanded && (
          <Text px={2} fontSize="xs" fontWeight="bold" color="gray.400" letterSpacing="wider">
            {activeSuite}
          </Text>
        )}

        <VStack spacing={1} align="stretch">
          {currentItems.map((item) => (
            <MenuItem 
              key={item.label} 
              item={item} 
              isExpanded={isExpanded} 
              currentPath={pathname} 
              openDropdown={openDropdown} 
              handleDropdownToggle={handleDropdownToggle} 
            />
          ))}
        </VStack>
      </VStack>
    </Flex>
  );
});

export default NewSidebar;