import { useState, useEffect } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, useToast } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { createDesignation, fetchDepartments } from "../../Redux/departmentSlice";

const AddDesignationModal = ({ isOpen, onClose }) => {
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState(""); // ✅ Store selected department ID
  const dispatch = useDispatch();
  const toast = useToast();

  // ✅ Fetch Departments on Modal Open
  useEffect(() => {
    dispatch(fetchDepartments());
  }, [dispatch]);

  // ✅ Get Departments from Redux
  const { departments } = useSelector((state) => state.departments);

  const handleSubmit = async () => {
    if (!departmentId) {
      toast({ title: "Error", description: "Select a department first.", status: "error", duration: 3000, isClosable: true });
      return;
    }

    try {
      await dispatch(createDesignation({ department_id: departmentId, name }));
      toast({ title: "Designation Created", status: "success", duration: 3000, isClosable: true });
      onClose();
    } catch (error) {
      toast({ title: "Error", description: error.message, status: "error", duration: 3000, isClosable: true });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Designation</ModalHeader>
        <ModalBody>
          {/* ✅ Select Department */}
          <Select placeholder="Select Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} mb={2}>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </Select>

          {/* ✅ Enter Designation Name */}
          <Input placeholder="Designation Name" value={name} onChange={(e) => setName(e.target.value)} />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} mr={2}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSubmit}>Create</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddDesignationModal;
