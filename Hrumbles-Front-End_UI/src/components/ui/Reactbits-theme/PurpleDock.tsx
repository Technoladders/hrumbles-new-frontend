import React, { useRef, useState } from "react";
import { motion, MotionValue, useMotionValue, useSpring, useTransform } from "motion/react";
import { Box, Tooltip } from "@chakra-ui/react";
import { IconType } from "react-icons";

const MotionBox = motion(Box);

// Type definitions
interface SuiteItem {
  title: string;
  icon: IconType;
  items?: any[];
}

interface PurpleDockProps {
  items: SuiteItem[];
  onItemClick: (title: string) => void;
  activeItem: string;
}

interface DockIconProps {
  mouseX: MotionValue<number>;
  item: SuiteItem;
  isActive: boolean;
  onClick: () => void;
}

export function PurpleDock({ items, onItemClick, activeItem }: PurpleDockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(Infinity);

  return (
    <MotionBox
      ref={containerRef}
      onMouseMove={(e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          mouseX.set(e.clientX - rect.left);
        }
      }}
      onMouseLeave={() => mouseX.set(Infinity)}
      display="flex"
      alignItems="flex-end"
      gap={3}
      bg="#7B43F1"
      borderRadius="lg"
      px={4}
      py={3}
      justifyContent="center"
      mt="auto"
    >
      {items.map((item, index) => (
        <DockIcon
          key={index}
          mouseX={mouseX}
          item={item}
          isActive={activeItem === item.title}
          onClick={() => onItemClick(item.title)}
        />
      ))}
    </MotionBox>
  );
}

function DockIcon({ mouseX, item, isActive, onClick }: DockIconProps) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    const parent = ref.current?.parentElement?.getBoundingClientRect();
    
    if (!bounds || !parent) return 999;
    
    const elementX = bounds.left - parent.left + bounds.width / 2;
    return val - elementX;
  });

  const widthSync = useTransform(
    distance,
    [-150, 0, 150],
    [40, 64, 40]
  );

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const Icon = item.icon;

  return (
    <Tooltip 
      label={item.title} 
      placement="top"
      hasArrow
      bg="blackAlpha.900"
      color="white"
      fontSize="xs"
      px={3}
      py={2}
      borderRadius="md"
    >
      <MotionBox
        ref={ref}
        style={{ width }}
        position="relative"
      >
        <MotionBox
          as="button"
          onClick={onClick}
          display="flex"
          alignItems="center"
          justifyContent="center"
          width="100%"
          height="100%"
          minH="40px"
          bg={isActive ? "white" : "whiteAlpha.200"}
          color={isActive ? "#7B43F1" : "white"}
          borderRadius="xl"
          cursor="pointer"
          transition="background 0.2s"
          _hover={{
            bg: isActive ? "white" : "whiteAlpha.300",
          }}
          boxShadow={isActive ? "lg" : "none"}
          whileTap={{ scale: 0.95 }}
        >
          <Icon size={20} />
        </MotionBox>

        {/* Active Indicator */}
        {isActive && (
          <MotionBox
            position="absolute"
            bottom="-8px"
            left="50%"
            transform="translateX(-50%)"
            width="4px"
            height="4px"
            bg="white"
            borderRadius="full"
            layoutId="activeIndicator"
          />
        )}
      </MotionBox>
    </Tooltip>
  );
}

export default PurpleDock;