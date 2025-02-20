import { useState } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, useToast } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { createDepartment } from "../../Redux/departmentSlice";

const AddDepartmentModal = ({ isOpen, onClose }) => {
  const [name, setName] = useState("");
  const dispatch = useDispatch();
  const toast = useToast();

  const organization_id = useSelector((state) => state.auth.organization_id); 

  const handleSubmit = async () => {
    try {
      await dispatch(createDepartment({name, organization_id}));
      toast({ title: "Department Created", status: "success", duration: 3000, isClosable: true });
      onClose();
    } catch (error) {
      toast({ title: "Error", description: error.message, status: "error", duration: 3000, isClosable: true });
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Department</ModalHeader>
        <ModalBody>
          <Input placeholder="Department Name" value={name} onChange={(e) => setName(e.target.value)} />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} mr={2}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSubmit}>Create</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddDepartmentModal;
