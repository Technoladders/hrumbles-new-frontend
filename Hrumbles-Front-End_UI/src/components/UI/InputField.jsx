
import { Input, FormControl, FormLabel, useColorModeValue } from "@chakra-ui/react";

const InputField = ({ label, variant = "outline", size = "md", borderRadius = "md", ...props }) => {
  const borderColor = useColorModeValue("gray.300", "gray.600");
  const focusBorderColor = useColorModeValue("base.primary1", "base.primary2");
  const bg = useColorModeValue("base.bglight", "base.bgdark");
  const textColor = useColorModeValue("black", "white");

  const sizes = {
    sm: { height: "32px", fontSize: "14px", px: "10px" },
    md: { height: "40px", fontSize: "16px", px: "12px" },
    lg: { height: "48px", fontSize: "18px", px: "14px" },
  };

  const borderRadii = {
    sm: "4px",
    md: "8px",
    lg: "12px",
  };

  const variants = {
    outline: {
      border: `1px solid ${borderColor}`,
      _hover: { border: `2px solid ${borderColor}` },
      _focus: { border: `2px solid ${focusBorderColor}` },
    },
    filled: {
      bg: useColorModeValue("gray.200", "gray.700"),
      _hover: { bg: useColorModeValue("gray.300", "gray.600") },
      _focus: { bg: useColorModeValue("gray.100", "gray.500"), borderColor: focusBorderColor },
    },
    flushed: {
      borderBottom: `2px solid ${borderColor}`,
      borderRadius: "0",
      _focus: { borderBottom: `2px solid ${focusBorderColor}` },
    },
    underlined: {
      borderBottom: `2px solid ${borderColor}`,
      borderRadius: "0",
      _focus: { borderBottom: `2px solid ${focusBorderColor}` },
      padding: "4px 0",
    },
  };

  return (
    <FormControl>
      {label && <FormLabel color={textColor}>{label}</FormLabel>}
      <Input {...variants[variant]} {...sizes[size]} borderRadius={borderRadii[borderRadius]} color={textColor} bg={bg} {...props} />
    </FormControl>
  );
};

export default InputField;