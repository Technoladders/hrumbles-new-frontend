
import { useState } from "react";

export const useProjectTimeData = () => {
  const [title, setTitle] = useState("");
  const [projectTimeData, setProjectTimeData] = useState<{[key: string]: {hours: number, report: string}}>({}); 
  const [totalWorkingHours, setTotalWorkingHours] = useState(8);

  const prepareClockInData = (notes: string) => {
    if (Object.keys(projectTimeData).length > 0) {
      const projectTimesArray = Object.entries(projectTimeData).map(([projectId, data]) => ({
        project_id: projectId,
        hours: data.hours,
        report: data.report
      }));

      return {
        notes: JSON.stringify({
          title,
          projectData: projectTimesArray
        }),
        project_time_data: projectTimesArray,
        total_working_hours: projectTimesArray.reduce((sum, project) => sum + project.hours, 0)
      };
    } else {
      return {
        notes,
        total_working_hours: totalWorkingHours
      };
    }
  };

  return {
    title,
    setTitle,
    projectTimeData,
    setProjectTimeData,
    totalWorkingHours,
    setTotalWorkingHours,
    prepareClockInData
  };
};
