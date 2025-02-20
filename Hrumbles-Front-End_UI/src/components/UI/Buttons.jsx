import { Button as ChakraButton, useColorModeValue } from "@chakra-ui/react";

const Button = ({ variant = "solid", size = "md", children, ...props }) => {
  const primaryBg = useColorModeValue("base.primary1", "base.primary2");
  const hoverBg = useColorModeValue("brand.hover", "brand.secondaryBg");
  const hoverghostBg = useColorModeValue("brand.hover", "brand.secondarybg");


  const sizes = {
    xs: { height: "24px", fontSize: "10px", px: "8px" },  
    sm: { height: "32px", fontSize: "11px", px: "12px" },
    md: { height: "40px", fontSize: "12px", px: "16px" },
    lg: { height: "48px", fontSize: "13px", px: "20px" },
    xl: { height: "56px", fontSize: "14px", px: "24px" },  
  };

  const variants = {
    solid: { bg: primaryBg, color: "white", _hover: { bg: hoverBg } },
    outline: { border: `2px solid ${primaryBg}`, color: primaryBg, _hover: { bg: primaryBg, color: "white" } },
    ghost: { bg: "transparent", color: primaryBg, _hover: { bg: hoverghostBg } },
    link: { bg: "transparent", color: primaryBg, textDecoration: "underline", _hover: { color: hoverBg } },
  };

  return <ChakraButton {...variants[variant]} {...sizes[size]} {...props}>{children}</ChakraButton>;
};

export default Button;
