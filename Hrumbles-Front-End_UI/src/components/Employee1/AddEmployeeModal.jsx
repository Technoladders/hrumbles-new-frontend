import { useState, useEffect } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, useToast } from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { createEmployee } from "../../Redux/employeeSlice";
import { fetchDepartments, fetchDesignations } from "../../Redux/departmentSlice";

const AddEmployeeModal = ({ isOpen, onClose }) => {
  const toast = useToast();
  const dispatch = useDispatch();
  const { organization_id } = useSelector((state) => state.auth); // ✅ Fetch organization_id from Redux

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    employee_id:"",
    phone: "",
    department_id: "",
    designation_id: "",
  });

  // ✅ Fetch Departments & Designations on Open
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchDepartments());
      dispatch(fetchDesignations());
    }
  }, [isOpen, dispatch]);

  // ✅ Get Departments & Designations from Redux
  const { departments } = useSelector((state) => state.departments);
  const { designations } = useSelector((state) => state.departments);

  // ✅ Filter Designations Based on Selected Department
  const filteredDesignations = designations.filter(
    (desig) => desig.department_id === formData.department_id
  );

  // 🔹 Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ Reset Designation if Department Changes
    if (name === "department_id") {
      setFormData({ ...formData, department_id: value, designation_id: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // ✅ Submit Form
  const handleSubmit = async () => {
    if (!formData.department_id || !formData.designation_id) {
      toast({ title: "Error", description: "Select a department and designation.", status: "error", duration: 3000, isClosable: true });
      return;
    }

    try {
      await dispatch(createEmployee({ ...formData, organization_id: organization_id }));
      toast({ title: "Employee Created", status: "success", duration: 3000, isClosable: true });
      onClose();
    } catch (error) {
      toast({ title: "Error", description: error.message, status: "error", duration: 3000, isClosable: true });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add New Employee</ModalHeader>
        <ModalBody>
          <Input placeholder="First Name" name="firstName" value={formData.firstName} onChange={handleChange} mb={2} />
          <Input placeholder="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} mb={2} />
          <Input placeholder="Email" name="email" value={formData.email} onChange={handleChange} mb={2} />
          <Input placeholder="Password" name="password" type="password" value={formData.password} onChange={handleChange} mb={2} />
          <Input placeholder="Employee ID" name="employee_id" value={formData.employee_id} onChange={handleChange} mb={2} />
          <Input placeholder="Phone" name="phone" value={formData.phone} onChange={handleChange} mb={2} />

          {/* ✅ Select Department */}
          <Select placeholder="Select Department" name="department_id" value={formData.department_id} onChange={handleChange} mb={2}>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </Select>

          {/* ✅ Select Designation (Filtered by Department) */}
          <Select placeholder="Select Designation" name="designation_id" value={formData.designation_id} onChange={handleChange} mb={2} disabled={!formData.department_id}>
            {filteredDesignations.length > 0 ? (
              filteredDesignations.map((desig) => (
                <option key={desig.id} value={desig.id}>{desig.name}</option>
              ))
            ) : (
              <option value="">No Designations Available</option>
            )}
          </Select>

        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} mr={2}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSubmit}>Add Employee</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddEmployeeModal;
