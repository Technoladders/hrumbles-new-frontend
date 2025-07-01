import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Status IDs for Offered and Joined candidates
const OFFERED_STATUS_ID = "9d48d0f9-8312-4f60-aaa4-bafdce067417";
const JOINED_STATUS_ID = "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e";

// Static USD to INR conversion rate
const USD_TO_INR_RATE = 83.5;

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  experience: string;
  skills: string[];
  status: string;
  job_id: string;
  ctc?: string;
  accrual_ctc?: string;
  expected_salary?: number;
  main_status_id?: string;
}

interface Job {
  id: string;
  title: string;
  client_owner: string;
  job_type_category: string;
  budget?: number;
  budget_type?: string;
}

interface Client {
  id: string;
  client_name: string;
  service_type: string[];
  commission_value?: number;
  commission_type?: string;
  currency: string;
}

interface Metrics {
  totalRevenue: number;
  totalProfit: number;
  totalCandidates: number;
  permanentCandidates: number;
  contractualCandidates: number;
  bothCandidates: number;
}

const ClientMetricsDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics>({
    totalRevenue: 0,
    totalProfit: 0,
    totalCandidates: 0,
    permanentCandidates: 0,
    contractualCandidates: 0,
    bothCandidates: 0,
  });
  const [chartData, setChartData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Currency options for parsing
  const currencies = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
  ];

  // Parse salary strings with currency and type conversion
  const parseSalary = (salary: string | undefined): number => {
    if (!salary) return 0;
    const currency = currencies.find((c) => salary.startsWith(c.symbol)) || currencies[0];
    const parts = salary.replace(currency.symbol, "").trim().split(" ");
    const amount = parseFloat(parts[0]) || 0;
    const budgetType = parts[1] || "LPA";

    let convertedAmount = amount;

    // Convert USD to INR
    if (currency.value === "USD") {
      convertedAmount *= USD_TO_INR_RATE;
    }

    // Convert to LPA
    if (budgetType === "Monthly") {
      convertedAmount *= 12; // Convert Monthly to LPA
    } else if (budgetType === "Hourly") {
      convertedAmount *= 2016; // Convert Hourly to LPA (40 hours/week * 52 weeks)
    }

    return convertedAmount;
  };

  // Calculate profit (reused from ClientCandidatesView.tsx)
  const calculateProfit = (
    candidate: Candidate,
    job: Job,
    client: Client
  ): number => {
    let salary = candidate.ctc || candidate.expected_salary || 0;
    let budget = candidate.accrual_ctc || 0;
    let commissionValue = client.commission_value || 0;

    // Parse salary (ctc or expected_salary)
    let salaryAmount = 0;
    let salaryCurrency = "INR";
    let salaryType = "LPA";

    if (typeof salary === "string" && candidate.ctc) {
      const currency = currencies.find((c) => salary.startsWith(c.symbol)) || currencies[0];
      const parts = salary.replace(currency.symbol, "").trim().split(" ");
      salaryAmount = parseFloat(parts[0]) || 0;
      salaryCurrency = currency.value;
      salaryType = parts[1] || "LPA";
    } else if (typeof salary === "number" && candidate.expected_salary) {
      salaryAmount = salary;
      salaryCurrency = "INR";
      salaryType = "LPA";
    }

    // Parse budget (accrual_ctc)
    let budgetAmount = 0;
    let budgetCurrency = "INR";
    let budgetType = "LPA";

    if (typeof budget === "string" && candidate.accrual_ctc) {
      const currency = currencies.find((c) => budget.startsWith(c.symbol)) || currencies[0];
      const parts = budget.replace(currency.symbol, "").trim().split(" ");
      budgetAmount = parseFloat(parts[0]) || 0;
      budgetCurrency = currency.value;
      budgetType = parts[1] || "LPA";
    }

    // Convert salary to INR and normalize to LPA
    if (salaryCurrency === "USD") {
      salaryAmount *= USD_TO_INR_RATE;
    }
    if (salaryType === "Monthly") {
      salaryAmount *= 12;
    } else if (salaryType === "Hourly") {
      salaryAmount *= 2016;
    }

    // Convert budget to INR and normalize to LPA
    if (budgetCurrency === "USD") {
      budgetAmount *= USD_TO_INR_RATE;
    }
    if (budgetType === "Monthly") {
      budgetAmount *= 12;
    } else if (budgetType === "Hourly") {
      budgetAmount *= 2016;
    }

    // Convert commissionValue to INR if fixed
    if (client.currency === "USD" && client.commission_type === "fixed") {
      commissionValue *= USD_TO_INR_RATE;
    }

    if (job.job_type_category === "Internal") {
      const profit = budgetAmount - salaryAmount;
      return profit;
    } else {
      if (client.commission_type === "percentage" && client.commission_value) {
        return (salaryAmount * client.commission_value) / 100;
      } else if (client.commission_type === "fixed" && commissionValue) {
        return commissionValue;
      }
    }

    return 0;
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      // Fetch all clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("hr_clients")
        .select("id, client_name, service_type, commission_value, commission_type, currency");

      if (clientsError) throw clientsError;

      if (!clientsData || clientsData.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch all jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("hr_jobs")
        .select("id, title, client_owner, job_type_category, budget, budget_type");

      if (jobsError) throw jobsError;

      // Fetch all offered/joined candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("hr_job_candidates")
        .select(`
          id, name, email, phone, experience, skills, status, job_id,
          main_status_id, sub_status_id, ctc, accrual_ctc, expected_salary
        `)
        .in("main_status_id", [OFFERED_STATUS_ID, JOINED_STATUS_ID]);

      if (candidatesError) throw candidatesError;

      if (!candidatesData || candidatesData.length === 0) {
        setMetrics({
          totalRevenue: 0,
          totalProfit: 0,
          totalCandidates: 0,
          permanentCandidates: 0,
          contractualCandidates: 0,
          bothCandidates: 0,
        });
        setLoading(false);
        return;
      }

      // Calculate metrics
      let totalRevenue = 0;
      let totalProfit = 0;
      let permanentCandidates = 0;
      let contractualCandidates = 0;
      let bothCandidates = 0;

      // Track revenue and profit by service type for chart
      const metricsByServiceType: {
        [key: string]: { revenue: number; profit: number };
      } = {
        permanent: { revenue: 0, profit: 0 },
        contractual: { revenue: 0, profit: 0 },
        both: { revenue: 0, profit: 0 },
      };

      candidatesData.forEach((candidate) => {
        const job = jobsData?.find((j) => j.id === candidate.job_id);
        const client = clientsData?.find((c) => c.client_name === job?.client_owner);

        if (!job || !client) return;

        // Calculate revenue (ctc or accrual_ctc)
        const revenue = candidate.ctc
          ? parseSalary(candidate.ctc)
          : candidate.accrual_ctc
          ? parseSalary(candidate.accrual_ctc)
          : candidate.expected_salary || 0;

        // Calculate profit
        const profit = calculateProfit(candidate, job, client);

        totalRevenue += revenue;
        totalProfit += profit;

        // Determine service type
        const isPermanent = client.service_type.includes("permanent") && !client.service_type.includes("contractual");
        const isContractual = client.service_type.includes("contractual") && !client.service_type.includes("permanent");
        const isBoth = client.service_type.includes("permanent") && client.service_type.includes("contractual");

        if (isPermanent) {
          permanentCandidates++;
          metricsByServiceType.permanent.revenue += revenue;
          metricsByServiceType.permanent.profit += profit;
        } else if (isContractual) {
          contractualCandidates++;
          metricsByServiceType.contractual.revenue += revenue;
          metricsByServiceType.contractual.profit += profit;
        } else if (isBoth) {
          bothCandidates++;
          metricsByServiceType.both.revenue += revenue;
          metricsByServiceType.both.profit += profit;
        }
      });

      // Update metrics
      setMetrics({
        totalRevenue,
        totalProfit,
        totalCandidates: candidatesData.length,
        permanentCandidates,
        contractualCandidates,
        bothCandidates,
      });

      // Prepare chart data
      setChartData({
        labels: ["Permanent", "Contractual", "Both"],
        datasets: [
          {
            label: "Revenue (INR LPA)",
            data: [
              metricsByServiceType.permanent.revenue,
              metricsByServiceType.contractual.revenue,
              metricsByServiceType.both.revenue,
            ],
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
          {
            label: "Profit (INR LPA)",
            data: [
              metricsByServiceType.permanent.profit,
              metricsByServiceType.contractual.profit,
              metricsByServiceType.both.profit,
            ],
            backgroundColor: "rgba(255, 99, 132, 0.6)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      });

    } catch (error) {
      toast({
        title: "Error fetching metrics",
        description: "An error occurred while fetching data.",
        variant: "destructive",
      });
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const goBack = () => {
    navigate("/client-dashboard");
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-2xl">Client Metrics Dashboard</CardTitle>
              <CardDescription>
                Overview of revenue, profit, and candidate counts across all clients
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-800">
                      {formatCurrency(metrics.totalRevenue)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Total Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-800">
                      {formatCurrency(metrics.totalProfit)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Total Candidates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-blue-800">
                      {metrics.totalCandidates}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Permanent: {metrics.permanentCandidates} | Contractual: {metrics.contractualCandidates} | Both: {metrics.bothCandidates}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Revenue and Profit by Service Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <Bar
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: "top" },
                          title: { display: true, text: "Revenue and Profit (INR LPA)" },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: { display: true, text: "Amount (INR LPA)" },
                          },
                          x: {
                            title: { display: true, text: "Service Type" },
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientMetricsDashboard;