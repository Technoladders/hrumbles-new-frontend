import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    useColorModeValue,
  } from "@chakra-ui/react";
import { Button, Card, InputField, Text } from "./index";

  
  const CustomModal = ({ isOpen, onClose, title, variant = "default", onSave, children }) => {
    const bg = useColorModeValue("box.bgboxlight", "box.bgboxdark");
    const headerColor = useColorModeValue("gray.800", "white");
    const primaryColor = useColorModeValue("base.primary1", "base.primary1");
    const secondaryColor = useColorModeValue("gray.500", "#DB3070");
  
    const variants = {
      default: {
        size: "md",
      },
      small: {
        size: "sm",
      },
      large: {
        size: "lg",
      },
      full: {
        size: "full",
      },
    };
  
    return (
      <Modal isOpen={isOpen} onClose={onClose} size={variants[variant].size}>
        <ModalOverlay />
        <ModalContent bg={bg}>
          <ModalHeader color={headerColor}>{title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{children}</ModalBody>
          <ModalFooter>
            <Button size="xs" mr={3} onClick={onSave}>
              Save
            </Button>
            <Button size="xs" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };
  
  export default CustomModal;
  