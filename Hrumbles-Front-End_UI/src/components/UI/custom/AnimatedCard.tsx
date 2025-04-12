
import React from "react";
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
  // Animation class based on the animation prop
  const getAnimationClass = () => {
    switch (animation) {
      case "fade":
        return "opacity-0 animate-slide-up-fade";
      case "scale":
        return "opacity-0 scale-in";
      case "slide":
        return "opacity-0 slide-in-right";
      default:
        return "";
    }
  };

  // Hover effect class
  const hoverClass = hoverEffect
    ? "transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1"
    : "";

  // Glass morphism class
  const glassClass = glassMorphism ? "glass" : "";

  return (
    <div
      className={cn(
        "rounded-lg p-5 shadow-sm",
        getAnimationClass(),
        hoverClass,
        glassClass,
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "forwards",
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default AnimatedCard;
