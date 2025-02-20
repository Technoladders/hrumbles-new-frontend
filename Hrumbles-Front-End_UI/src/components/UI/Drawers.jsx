import {
    Drawer,
    DrawerOverlay,
    DrawerContent,
    DrawerHeader,
    DrawerBody,
    DrawerFooter,
    DrawerCloseButton,
    Button,
    useColorModeValue,
  } from "@chakra-ui/react";
  
  const CustomDrawer = ({ isOpen, onClose, title, variant = "default", onSave, children }) => {
    const bg = useColorModeValue("box.bgboxlight", "box.bgboxdark");
    const headerColor = useColorModeValue("gray.800", "white");
    const primaryColor = useColorModeValue("base.primary1", "base.primary2");
    const secondaryColor = useColorModeValue("gray.500", "gray.400");
  
    const variants = {
      default: { size: "md" },
      small: { size: "sm" },
      large: { size: "lg" },
      full: { size: "full" },
    };
  
    return (
      <Drawer isOpen={isOpen} onClose={onClose} size={variants[variant].size} placement="right">
        <DrawerOverlay />
        <DrawerContent bg={bg}>
          <DrawerCloseButton />
          <DrawerHeader color={headerColor}>{title}</DrawerHeader>
          <DrawerBody>{children}</DrawerBody>
          <DrawerFooter>
            <Button bg={primaryColor} color="white" mr={3} _hover={{ bg: "brand.hover" }} onClick={onSave}>
              Save
            </Button>
            <Button bg={secondaryColor} color="white" _hover={{ bg: "gray.600" }} onClick={onClose}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  };
  
  export default CustomDrawer;
  