
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { useEmployees } from "./useEmployees";
import { useProjectData } from "./useProjectData";

export const useDashboardData = () => {
  const [timeLogs, setTimeLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { employees, currentEmployee } = useEmployees();
  const { projects } = useProjectData();
  const [dailyData, setDailyData] = useState([]);
  const [topTimeLoggedEmployees, setTopTimeLoggedEmployees] = useState([]);
  const [topActiveEmployees, setTopActiveEmployees] = useState([]);
  const [weeklyTotals, setWeeklyTotals] = useState({
    totalHours: 0,
    totalMinutes: 0,
    changePercentage: 7.5,
    isPositive: false
  });
  const [projectBreakdown, setProjectBreakdown] = useState([]);
  const [ongoingTasks, setOngoingTasks] = useState([]);

  const CHART_COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981'];
  
  const calculateStats = (data: any[]) => {
    let totalMinutes = 0;
    data.forEach(log => {
      if (log.duration_minutes) {
        totalMinutes += log.duration_minutes;
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    setWeeklyTotals({
      totalHours: hours,
      totalMinutes: minutes,
      changePercentage: 7.5,
      isPositive: false
    });
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      
      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      setTimeLogs(data || []);
      calculateStats(data || []);
      
      const dummyTimeLoggedEmployees = employees.slice(0, 5).map((emp, index) => ({
        id: emp.id,
        name: emp.name,
        timeLogged: `${48 - index * 5}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        percent: 95 - (index * 10)
      }));
      
      setTopTimeLoggedEmployees(dummyTimeLoggedEmployees);
      
      const dummyActiveEmployees = employees.slice(0, 5).map((emp, index) => ({
        id: emp.id,
        name: emp.name,
        percent: 95 - (index * 10),
        color: index < 3 ? '#10b981' : '#f59e0b'
      }));
      
      setTopActiveEmployees(dummyActiveEmployees);
      
      const dummyDailyData = [];
      for (let i = 0; i < 7; i++) {
        const date = subDays(new Date(), 6 - i);
        dummyDailyData.push({
          day: format(date, 'EEE').toLowerCase(),
          date: format(date, 'd'),
          hours: Math.floor(Math.random() * 12),
          dayNumber: i + 1
        });
      }
      
      setDailyData(dummyDailyData);
      
      const projectData = projects.slice(0, 4).map((project, index) => ({
        name: project.name,
        value: 25 - (index * 3),
        time: `${4 + index}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        color: CHART_COLORS[index]
      }));
      
      setProjectBreakdown(projectData);
      
      const dummyTasks = [
        {
          id: 1,
          name: "Product Showcase",
          project: "Ship Code",
          time: "41:56:27",
          bgColor: "bg-blue-50"
        },
        {
          id: 2,
          name: "Database Design",
          project: "Common Room",
          time: "29:17:34",
          bgColor: "bg-green-50"
        },
        {
          id: 3,
          name: "Lead Generation",
          project: "Marketing",
          time: "18:45:12",
          bgColor: "bg-yellow-50"
        },
        {
          id: 4,
          name: "Fixing Page Speed",
          project: "Frontend",
          time: "12:33:56",
          bgColor: "bg-purple-50"
        }
      ];
      
      setOngoingTasks(dummyTasks);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentEmployee]);

  return {
    isLoading,
    weeklyTotals,
    dailyData,
    topTimeLoggedEmployees,
    topActiveEmployees,
    projectBreakdown,
    ongoingTasks
  };
};
