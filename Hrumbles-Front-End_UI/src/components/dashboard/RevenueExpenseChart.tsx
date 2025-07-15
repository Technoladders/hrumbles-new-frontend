"use client"
 
import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { Bar } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js"
 
// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
 
// Define interfaces for data
interface RevenueExpenseData {
  month: string
  revenue: number
  expense: number
}
 
const RevenueExpenseChart: React.FC = () => {
  const [revenueExpenseData, setRevenueExpenseData] = useState<RevenueExpenseData[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
 
  useEffect(() => {
    const fetchRevenueExpenseData = async () => {
      setIsLoading(true)
      try {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        // Initialize data for each month (we'll adjust to reflect 2024-2025)
        const monthlyData: RevenueExpenseData[] = months.map((month) => ({
          month,
          revenue: 0,
          expense: 0,
        }))
        console.log("Initialized monthlyData:", monthlyData)
 
        // Fetch candidates data for revenue and profit calculation
        const { data: candidatesData, error: candidatesError } = await supabase
          .from("hr_job_candidates")
          .select(`
            id, name, email, phone, experience, skills, status, job_id,
            main_status_id, sub_status_id, ctc, accrual_ctc, expected_salary, joining_date, applied_from,
            hr_jobs!hr_job_candidates_job_id_fkey(
              id, title, job_type_category, client_owner
            )
          `)
          .gte("joining_date", "2024-01-01")
          .lte("joining_date", "2025-06-02")
          .in("main_status_id", [
            "9d48d0f9-8312-4f60-aaa4-bafdce067417", // Offered
            "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e", // Joined
          ])
 
        if (candidatesError) {
          console.error("Supabase query error (hr_job_candidates):", candidatesError)
          throw new Error(`Error fetching candidates data: ${candidatesError.message}`)
        }
        console.log("Fetched candidatesData:", candidatesData)
        console.log("Number of candidates:", candidatesData?.length)
 
        // Fetch hr_clients to get commission_value, commission_type, and currency
        const { data: clientsData, error: clientsError } = await supabase
          .from("hr_clients")
          .select("id, client_name, commission_value, commission_type, currency")
 
        if (clientsError) {
          console.error("Supabase query error (hr_clients):", clientsError)
          throw new Error(`Error fetching clients data: ${clientsError.message}`)
        }
        console.log("Fetched clientsData:", clientsData)
 
        // Fetch employees data for revenue and expense (salary) calculation
        const { data: employeesData, error: employeesError } = await supabase.from("hr_project_employees").select(`
            id,
            assign_employee,
            project_id,
            salary,
            client_billing,
            billing_type,
            salary_type,
            salary_currency,
            hr_employees!hr_project_employees_assign_employee_fkey(first_name, last_name, salary_type),
            hr_projects!hr_project_employees_project_id_fkey(id, client_id)
          `)
 
        if (employeesError) {
          console.error("Supabase query error (hr_project_employees):", employeesError)
          throw new Error(`Error fetching employees data: ${employeesError.message}`)
        }
        console.log("Fetched employeesData:", employeesData)
        console.log("Number of employees:", employeesData?.length)
 
        // Fetch time logs for employees
        const { data: timeLogsData, error: timeLogsError } = await supabase
          .from("time_logs")
          .select("id, employee_id, date, project_time_data, total_working_hours")
          .gte("date", "2024-01-01")
          .lte("date", "2025-06-02")
 
        if (timeLogsError) {
          console.error("Supabase query error (time_logs):", timeLogsError)
          throw new Error(`Error fetching time logs: ${timeLogsError.message}`)
        }
        console.log("Fetched timeLogsData:", timeLogsData)
        console.log("Number of time logs:", timeLogsData?.length)
 
        // Process candidates data for Revenue and Expense
        const USD_TO_INR_RATE = 84
        candidatesData?.forEach((candidate, index) => {
          console.log(`Processing candidate ${index + 1}:`, candidate)
          const joiningDate = new Date(candidate.joining_date)
          const year = joiningDate.getFullYear()
          const monthIndex = joiningDate.getMonth() // 0-11 for Jan-Dec
          console.log("Candidate joining date:", candidate.joining_date, "Year:", year, "Month index:", monthIndex)
 
          // Adjust month index for 2024 data (map 2024 months to the same array)
          const adjustedMonthIndex = year === 2024 ? monthIndex : monthIndex + 12
          if (adjustedMonthIndex >= 12 && adjustedMonthIndex < 17) {
            console.log(`Adjusted month index for ${year}: ${adjustedMonthIndex}`)
          } else {
            console.log(`Skipping candidate: joining date ${candidate.joining_date} is out of range`)
            return
          }
 
          const job = candidate.hr_jobs
          console.log("Job data:", job)
          if (!job) {
            console.warn("Skipping candidate due to missing job data")
            return
          }
 
          // Find the client by matching hr_jobs.client_owner with hr_clients.client_name
          const client = clientsData?.find((c) => c.client_name === job.client_owner) || null
          if (!client) {
            console.warn(`No matching client found for client_owner: ${job.client_owner}`)
            return
          }
          console.log("Matched client:", client)
 
          // Use client data for commission_value, commission_type, and currency
          const clientData = {
            commission_value: client.commission_value || 0,
            commission_type: client.commission_type || "percentage",
            currency: client.currency || "INR",
          }
          console.log("Client data for calculation:", clientData)
 
          // Parse salary and accrual_ctc
          const parseSalary = (salary: string | number | undefined | null): number => {
            if (!salary) {
              console.log("Salary is null or undefined, returning 0")
              return 0
            }
            let amount: number
            let currency = "INR"
            let budgetType = "LPA"
 
            if (typeof salary === "string") {
              const currencyMatch = salary.startsWith("$") ? "USD" : "INR"
              const parts = salary.replace(/[$₹]/, "").trim().split(" ")
              amount = Number.parseFloat(parts[0]) || 0
              currency = currencyMatch
              budgetType = parts[1] || "LPA"
              console.log(
                `Parsed salary string: ${salary}, Amount: ${amount}, Currency: ${currency}, Budget Type: ${budgetType}`,
              )
            } else {
              amount = salary
              console.log(`Salary is a number: ${amount}`)
            }
 
            if (currency === "USD") {
              amount *= USD_TO_INR_RATE
              console.log(`Converted USD to INR: ${amount}`)
            }
            if (budgetType === "Monthly") {
              amount *= 12
              console.log(`Converted Monthly to Annual: ${amount}`)
            } else if (budgetType === "Hourly") {
              amount *= 2016
              console.log(`Converted Hourly to Annual: ${amount}`)
            }
            return amount
          }
 
          const salary = parseSalary(candidate.ctc || candidate.expected_salary)
          const accrualCtc = parseSalary(candidate.accrual_ctc)
          console.log(`Parsed salary: ${salary}, accrualCtc: ${accrualCtc}`)
 
          let commissionValue = clientData.commission_value || 0
          console.log("Initial commission value:", commissionValue)
          if (clientData.currency === "USD" && clientData.commission_type === "fixed") {
            commissionValue *= USD_TO_INR_RATE
            console.log(`Converted commission from USD to INR: ${commissionValue}`)
          }
 
          let revenue = 0
          let profit = 0
 
          if (job.job_type_category === "Internal") {
            revenue = accrualCtc
            profit = accrualCtc - salary
            console.log("Internal job - Revenue:", revenue, "Profit:", profit)
          } else {
            if (clientData.commission_type === "percentage" && clientData.commission_value) {
              profit = (salary * clientData.commission_value) / 100
              console.log(`External job (percentage) - Profit: ${profit}`)
            } else if (clientData.commission_type === "fixed" && commissionValue) {
              profit = commissionValue
              console.log(`External job (fixed) - Profit: ${profit}`)
            }
            revenue = profit // For external jobs, revenue equals profit (commission-based)
            console.log("External job - Revenue:", revenue)
          }
 
          // Map adjustedMonthIndex back to 0-11 range for 2025 display (Jan 2025 = index 0, ..., Jun 2025 = index 5)
          const displayMonthIndex = adjustedMonthIndex - 12
          monthlyData[displayMonthIndex].revenue += revenue
          monthlyData[displayMonthIndex].expense += revenue - profit // Expense = Revenue - Profit (salary cost)
          console.log(`Updated monthlyData for month ${months[displayMonthIndex]}:`, monthlyData[displayMonthIndex])
        })
 
        // Process employees data for Revenue and Expense
        const projectIds = employeesData?.map((emp) => emp.hr_projects?.id).filter((id) => id) || []
        console.log("Extracted project IDs:", projectIds)
 
        const relevantTimeLogs =
          timeLogsData?.filter((log) =>
            log.project_time_data?.projects?.some((proj) => projectIds.includes(proj.projectId)),
          ) || []
        console.log("Filtered relevantTimeLogs:", relevantTimeLogs)
        console.log("Number of relevant time logs:", relevantTimeLogs.length)
 
        employeesData?.forEach((employee, index) => {
          console.log(`Processing employee ${index + 1}:`, employee)
          const projectId = employee.hr_projects?.id
          if (!projectId) {
            console.warn("Skipping employee due to missing project_id")
            return
          }
          console.log("employee assign_employee:", employee)
 
          // Calculate total hours worked
          const calculateEmployeeHours = (employeeId: string, projectId: string) => {
            let totalHours = 0
            const logs = relevantTimeLogs.filter((log) => log.employee_id === employeeId)
            console.log(`Time logs for employee ${employeeId}:`, logs)
            logs.forEach((log) => {
              const projectEntry = log.project_time_data?.projects?.find((proj) => proj.projectId === projectId)
              const hours = projectEntry?.hours || 0
              console.log(`Log date: ${log.date}, Project entry:`, projectEntry, `Hours: ${hours}`)
              const date = new Date(log.date)
              const year = date.getFullYear()
              const monthIndex = date.getMonth()
              console.log(`Log year: ${year}, month index: ${monthIndex}`)
 
              const adjustedMonthIndex = year === 2024 ? monthIndex : monthIndex + 12
              if (adjustedMonthIndex >= 12 && adjustedMonthIndex < 17) {
                const displayMonthIndex = adjustedMonthIndex - 12
                // Adjust hourly salary based on salary_type
                const salaryType = employee?.salary_type || "LPA"
                let hourlySalary
                if (salaryType === "Monthly") {
                  hourlySalary = (employee.salary || 0) / (30 * 8) // Monthly salary to hourly
                } else {
                  hourlySalary = (employee.salary || 0) / (365 * 8) // LPA to hourly
                }
                console.log(
                  `Salary type: ${salaryType}, Hourly salary: ${hourlySalary}, Hours: ${hours}, Expense contribution: ${hours * hourlySalary}`,
                )
                monthlyData[displayMonthIndex].expense += hours * hourlySalary
                totalHours += hours
              }
            })
            console.log(`Total hours for employee ${employeeId}: ${totalHours}`)
            return totalHours
          }
 
          const hours = calculateEmployeeHours(employee.assign_employee, projectId)
          console.log(`Total hours worked by employee: ${hours}`)
 
          // Calculate revenue
          let hourlyRate = employee.client_billing || 0
          console.log("Client billing (hourlyRate before conversion):", hourlyRate)
          const currency = employee.salary_currency || "INR"
          if (currency === "USD") {
            hourlyRate *= USD_TO_INR_RATE
            console.log(`Converted hourlyRate from USD to INR: ${hourlyRate}`)
          }
          if (employee.billing_type === "Monthly") {
            hourlyRate = (hourlyRate * 12) / (365 * 8)
            console.log(`Converted Monthly to Hourly: ${hourlyRate}`)
          } else if (employee.billing_type === "LPA") {
            hourlyRate = hourlyRate / (365 * 8)
            console.log(`Converted LPA to Hourly: ${hourlyRate}`)
          }
          const revenue = hours * hourlyRate
          console.log(`Calculated revenue for employee: ${revenue}`)
 
          // Distribute revenue across months based on time logs
          relevantTimeLogs
            .filter((log) => log.employee_id === employee.assign_employee)
            .forEach((log) => {
              const date = new Date(log.date)
              const year = date.getFullYear()
              const monthIndex = date.getMonth()
              const adjustedMonthIndex = year === 2024 ? monthIndex : monthIndex + 12
              if (adjustedMonthIndex >= 12 && adjustedMonthIndex < 17) {
                const displayMonthIndex = adjustedMonthIndex - 12
                const projectEntry = log.project_time_data?.projects?.find((proj) => proj.projectId === projectId)
                const hoursInMonth = projectEntry?.hours || 0
                const proportion = hours > 0 ? hoursInMonth / hours : 0
                console.log(
                  `Month: ${months[displayMonthIndex]}, Hours in month: ${hoursInMonth}, Proportion: ${proportion}, Revenue contribution: ${revenue * proportion}`,
                )
                monthlyData[displayMonthIndex].revenue += revenue * proportion
              }
            })
          console.log(`Updated monthlyData after employee processing:`, monthlyData)
        })
 
        console.log("Final monthlyData before setting state:", monthlyData)
        setRevenueExpenseData(monthlyData)
        setErrorMessage(null)
      } catch (err) {
        console.error("Error fetching revenue/expense data:", err)
        setErrorMessage("Error fetching data. Check the console for details.")
      } finally {
        setIsLoading(false)
      }
    }
 
    fetchRevenueExpenseData()
  }, []) // The useEffect hook is used for client-side data fetching [^3].
 
  // Format numbers for display
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount)
 
  // Calculate totals for display
  const totalRevenue = revenueExpenseData.reduce((sum, data) => sum + data.revenue, 0)
  const totalExpense = revenueExpenseData.reduce((sum, data) => sum + data.expense, 0)
 
  console.log("revenueExpenseData (final):", revenueExpenseData)
  console.log("totalRevenue (final):", totalRevenue)
  console.log("totalExpense (final):", totalExpense)
 
  // Helper function to create revenue gradient for Chart.js
  const createRevenueGradient = (context: any) => {
    const chart = context.chart
    const { ctx, chartArea } = chart
 
    if (!chartArea) {
      // This can happen on initial render
      return null
    }
 
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
    gradient.addColorStop(0, "#9333ea") // purple-600
    gradient.addColorStop(1, "#6366f1") // indigo-500
    return gradient
  }
 
  // Helper function to create expense gradient for Chart.js
  const createExpenseGradient = (context: any) => {
    const chart = context.chart
    const { ctx, chartArea } = chart
 
    if (!chartArea) {
      return null
    }
 
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
    gradient.addColorStop(0, "#eab308") // yellow-500
    gradient.addColorStop(1, "#facc15") // yellow-400
    return gradient
  }
 
  // Chart.js data and options for Revenue chart
  const revenueChartData = {
    labels: revenueExpenseData.map((data) => data.month),
    datasets: [
      {
        label: "Revenue",
        data: revenueExpenseData.map((data) => data.revenue),
        backgroundColor: createRevenueGradient, // Use gradient function
        hoverBackgroundColor: createRevenueGradient, // Use gradient function for hover
        borderWidth: 0,
        borderRadius: 12,
      },
    ],
  }
 
  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: "#000000", // Changed to black
          font: {
            size: 12,
            weight: "600" as const,
          },
        },
      },
      y: {
        display: false,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(99, 102, 241, 0.9)", // Indigo-500 with opacity
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#6366f1", // Indigo-500 for border
        borderWidth: 2,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `Revenue: ₹${context.parsed.y.toLocaleString("en-IN")}`,
        },
      },
    },
  }
 
  // Chart.js data and options for Expense chart
  const expenseChartData = {
    labels: revenueExpenseData.map((data) => data.month),
    datasets: [
      {
        label: "Expenses",
        data: revenueExpenseData.map((data) => data.expense),
        backgroundColor: createExpenseGradient, // Use gradient function
        hoverBackgroundColor: createExpenseGradient, // Use gradient function for hover
        borderWidth: 0,
        borderRadius: 12,
      },
    ],
  }
 
  const expenseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: "#000000", // Changed to black
          font: {
            size: 12,
            weight: "600" as const,
          },
        },
      },
      y: {
        display: false,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(250, 204, 21, 0.9)", // Yellow-400 with opacity
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#facc15", // Yellow-400 for border
        borderWidth: 2,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `Expenses: ₹${context.parsed.y.toLocaleString("en-IN")}`,
        },
      },
    },
  }
 
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Card */}
      <Card className="shadow-xl border-none bg-white text-gray-900 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50"></div>
              Revenue
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-indigo-600">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : errorMessage ? (
            <p className="text-red-500 text-center font-medium">{errorMessage}</p>
          ) : (
            <div className="h-[150px]">
              <Bar data={revenueChartData} options={revenueChartOptions} />
            </div>
          )}
        </CardContent>
      </Card>
 
      {/* Expense Card */}
      <Card className="shadow-xl border-none bg-white text-gray-900 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50"></div>
              Expenses
            </CardTitle>
            <span className="text-lg font-bold text-yellow-600">{formatCurrency(totalExpense)}</span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
            </div>
          ) : errorMessage ? (
            <p className="text-red-500 text-center font-medium">{errorMessage}</p>
          ) : (
            <div className="h-[150px]">
              <Bar data={expenseChartData} options={expenseChartOptions} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
 
export default RevenueExpenseChart
 