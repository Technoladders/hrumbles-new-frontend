'use client';

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence
} from 'motion/react';
import React, { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
  isActive?: boolean;
  id?: string;
};

export type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
  isActive?: boolean;
};

function DockItem({
  children,
  className = '',
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  isActive
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, val => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize
    };
    return val - rect.x - baseItemSize / 2;
  });

  // Calculate the size based on distance from mouse
  const targetSize = useTransform(
    mouseDistance, 
    [-distance, 0, distance], 
    [baseItemSize, magnification, baseItemSize]
  );
  
  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-2xl border-2 shadow-lg transition-colors duration-200 cursor-pointer ${className} ${
        isActive 
          ? 'bg-[#7731E8] border-[#7731E8] text-white shadow-[#7731E8]/50' 
          : 'bg-[#0a0a0a] border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:bg-neutral-900'
      }`}
      tabIndex={0}
      role="button"
      aria-pressed={isActive}
      whileTap={{ scale: 0.95 }}
      // Note: Removed whileHover={{ scale: 1.05 }} so it doesn't conflict with the physics zoom
    >
      {Children.map(children, child =>
        React.isValidElement(child)
          ? cloneElement(child as React.ReactElement<{ isHovered?: MotionValue<number> }>, { isHovered })
          : child
      )}
      {isActive && (
        <motion.div
          layoutId="activeSuiteIndicator"
          className="absolute -bottom-1 left-1/2 w-1 h-1 bg-white rounded-full"
          style={{ x: '-50%' }}
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </motion.div>
  );
}

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockLabel({ children, className = '', isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on('change', latest => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 5, scale: 0.9 }}
          animate={{ opacity: 1, y: -15, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className={`${className} absolute -top-8 left-1/2 w-fit whitespace-nowrap rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 py-1.5 text-xs font-medium text-white shadow-xl backdrop-blur-sm z-50`}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
          <div className="absolute -bottom-1 left-1/2 w-2 h-2 bg-[#0a0a0a] border-r border-b border-neutral-700 transform -translate-x-1/2 rotate-45" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockIcon({ children, className = '' }: DockIconProps) {
  // Ensure the icon centers perfectly
  return <div className={`flex w-full h-full items-center justify-center ${className}`}>{children}</div>;
}

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 80, // INCREASED: This controls how big it gets (was 56)
  distance = 140,     // Controls the curve width
  panelHeight = 68,   // Slightly increased to fit the larger hover state
  dockHeight = 256,
  baseItemSize = 40
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4), 
    [magnification, dockHeight]
  );
  
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <div className="w-full flex justify-center items-center py-3">
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1);
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        // CHANGED: gap-2 (was gap-2.5) makes the zoom wave feel smoother
        className={`${className} flex items-center gap-2 rounded-2xl border-2 border-neutral-800 bg-[#060010]/95 backdrop-blur-md px-3 py-2.5 shadow-2xl`}
        style={{ minHeight: panelHeight }}
        role="toolbar"
        aria-label="Suite navigation"
      >
        {items.map((item, index) => (
          <DockItem
            key={item.id || index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            isActive={item.isActive}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </div>
  );
}