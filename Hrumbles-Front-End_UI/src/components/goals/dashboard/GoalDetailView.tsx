"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, Target, Calendar, Users, Clock, BarChart3, CheckCircle, Edit, Trash2, Save, ChevronRight } from "lucide-react"
import { format, isBefore, isAfter, startOfToday, startOfDay, endOfDay } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { getGoalsWithDetails, updateGoalInstance, deleteGoalInstance } from "@/lib/goalService"
import type { GoalWithDetails, AssignedGoal, GoalInstance, Employee } from "@/types/goal"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Line, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, ComposedChart, Area, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import Loader from "@/components/ui/Loader"

const GoalDetailView: React.FC = () => {
  const { goalId, goalType: paramGoalType } = useParams<{ goalId: string; goalType?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [goal, setGoal] = useState<GoalWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGoalType, setSelectedGoalType] = useState<string>(paramGoalType || "Daily")
  const initialFilter = searchParams.get("instanceFilter") || "current"
  const [instanceFilter, setInstanceFilter] = useState<"current" | "past" | "upcoming">(initialFilter as "current" | "past" | "upcoming")
  const [currentPage, setCurrentPage] = useState<number>(parseInt(searchParams.get("page") || "1", 10))
  const [itemsPerPage, setItemsPerPage] = useState<number>(parseInt(searchParams.get("limit") || "10", 10))
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null)
  const [editTargetValue, setEditTargetValue] = useState<number>(0)
  const [editCurrentValue, setEditCurrentValue] = useState<number>(0)
  const [chartView, setChartView] = useState<'topCurrent' | 'topProgress' | 'all'>('topCurrent')
  const [currentChartPage, setCurrentChartPage] = useState(0)

  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (chartView === 'all') {
      setCurrentChartPage(0)
    }
  }, [chartView])

  const fetchGoalData = async () => {
    setIsLoading(true)
    try {
      const goals = await getGoalsWithDetails()
      const selectedGoal = goals.find((g) => g.id === goalId)
      if (!selectedGoal) {
        toast({
          title: "Error",
          description: "Goal not found.",
          variant: "destructive",
        })
        navigate("/goals")
        return
      }
      setGoal(selectedGoal)
    } catch (error) {
      console.error("Error fetching goal details:", error)
      toast({
        title: "Error",
        description: "Failed to load goal details.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (goalId) {
      fetchGoalData()
    }
  }, [goalId, navigate, toast])

  useEffect(() => {
    const params = new URLSearchParams()
    if (instanceFilter !== "current") params.set("instanceFilter", instanceFilter)
    if (currentPage !== 1) params.set("page", currentPage.toString())
    if (itemsPerPage !== 10) params.set("limit", itemsPerPage.toString())
    setSearchParams(params, { replace: true })
  }, [instanceFilter, currentPage, itemsPerPage, setSearchParams])

  const handleGoalTypeChange = (value: string) => {
    setSelectedGoalType(value)
    navigate(`/goals/${goalId}/${value}`)
  }

  const handleInstanceFilterChange = (value: "current" | "past" | "upcoming") => {
    setInstanceFilter(value)
    setCurrentPage(1)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10))
    setCurrentPage(1)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A"
    try {
      return format(new Date(dateStr), "MMM d, yyyy")
    } catch (e) {
      console.error("Invalid date:", dateStr)
      return "Invalid date"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const availableGoalTypes = useMemo(() => {
    if (!goal?.assignments) return []
    const types = new Set(goal.assignments.map((a: AssignedGoal) => a.goal_type))
    return Array.from(types).sort((a, b) => {
      const order = ["Daily", "Weekly", "Monthly", "Yearly"]
      return order.indexOf(a) - order.indexOf(b)
    })
  }, [goal?.assignments])

  const allAssignments = useMemo(() => goal?.assignments || [], [goal?.assignments])

  const filteredAssignments = useMemo(() => {
    return goal?.assignments?.filter((a: AssignedGoal) => a.goal_type === selectedGoalType) || []
  }, [goal?.assignments, selectedGoalType])

  const totalAssignments = allAssignments.length
  const completedAssignments = allAssignments.filter((a: AssignedGoal) => a.status === "completed").length
  const overdueAssignments = allAssignments.filter((a: AssignedGoal) => a.status === "overdue").length

  const overallProgress = useMemo(() => {
    if (totalAssignments === 0) return 0
    const totalCurrent = allAssignments.reduce((sum, a) => sum + (a.current_value || 0), 0)
    const totalTarget = allAssignments.reduce((sum, a) => sum + (a.target_value || 1), 0)
    return Math.min(Math.round((totalCurrent / totalTarget) * 100), 100)
  }, [allAssignments])

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>()
    goal?.assignedTo?.forEach((employee: Employee) => {
      map.set(employee.id, employee)
    })
    return map
  }, [goal?.assignedTo])

  const allInstances = useMemo(() => {
    const instances: (GoalInstance & { employee_id: string; assignment_id: string })[] = []
    filteredAssignments.forEach((assignment: AssignedGoal) => {
      ;(assignment.instances || []).forEach((instance: GoalInstance) => {
        instances.push({
          ...instance,
          employee_id: assignment.employee_id,
          assignment_id: assignment.id,
        })
      })
    })
    return instances
  }, [filteredAssignments])

  const filteredInstances = useMemo(() => {
    const todayStart = startOfToday()
    const todayEnd = endOfDay(todayStart)
    return allInstances.filter((inst) => {
      const periodStart = startOfDay(new Date(inst.period_start))
      const periodEnd = endOfDay(new Date(inst.period_end))
      switch (instanceFilter) {
        case "past":
          return isBefore(periodEnd, todayStart)
        case "upcoming":
          return isAfter(periodStart, todayEnd)
        case "current":
          return !isAfter(periodStart, todayEnd) && !isBefore(periodEnd, todayStart)
        default:
          return true
      }
    })
  }, [allInstances, instanceFilter])

  const totalPages = Math.ceil(filteredInstances.length / itemsPerPage)
  const paginatedInstances = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredInstances.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredInstances, currentPage, itemsPerPage])

  const comparisonMetrics = useMemo(() => {
    const totalCurrent = filteredInstances.reduce((sum, i) => sum + (i.current_value || 0), 0)
    const totalTarget = filteredInstances.reduce((sum, i) => sum + (i.target_value || 0), 0)
    const avgProgress =
      filteredInstances.length > 0
        ? Math.round(filteredInstances.reduce((sum, i) => sum + (i.progress || 0), 0) / filteredInstances.length)
        : 0

    return {
      totalCurrent,
      totalTarget,
      avgProgress,
      variance: totalTarget > 0 ? Math.round(((totalCurrent - totalTarget) / totalTarget) * 100) : 0,
    }
  }, [filteredInstances])

  const baseChartData = useMemo(() => {
    return filteredInstances.map((inst) => {
      const employee = employeeMap.get(inst.employee_id)
      const fullName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown'
      const name = fullName.length > 15 ? `${fullName.slice(0, 15)}...` : fullName
      return {
        name,
        fullName,
        current: inst.current_value || 0,
        target: inst.target_value || 0,
        progress: inst.progress || 0,
      }
    })
  }, [filteredInstances, employeeMap])

  const getSortedData = useMemo(() => {
    const topCurrent = [...baseChartData].sort((a, b) => b.current - a.current).slice(0, 10)
    const topProgress = [...baseChartData].sort((a, b) => b.progress - a.progress).slice(0, 10)
    const allData = [...baseChartData].sort((a, b) => a.fullName.localeCompare(b.fullName))
    return { topCurrent, topProgress, all: allData }
  }, [baseChartData])

  const chartDataForView = useMemo(() => {
    switch (chartView) {
      case 'topCurrent':
        return getSortedData.topCurrent
      case 'topProgress':
        return getSortedData.topProgress
      case 'all':
        return getSortedData.all
      default:
        return []
    }
  }, [chartView, getSortedData])

  const displayData = useMemo(() => {
    if (chartView === 'all') {
      const start = currentChartPage * ITEMS_PER_PAGE
      return chartDataForView.slice(start, start + ITEMS_PER_PAGE)
    }
    return chartDataForView
  }, [chartDataForView, chartView, currentChartPage])

  const handleEditInstance = (instance: GoalInstance) => {
    setEditingInstanceId(instance.id)
    setEditTargetValue(instance.target_value)
    setEditCurrentValue(instance.current_value)
  }

  const handleSaveInstance = async (instanceId: string) => {
    const updated = await updateGoalInstance(instanceId, {
      target_value: editTargetValue,
      current_value: editCurrentValue,
      status: editCurrentValue >= editTargetValue ? "completed" : "in-progress",
    })

    if (updated) {
      setEditingInstanceId(null)
      await fetchGoalData()
      toast({
        title: "Instance Updated",
        description: "Goal instance has been successfully updated.",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to update goal instance.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteInstance = async (instanceId: string) => {
    const success = await deleteGoalInstance(instanceId)
    if (success) {
      await fetchGoalData()
      toast({
        title: "Instance Deleted",
        description: "Goal instance has been successfully deleted.",
      })
    } else {
      toast({
        title: "Error",
        description: "Failed to delete goal instance.",
        variant: "destructive",
      })
    }
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null
    const startIndex = (currentPage - 1) * itemsPerPage
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm text-gray-600">
          Showing {Math.min(startIndex + 1, filteredInstances.length)} to {Math.min(startIndex + itemsPerPage, filteredInstances.length)} of {filteredInstances.length} instances
        </span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-2 text-gray-500">Loading goal details...</p>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Goal not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-4 md:p-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/goals")} className="h-9 w-9 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{goal.name}</h1>
              <p className="text-gray-500 text-sm">{goal.sector || "General"} Sector</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-4 flex justify-between items-start border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-gray-500">Overall Progress</p>
            <h3 className="text-3xl font-bold">{overallProgress}%</h3>
            <Progress value={overallProgress} className="w-full mt-2 h-2" />
          </div>
          <div className="p-2 bg-blue-100 rounded-lg ml-4">
            <Target className="text-blue-600" size={22} />
          </div>
        </Card>

        <Card className="p-4 flex justify-between items-start border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-gray-500">Total Assignments</p>
            <h3 className="text-3xl font-bold">{totalAssignments}</h3>
          </div>
          <div className="p-2 bg-green-100 rounded-lg ml-4">
            <Users className="text-green-600" size={22} />
          </div>
        </Card>

        <Card className="p-4 flex justify-between items-start border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <h3 className="text-3xl font-bold">{completedAssignments}</h3>
          </div>
          <div className="p-2 bg-yellow-100 rounded-lg ml-4">
            <CheckCircle className="text-yellow-600" size={22} />
          </div>
        </Card>

        <Card className="p-4 flex justify-between items-start border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-gray-500">Overdue</p>
            <h3 className="text-3xl font-bold">{overdueAssignments}</h3>
          </div>
          <div className="p-2 bg-red-100 rounded-lg ml-4">
            <Clock className="text-red-600" size={22} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Current vs Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Value</span>
                <span className="text-2xl font-bold text-blue-600">{comparisonMetrics.totalCurrent}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Target Value</span>
                <span className="text-2xl font-bold text-gray-900">{comparisonMetrics.totalTarget}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Variance</span>
                  <Badge variant={comparisonMetrics.variance >= 0 ? "default" : "destructive"}>
                    {comparisonMetrics.variance > 0 ? "+" : ""}
                    {comparisonMetrics.variance}%
                  </Badge>
                </div>
                <Progress value={Math.min(Math.abs(comparisonMetrics.variance), 100)} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Average Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      strokeDasharray={`${(comparisonMetrics.avgProgress / 100) * 339.29} 339.29}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold">{comparisonMetrics.avgProgress}%</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-gray-600">{filteredInstances.length} instances tracked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
          <h2 className="text-xl md:text-xl font-semibold text-gray-800">
            Performance Trend Analysis
          </h2>
          <div className="flex items-center gap-2">
            <Button variant={chartView === 'topCurrent' ? 'default' : 'outline'} size="sm" onClick={() => setChartView('topCurrent')}>Top 10 Current</Button>
            <Button variant={chartView === 'topProgress' ? 'default' : 'outline'} size="sm" onClick={() => setChartView('topProgress')}>Top 10 Progress</Button>
            <Button variant={chartView === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setChartView('all')}>Show All</Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {displayData.length > 0 ? (
            <div className="h-[250px]">
              <div className="overflow-x-auto h-full">
                <div style={{ minWidth: `${displayData.length * 80}px`, height: '100%' }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart
                      data={displayData}
                      margin={{ top: 20, right: 40, left: 40, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
                        </linearGradient>
                        <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="50%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        angle={0}
                        textAnchor="middle"
                        interval={0}
                        height={50}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        tickCount={5}
                        tick={{ fontSize: 11, fill: '#3b82f6', fontWeight: '600' }}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: `Current ${goal.metric_unit || 'Value'}`, angle: -90, position: "insideLeft", style: { textAnchor: 'middle', fill: '#3b82f6' } }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickCount={5}
                        tick={{ fontSize: 11, fill: '#10b981', fontWeight: '600' }}
                        axisLine={false}
                        tickLine={false}
                        label={{ value: "Progress %", angle: 90, position: "insideRight", style: { textAnchor: 'middle', fill: '#10b981' } }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(10px)", border: "none", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                        formatter={(value, name) => {
                          if (name === 'current') {
                            return [`${Number(value).toLocaleString()} ${goal.metric_unit || 'units'}`, name]
                          }
                          return [`${Number(value)}%`, name]
                        }}
                        labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                      />
                      <Legend verticalAlign="top" height={46} wrapperStyle={{ fontSize: "14px", color: "#4b5563", paddingBottom: "20px" }} iconType="rect" />
                      <Area yAxisId="right" type="monotone" dataKey="progress" name="Progress" stroke="#10b981" strokeWidth={3} fill="url(#progressGradient)" fillOpacity={1} />
                      <Bar yAxisId="left" dataKey="current" name="Current" fill="url(#currentGradient)" radius={[10, 10, 0, 0]} maxBarSize={60} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {chartView === 'all' && baseChartData.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-center gap-4 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentChartPage(prev => Math.max(prev - 1, 0))}
                    disabled={currentChartPage === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm font-medium text-gray-600">
                    Page {currentChartPage + 1} of {Math.ceil(baseChartData.length / ITEMS_PER_PAGE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentChartPage(prev => Math.min(prev + 1, Math.ceil(baseChartData.length / ITEMS_PER_PAGE) - 1))}
                    disabled={currentChartPage >= Math.ceil(baseChartData.length / ITEMS_PER_PAGE) - 1}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px] text-gray-500 bg-gray-50 rounded-lg">
              <p>No data to display for the selected filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Goal Instances ({selectedGoalType})
              </CardTitle>
              <p className="text-sm text-gray-500">
                Start: {formatDate(goal.start_date)} - End: {formatDate(goal.end_date)}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <Tabs value={selectedGoalType} onValueChange={handleGoalTypeChange}>
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
                  {availableGoalTypes.map((type) => (
                    <TabsTrigger key={type} value={type}>
                      {type}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                {(["current", "past", "upcoming"] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={instanceFilter === f ? "default" : "outline"}
                    onClick={() => handleInstanceFilterChange(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInstances.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No {instanceFilter} instances found for {selectedGoalType}.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left"
                      >
                        Employee
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center"
                      >
                        Progress
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Current / Target
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Period
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedInstances.map((instance) => {
                      const employee = employeeMap.get(instance.employee_id)
                      if (!employee) return null
                      const instanceProgress = instance.progress || 0

                      return (
                        <tr
                          key={instance.id}
                          className="transition-all duration-200 ease-in-out hover:shadow-sm hover:bg-gray-50"
                        >
                          <td className="px-4 py-4">
                            <p className="font-medium text-sm text-gray-900">
                              {employee.first_name} {employee.last_name}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-medium">{instanceProgress}%</span>
                              <Progress value={instanceProgress} className="h-2 w-24 mt-1" />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700">
                            {editingInstanceId === instance.id ? (
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  value={editCurrentValue}
                                  onChange={(e) => setEditCurrentValue(Number(e.target.value))}
                                  className="w-16"
                                />
                                <span>/</span>
                                <Input
                                  type="number"
                                  value={editTargetValue}
                                  onChange={(e) => setEditTargetValue(Number(e.target.value))}
                                  className="w-16"
                                />
                                <span>{goal.metric_unit || "units"}</span>
                              </div>
                            ) : (
                              `${instance.current_value || 0} / ${instance.target_value || 0} ${goal.metric_unit || "units"}`
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={getStatusColor(instance.status || "pending")}>
                              {instance.status || "Pending"}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {formatDate(instance.period_start)} - {formatDate(instance.period_end)}
                          </td>
                          <td className="px-4 py-4">
                            {editingInstanceId === instance.id ? (
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleSaveInstance(instance.id)}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditingInstanceId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditInstance(instance)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleDeleteInstance(instance.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {renderPagination()}
        </CardContent>
      </Card>
    </div>
  )
}

export default GoalDetailView