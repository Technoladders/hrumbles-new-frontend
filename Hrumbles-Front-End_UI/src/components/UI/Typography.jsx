import { Text as ChakraText, useColorModeValue } from "@chakra-ui/react";

const CustomText = ({ variant = "body", children, ...props }) => {
  // Define colors for light and dark modes
  const headingColor = useColorModeValue("base.primary2", "white");
  const textColor = useColorModeValue("base.greydk", "base.greylg");
  const secondaryColor = useColorModeValue("base.greylg", "base.greydk");
  const backgroundColor = useColorModeValue("base.bglight", "base.bgdark");

  const styles = {
    h1: { fontSize: "2xl", fontWeight: "bold", color: headingColor },
    h2: { fontSize: "xl", fontWeight: "semibold", color: headingColor },
    h3: { fontSize: "lg", fontWeight: "medium", color: headingColor },
    h4: { fontSize: "md", fontWeight: "medium", color: headingColor },
    h5: { fontSize: "sm", fontWeight: "normal", color: headingColor },
    h6: { fontSize: "xs", fontWeight: "normal", color: headingColor },
    
    subtitle: { fontSize: "lg", fontWeight: "semibold", color: secondaryColor },
    
    body: { fontSize: "md", fontWeight: "normal", color: textColor },
    bodyLg: { fontSize: "lg", fontWeight: "normal", color: textColor },
    bodySm: { fontSize: "sm", fontWeight: "normal", color: textColor },
    bodyXs: { fontSize: "xs", fontWeight: "normal", color: textColor },
    
    small: { fontSize: "sm", fontWeight: "light", color: secondaryColor },
    caption: { fontSize: "xs", fontWeight: "light", color: secondaryColor },
  };

  return <ChakraText {...styles[variant]} {...props}>{children}</ChakraText>;
};

export default CustomText;
