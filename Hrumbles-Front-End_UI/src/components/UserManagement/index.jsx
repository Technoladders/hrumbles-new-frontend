import { Box, Button, useDisclosure } from "@chakra-ui/react";
import AddDepartmentModal from "./AddDepartmentModal";
import AddDesignationModal from "./AddDesignationModal"; 
import UserManagementTree from "./UserManagementTree";

const UserManagement = () => {
  const { isOpen: isDepartmentOpen, onOpen: openDepartment, onClose: closeDepartment } = useDisclosure();
  const { isOpen: isDesignationOpen, onOpen: openDesignation, onClose: closeDesignation } = useDisclosure();

  return (
    <Box p={4}>
      <Button colorScheme="blue" onClick={openDepartment} mr={2}>+ Add Department</Button>
      <Button colorScheme="green" onClick={openDesignation}>+ Add Designation</Button>
      
      <AddDepartmentModal isOpen={isDepartmentOpen} onClose={closeDepartment} />
      <AddDesignationModal isOpen={isDesignationOpen} onClose={closeDesignation} />

      {/* Collapsible Tree View */}
      <UserManagementTree />
    </Box>
  );
};

export default UserManagement;
