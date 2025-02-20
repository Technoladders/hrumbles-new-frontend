import { Box, Text, Button, Flex, IconButton, useColorModeValue, Progress, Stat, StatLabel, StatNumber } from "@chakra-ui/react";
import { FiTrendingUp, FiPlus, FiMoreVertical } from "react-icons/fi";

const CustomCard = ({ title, count, progress, buttonText, variant = "default", children, ...props }) => {
  // Define colors based on theme mode
  const bgLight = useColorModeValue("white", "base.bgdark");
  const bgSecondary = useColorModeValue("base.sidebar", "base.greydk");
  const bgPrimary = useColorModeValue("base.primary1", "base.primary2");
  const textColor = useColorModeValue("black", "white");
  const iconColor = useColorModeValue("gray.600", "gray.300");
  const borderColor = useColorModeValue("base.greylg", "base.bglight");

  // Dynamic shadow color for elevation effect
  const shadowLight = "4px 4px 10px rgba(0, 0, 0, 0.1)";
  const shadowDark = "4px 4px 15px rgba(255, 255, 255, 0.2)";
  const boxShadow = useColorModeValue(shadowLight, shadowDark);

  const variants = {
    default: { bg: bgLight, border: "1px solid", borderColor, boxShadow },
    elevated: { bg: bgLight, boxShadow, borderRadius: "md" },
    outlined: { bg: "transparent", border: "2px solid", borderColor },
    primary: { bg: bgPrimary, color: "white", boxShadow },
    secondary: { bg: bgSecondary, color: "white", boxShadow },
  };

  return (
    <Box p={6} borderRadius="lg" {...variants[variant]} {...props}>
      {/* Card Header */}
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color={textColor}>
          {title}
        </Text>
        <IconButton icon={<FiMoreVertical />} variant="ghost" aria-label="More" />
      </Flex>

      {/* Card Content - Counter & Progress */}
      <Flex align="center" justify="space-between">
        <Stat>
          <StatLabel fontSize="sm" color="gray.500">Total</StatLabel>
          <StatNumber fontSize="2xl">{count}</StatNumber>
        </Stat>
        <IconButton icon={<FiTrendingUp />} colorScheme="green" variant="ghost" aria-label="Trending" />
      </Flex>

      {progress !== undefined && (
        <Progress mt={3} value={progress} colorScheme="purple" borderRadius="md" />
      )}

      {/* Card Footer */}
      <Flex mt={4} justify="space-between">
        <Button leftIcon={<FiPlus />} colorScheme="purple" variant="solid">{buttonText}</Button>
        {children}
      </Flex>
    </Box>
  );
};

export default CustomCard;
