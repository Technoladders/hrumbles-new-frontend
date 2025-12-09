import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// Import the NEW action created above
import { createEmployeeRecord } from "../../Redux/employeeSlice"; 
import { fetchDepartments, fetchDesignations } from "../../Redux/departmentSlice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { supabase } from "@/integrations/supabase/client";

// Defined interfaces (Removed Password)
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  employee_id: string;
  phone: string;
  department_id: string;
  designation_id: string;
  hire_type: string;
  salary: string;
  salary_type: string;
  joining_date: string;
}

interface RootState {
  auth: { organization_id: string };
  departments: { departments: any[]; designations: any[] };
}

// Utility functions for INR formatting
const formatINR = (value: string): string => {
  if (!value) return "";
  const num = parseFloat(value.replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
};

const parseINR = (value: string): string => {
  return value.replace(/,/g, "");
};

// Reusable FormInput component
const FormInput: React.FC<any> = ({
  label,
  placeholder,
  name,
  value,
  onChange,
  type = "text",
  suffix,
  formattedValue,
  required = false,
}) => (
  <div>
    <Label htmlFor={name} className="mb-1 block">
      {label} {required && <span className="text-red-500">*</span>}
    </Label>
    <div className="relative">
      <Input
        id={name}
        placeholder={placeholder}
        name={name}
        value={formattedValue !== undefined ? formattedValue : value}
        onChange={onChange}
        type={type}
        className="w-full pr-10"
        required={required}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

// Reusable FormSelect component
const FormSelect: React.FC<any> = ({
  label,
  placeholder,
  name,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
}) => (
  <div>
    <Label htmlFor={name} className="mb-1 block">
      {label} {required && <span className="text-red-500">*</span>}
    </Label>
    <Select value={value} onValueChange={onChange} disabled={disabled || options.length === 0}>
      <SelectTrigger id={name} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.length > 0 ? (
          options.map((option: any) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        ) : (
          <div className="px-2 py-1 text-sm text-gray-500">No Options Available</div>
        )}
      </SelectContent>
    </Select>
  </div>
);

interface AddRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordAdded: () => void;
}

const AddRecordsModal: React.FC<AddRecordsModalProps> = ({ isOpen, onClose, onRecordAdded }) => {
  const dispatch = useDispatch();
  const { organization_id } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    // No Password
    employee_id: "",
    phone: "",
    department_id: "",
    designation_id: "",
    hire_type: "Full Time",
    salary: "",
    salary_type: "LPA",
    joining_date: "",
  });

  const [formattedSalary, setFormattedSalary] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchDepartments() as any);
      dispatch(fetchDesignations() as any);
    }
  }, [isOpen, dispatch]);

  const { departments, designations } = useSelector((state: RootState) => state.departments);

  const filteredDesignations = designations.filter(
    (desig) => desig.department_id === formData.department_id
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "salary") {
      const rawValue = parseINR(value);
      if (rawValue === "" || !isNaN(Number(rawValue))) {
        setFormData({ ...formData, salary: rawValue });
        setFormattedSalary(formatINR(rawValue));
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handlePhoneChange = (value: string | undefined) => {
    setFormData({ ...formData, phone: value || "" });
  };

  const handleSelectChange = (name: keyof FormData) => (value: string) => {
    if (name === "department_id") {
      setFormData({ ...formData, department_id: value, designation_id: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async () => {
    // Check for mandatory fields (Removed Password check)
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.employee_id) {
      toast.error("First Name, Last Name, Email, and Employee ID are required fields.");
      return;
    }
    
    if (!formData.department_id || !formData.designation_id || !formData.hire_type) {
        toast.error("Department, Designation, and Type of Hire are required fields.");
        return;
    }

    try {
      // Check organization's credit limit for employees
      const { data: orgData, error: orgError } = await supabase
        .from('hr_organizations')
        .select('role_credit_limits')
        .eq('id', organization_id)
        .single();

      if (orgError) throw new Error('Could not verify organization details.');
      
      const creditLimit = orgData?.role_credit_limits?.employee;

      if (typeof creditLimit === 'number') {
        const { count, error: countError } = await supabase
          .from('hr_employees')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', '28f74164-1f9b-4eb2-b418-17d8d8232871')
          .eq('organization_id', organization_id);

        if (countError) throw new Error('Failed to count existing employees.');

        if (count !== null && count >= creditLimit) {
          toast.error(`Employee credit limit of ${creditLimit} has been reached. Cannot add more records.`);
          return;
        }
      }

      // Prepare employee data
      const employeeData = {
        ...formData,
        organization_id,
        joining_date: formData.joining_date || null,
        salary: formData.salary || 0,
      };

      // Call the NEW Thunk (Create Record Only)
      await dispatch(createEmployeeRecord(employeeData) as any).unwrap();
      
      toast.success("Employee Record Added (No Login Access)");
      onRecordAdded(); 
      onClose();
   } catch (error: any) {
    console.error("Failed to create record:", error);
    const errorMessage = 
      error?.payload?.message || 
      error?.message || 
      'An error occurred while creating the record.';
    
    toast.error(errorMessage);
  }
  };

  const departmentOptions = departments.map((dept) => ({
    value: dept.id,
    label: dept.name,
  }));

  const designationOptions = filteredDesignations.map((desig) => ({
    value: desig.id,
    label: desig.name,
  }));

  const hireTypeOptions = [
    { value: "Full Time", label: "Full Time" },
    { value: "Contract", label: "Contract" },
    { value: "Internship", label: "Internship" },
    { value: "Part Time", label: "Part Time" },
  ];

  const salaryTypeOptions = [
      { value: "LPA", label: "LPA" },
      { value: "Monthly", label: "Monthly" },
      { value: "Hourly", label: "Hourly" },
      { value: "Stipend", label: "Stipend" },
    ];


  const salarySuffix =
    formData.salary_type === "LPA"
      ? "₹"
      : formData.salary_type === "Monthly"
      ? "₹/mo"
      : formData.salary_type === "Hourly"
      ? "₹/hr"
      : "₹";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardContent className="pt-8">
          <h2 className="text-lg font-semibold mb-4">Add Employee Record (Non-Login)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              placeholder="Enter first name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <FormInput
              label="Last Name"
              placeholder="Enter last name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
            <FormInput
              label="Email"
              placeholder="Enter email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              required
            />
            
            {/* PASSWORD INPUT REMOVED */}

            <FormInput
              label="Employee ID"
              placeholder="Enter employee ID"
              name="employee_id"
              value={formData.employee_id}
              onChange={handleChange}
              required
            />
            <div>
              <Label htmlFor="phone" className="mb-1 block">
                Phone
              </Label>
              <PhoneInput
                id="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handlePhoneChange}
                defaultCountry="IN"
                international
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ paddingRight: "2.5rem" }}
              />
            </div>

            <FormSelect
                label="Type of Hire"
                placeholder="Select Type of Hire"
                name="hire_type"
                value={formData.hire_type}
                onChange={handleSelectChange("hire_type")}
                options={hireTypeOptions}
                required
              />
            <FormSelect
              label="Department"
              placeholder="Select Department"
              name="department_id"
              value={formData.department_id}
              onChange={handleSelectChange("department_id")}
              options={departmentOptions}
              required
            />
            <FormSelect
              label="Designation"
              placeholder="Select Designation"
              name="designation_id"
              value={formData.designation_id}
              onChange={handleSelectChange("designation_id")}
              options={designationOptions}
              disabled={!formData.department_id}
              required
            />
          
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
               {/* <FormInput
                label="Salary"
                placeholder="Enter salary"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                type="text"
                suffix={salarySuffix}
                formattedValue={formattedSalary}
              />
              <FormSelect
                label="Salary Type"
                placeholder="Select Salary Type"
                name="salary_type"
                value={formData.salary_type}
                onChange={handleSelectChange("salary_type")}
                options={salaryTypeOptions}
              /> */}
              <FormInput
                label="Joining Date"
                placeholder="Select joining date"
                name="joining_date"
                value={formData.joining_date}
                onChange={handleChange}
                type="date"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-[#7731E8] hover:bg-[#6528cc]">
              Add Record
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddRecordsModal;