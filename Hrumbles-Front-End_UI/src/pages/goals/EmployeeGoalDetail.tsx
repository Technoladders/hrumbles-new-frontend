// src/pages/goals/EmployeeGoalDetail.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Target, Percent, CheckCircle, Trophy, Calendar, ChevronLeft, ChevronRight, Save, Edit } from "lucide-react";
import { GoalWithDetails, Employee, AssignedGoal, GoalInstance } from "@/types/goal";
import { getGoalById } from "@/lib/supabaseData";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { format, isBefore, isAfter, startOfToday, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ITEMS_PER_PAGE = 10;
const LIMIT = 10;

const EmployeeGoalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [goal, setGoal] = useState<GoalWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const initialEmployee = location.state?.employee as Employee | null;
  const [isUpdatingInstance, setIsUpdatingInstance] = useState<string | null>(null);
  const [updateCurrentValue, setUpdateCurrentValue] = useState<number>(0);

  const paramGoalType = searchParams.get("type") || "Daily";
  const instanceFilter = searchParams.get("period") as "past" | "current" | "upcoming" | "past-current" || "past-current";
  const pageParam = searchParams.get("page") || "1";
  const currentPage = parseInt(pageParam, 10);
  const itemsPerPage = parseInt(searchParams.get("limit") || "10", 10);

  const fullEmployee = initialEmployee || employee;

  // Fetch current employee if not provided
  useEffect(() => {
    const fetchCurrentEmployee = async () => {
      if (initialEmployee) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: empData } = await supabase
            .from('hr_employees')
            .select('*')
            .eq('id', user.id)
            .single();
          if (empData) setEmployee(empData as Employee);
        }
      } catch (error) {
        console.error('Error fetching employee:', error);
      }
    };

    fetchCurrentEmployee();
  }, [initialEmployee]);

  console.log("employee goallss", goal)

  useEffect(() => {
    if (id && fullEmployee) {
      fetchGoalDetails();
    }
  }, [id, fullEmployee]);

    // Available goal types for this employee
  const availableGoalTypes = useMemo(() => {
    if (!goal || !fullEmployee) return [];
    const assignments = goal.assignments?.filter(a => a.employeeId === fullEmployee.id) || [];
    const types = [...new Set(assignments.map(a => a.goalType))];
    const order = ["Daily", "Weekly", "Monthly", "Yearly"];
    return types.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [goal, fullEmployee]);

  // Sync searchParams with available types after goal loads
  useEffect(() => {
    if (goal && fullEmployee && availableGoalTypes.length > 0) {
      const validType = availableGoalTypes.find(t => t === paramGoalType);
      if (!validType) {
        const defaultType = availableGoalTypes[0];
        const params = new URLSearchParams(searchParams);
        params.set('type', defaultType);
        params.set('page', '1');
        setSearchParams(params, { replace: true });
      }
    }
  }, [goal, fullEmployee, availableGoalTypes, paramGoalType, searchParams, setSearchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (paramGoalType !== "Daily") params.set("type", paramGoalType);
    if (instanceFilter !== "past-current") params.set("period", instanceFilter);
    if (currentPage !== 1) params.set("page", currentPage.toString());
    if (itemsPerPage !== 10) params.set("limit", itemsPerPage.toString());
    setSearchParams(params, { replace: true });
  }, [paramGoalType, instanceFilter, currentPage, itemsPerPage, setSearchParams]);

  const fetchGoalDetails = async () => {
    setLoading(true);
    try {
      const goalData = await getGoalById(id!);
      setGoal(goalData);
    } catch (error) {
      console.error("Error fetching goal details:", error);
      toast.error("Failed to load goal details.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoalTypeChange = (value: string) => {
    setSearchParams({ type: value, period: instanceFilter, page: "1" });
  };

  const handleInstanceFilterChange = (value: "past" | "current" | "upcoming" | "past-current") => {
    setSearchParams({ type: paramGoalType, period: value, page: "1" });
  };

  const handleItemsPerPageChange = (value: string) => {
    setSearchParams({ type: paramGoalType, period: instanceFilter, page: "1", limit: value });
  };

  const handlePageChange = (page: number) => {
    setSearchParams({ type: paramGoalType, period: instanceFilter, page: page.toString() });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "overdue": return "bg-red-100 text-red-800";
      case "pending": return "bg-amber-100 text-amber-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };



  // Filtered assignments for selected type
  const filteredAssignments = useMemo(() => {
    if (!goal || !fullEmployee) return [];
    return goal.assignments?.filter(a => a.employeeId === fullEmployee.id && a.goalType === paramGoalType) || [];
  }, [goal, fullEmployee, paramGoalType]);

  // All instances for selected type
  const allInstances = useMemo(() => {
    const instances: GoalInstance[] = [];
    filteredAssignments.forEach((assignment) => {
      (goal?.instances || []).forEach((instance) => {
        if (instance.assignedGoalId === assignment.id) {
          instances.push(instance);
        }
      });
    });
    return instances;
  }, [filteredAssignments, goal?.instances]);

  // Filtered instances by period filter
  const filteredInstances = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfDay(todayStart);
    return allInstances.filter((inst) => {
      const periodStart = startOfDay(new Date(inst.periodStart));
      const periodEnd = endOfDay(new Date(inst.periodEnd));
      switch (instanceFilter) {
        case "past":
          return isBefore(periodEnd, todayStart);
        case "upcoming":
          return isAfter(periodStart, todayEnd);
        case "current":
          return !isAfter(periodStart, todayEnd) && !isBefore(periodEnd, todayStart);
        default: // past-current
          return !isAfter(periodStart, todayEnd);
      }
    });
  }, [allInstances, instanceFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredInstances.length / itemsPerPage);
  const paginatedInstances = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInstances.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInstances, currentPage, itemsPerPage]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (filteredInstances.length === 0) return { overallProgress: 0, totalPeriods: 0, completedPeriods: 0, bestProgress: 0 };
    const totalCurrent = filteredInstances.reduce((sum, i) => sum + (i.currentValue || 0), 0);
    const totalTarget = filteredInstances.reduce((sum, i) => sum + (i.targetValue || 1), 0);
    const overallProgress = Math.min(Math.round((totalCurrent / totalTarget) * 100), 100);
    const completedPeriods = filteredInstances.filter(i => i.status === 'completed').length;
    const bestProgress = Math.max(...filteredInstances.map(i => i.progress || 0));
    return { overallProgress, totalPeriods: filteredInstances.length, completedPeriods, bestProgress };
  }, [filteredInstances]);

  // Chart data: last 12 periods (chronological, sorted by start date ascending)
  const chartData = useMemo(() => {
    return filteredInstances
      .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
      .slice(-12)
      .map((inst) => ({
        name: format(new Date(inst.periodStart), 'MMM d'),
        current: inst.currentValue || 0,
        target: inst.targetValue || 0,
        progress: inst.progress || 0,
      }));
  }, [filteredInstances]);

  // Handle update instance
  const handleUpdateInstance = async (instanceId: string, currentInstance: GoalInstance) => {
    setIsUpdatingInstance(instanceId);
    setUpdateCurrentValue(currentInstance.currentValue || 0);
  };

  const handleSaveUpdate = async (instanceId: string) => {
    try {
      const { error } = await supabase
        .from('hr_goal_instances')
        .update({ current_value: updateCurrentValue, updated_at: new Date().toISOString() })
        .eq('id', instanceId);
      if (error) throw error;
      toast.success("Progress updated successfully");
      setIsUpdatingInstance(null);
      fetchGoalDetails();
    } catch (error) {
      toast.error("Failed to update progress");
    }
  };

  if (loading || !fullEmployee) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!goal || availableGoalTypes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Goal Not Found</h2>
        <Button onClick={() => navigate('/goalsview')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      </div>
    );
  }

  const selectedType = availableGoalTypes.find(t => t === paramGoalType) || availableGoalTypes[0];

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate('/goalsview')} className="mb-4 pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">{goal.name}</h1>
          <p className="text-gray-500 mt-1 max-w-3xl">{goal.description}</p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-4 flex justify-between items-start border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-gray-500">My Progress</p>
            <h3 className="text-3xl font-bold">{summaryStats.overallProgress}%</h3>
            <Progress value={summaryStats.overallProgress} className="w-full mt-2 h-2" />
          </div>
          <div className="p-2 bg-blue-100 rounded-lg ml-4">
            <Target className="text-blue-600" size={22} />
          </div>
        </Card>
        <Card className="p-4 flex justify-between items-start border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-gray-500">Total Periods</p>
            <h3 className="text-3xl font-bold">{summaryStats.totalPeriods}</h3>
          </div>
          <div className="p-2 bg-green-100 rounded-lg ml-4">
            <Calendar className="text-green-600" size={22} />
          </div>
        </Card>
        <Card className="p-4 flex justify-between items-start border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <h3 className="text-3xl font-bold">{summaryStats.completedPeriods}</h3>
          </div>
          <div className="p-2 bg-yellow-100 rounded-lg ml-4">
            <CheckCircle className="text-yellow-600" size={22} />
          </div>
        </Card>
        <Card className="p-4 flex justify-between items-start border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-gray-500">Best Performance</p>
            <h3 className="text-3xl font-bold">{Math.round(summaryStats.bestProgress)}%</h3>
          </div>
          <div className="p-2 bg-purple-100 rounded-lg ml-4">
            <Trophy className="text-purple-600" size={22} />
          </div>
        </Card>
      </div>

      {/* Tabbed view for goal types */}
      <Tabs value={selectedType} onValueChange={handleGoalTypeChange} className="w-full">
        <TabsList>
          {availableGoalTypes.map(type => (
            <TabsTrigger key={type} value={type}>{type} Goals</TabsTrigger>
          ))}
        </TabsList>
        {availableGoalTypes.map(type => (
          <TabsContent key={type} value={type} className="space-y-6 mt-4">
            {/* Performance Trend Chart */}
            <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
              <CardHeader className="p-6">
                <CardTitle className="text-xl font-semibold text-gray-800">Performance Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {chartData.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={chartData} margin={{ top: 20, right: 40, left: 40, bottom: 20 }}>
                        <defs>
                          <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#3b82f6' }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="progress" name="Progress" stroke="#10b981" strokeWidth={3} fill="url(#progressGradient)" />
                        <Bar dataKey="current" name="Current" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-gray-500 bg-gray-50 rounded-lg">
                    <p>No data available for the last 12 periods.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Period Filter and Pagination Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Filter by Period:</span>
                <Select value={instanceFilter} onValueChange={handleInstanceFilterChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="past-current">Past & Current</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
              <div className="text-sm text-gray-500">
                Showing {paginatedInstances.length} of {filteredInstances.length} periods
              </div>
            </div>

            {/* Goal Instances Table */}
            <Card className="w-full border border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Goal Periods ({selectedType})
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      Start: {formatDate(goal.start_date)} - End: {formatDate(goal.end_date)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredInstances.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No {instanceFilter} periods found for {selectedType}.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Progress</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current / Target</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedInstances.map((instance) => {
                            const instanceProgress = instance.progress || 0;
                            const status = instance.status || "pending";

                            return (
                              <tr key={instance.id} className="transition-all duration-200 ease-in-out hover:shadow-sm hover:bg-gray-50">
                                <td className="px-4 py-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="text-sm font-medium">{Math.round(instanceProgress)}%</span>
                                    <Progress value={instanceProgress} className="h-2 w-24 mt-1" />
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-700">
                                  {isUpdatingInstance === instance.id ? (
                                    <div className="flex gap-2 items-center">
                                      <Input
                                        type="number"
                                        value={updateCurrentValue}
                                        onChange={(e) => setUpdateCurrentValue(Number(e.target.value))}
                                        className="w-16"
                                      />
                                      <span>/ {instance.targetValue} {goal.metricUnit}</span>
                                    </div>
                                  ) : (
                                    `${instance.currentValue || 0} / ${instance.targetValue} ${goal.metricUnit}`
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  <Badge className={getStatusColor(status)}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-500">
                                  {formatDate(instance.periodStart)} - {formatDate(instance.periodEnd)}
                                </td>
                                <td className="px-4 py-4">
                                  {isUpdatingInstance === instance.id ? (
                                    <div className="flex gap-2">
                                      <Button variant="ghost" size="sm" onClick={() => handleSaveUpdate(instance.id)}>
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => setIsUpdatingInstance(null)}>
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button variant="ghost" size="sm" onClick={() => handleUpdateInstance(instance.id, instance)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-sm text-gray-600">
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredInstances.length)} to {Math.min(currentPage * itemsPerPage, filteredInstances.length)} of {filteredInstances.length} periods
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default EmployeeGoalDetail;