import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  animation?: "fade" | "scale" | "slide" | "none";
  hoverEffect?: boolean;
  glassMorphism?: boolean;
  delay?: number;
  className?: string;
}

const AnimatedCard = ({
  children,
  animation = "fade",
  hoverEffect = true,
  glassMorphism = false,
  delay = 0,
  className,
  ...props
}: AnimatedCardProps) => {
  const variants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: animation === "scale" ? 0.9 : 1 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        delay: delay / 1000,
      }
    },
    hover: hoverEffect ? { 
      y: -5,
      scale: 1.02,
      transition: { duration: 0.3, ease: "easeOut" }
    } : {},
  };

  const getInitial = () => {
    switch (animation) {
      case "fade": return { opacity: 0, y: 10 };
      case "scale": return { scale: 0.95, opacity: 0 };
      case "slide": return { x: -20, opacity: 0 };
      default: return { opacity: 0 };
    }
  };

  const glassClass = glassMorphism 
    ? "bg-white/80 backdrop-blur-sm border border-white/20" 
    : "bg-white shadow-sm";

  return (
    <motion.div
      variants={variants}
      initial={getInitial()}
      animate="visible"
      whileHover="hover"
      className={cn(
        "rounded-xl p-6 overflow-hidden",
        glassClass,
        className
      )}
      {...props}
    >
      <AnimatePresence>
        {children}
      </AnimatePresence>
    </motion.div>
  );
};

export default AnimatedCard;