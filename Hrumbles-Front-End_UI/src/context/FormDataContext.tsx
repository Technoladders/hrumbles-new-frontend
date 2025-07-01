
import React, { createContext, useContext, useState } from "react";

interface FormDataContextType {
  title: string;
  workReport: string;
  workingHours: number;
  projectReports: { [key: string]: string };
  projectTimeAllocation: { [key: string]: number };
  updateTitle: (title: string) => void;
  updateWorkReport: (report: string) => void;
  updateWorkingHours: (hours: number) => void;
  updateProjectReport: (projectId: string, report: string) => void;
  updateProjectTimeAllocation: (projectId: string, hours: number) => void;
}

const FormDataContext = createContext<FormDataContextType>({
  title: "",
  workReport: "",
  workingHours: 8,
  projectReports: {},
  projectTimeAllocation: {},
  updateTitle: () => {},
  updateWorkReport: () => {},
  updateWorkingHours: () => {},
  updateProjectReport: () => {},
  updateProjectTimeAllocation: () => {},
});

export const useFormData = () => useContext(FormDataContext);

interface FormDataProviderProps {
  children: React.ReactNode;
}

export const FormDataProvider: React.FC<FormDataProviderProps> = ({ children }) => {
  const [title, setTitle] = useState("");
  const [workReport, setWorkReport] = useState("");
  const [workingHours, setWorkingHours] = useState(8);
  const [projectReports, setProjectReports] = useState<{ [key: string]: string }>({});
  const [projectTimeAllocation, setProjectTimeAllocation] = useState<{ [key: string]: number }>({});

  const updateTitle = (title: string) => {
    setTitle(title);
  };

  const updateWorkReport = (report: string) => {
    setWorkReport(report);
  };

  const updateWorkingHours = (hours: number) => {
    setWorkingHours(hours);
  };

  const updateProjectReport = (projectId: string, report: string) => {
    setProjectReports((prev) => ({
      ...prev,
      [projectId]: report,
    }));
  };

  const updateProjectTimeAllocation = (projectId: string, hours: number) => {
    setProjectTimeAllocation((prev) => ({
      ...prev,
      [projectId]: hours,
    }));
  };

  return (
    <FormDataContext.Provider
      value={{
        title,
        workReport,
        workingHours,
        projectReports,
        projectTimeAllocation,
        updateTitle,
        updateWorkReport,
        updateWorkingHours,
        updateProjectReport,
        updateProjectTimeAllocation,
      }}
    >
      {children}
    </FormDataContext.Provider>
  );
};
