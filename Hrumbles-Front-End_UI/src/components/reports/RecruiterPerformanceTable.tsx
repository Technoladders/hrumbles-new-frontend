"use client"

import type React from "react"
import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Files, Loader2, Trophy, BarChart3 } from "lucide-react"
import jsPDF from "jspdf"
import "jspdf-autotable"
import FileSaver from "file-saver"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface LabelProps {
  x?: number
  y?: number
  width?: number
  value?: number
  payload?: any
}

interface DerivedMetric {
  name: string
  formula: string
  value: number
  description: string
}

interface RecruiterPerformanceData {
  recruiter: string
  jobs_assigned: number
  profiles_submitted: number
  internal_reject: number
  internal_hold: number
  sent_to_client: number
  client_reject: number
  client_hold: number
  client_duplicate: number
  interviews: {
    technical: number
    technical_selected: number
    technical_reject: number
    l1: number
    l1_selected: number
    l1_reject: number
    l2: number
    l2_reject: number
    end_client: number
    end_client_reject: number
  }
  offers: {
    made: number
    accepted: number
    rejected: number
  }
  joining: {
    joined: number
    no_show: number
  }
}

interface RecruiterPerformanceTableProps {
  data: RecruiterPerformanceData[]
}

interface ChartData {
  recruiter: string
  profiles_submitted: number
  internal_reject: number
  sent_to_client: number
  client_reject: number
  technical: number
  technical_selected: number
  technical_reject: number
  l1: number
  l1_selected: number
  l1_reject: number
  l2: number
  l2_reject: number
  end_client: number
  end_client_reject: number
  offers_made: number
  offers_accepted: number
  offers_rejected: number
  joined: number
  no_show: number
}

const RecruiterPerformanceTable: React.FC<RecruiterPerformanceTableProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<string>("submission_flow")

  const calculateDerivedMetrics = (recruiter: RecruiterPerformanceData): DerivedMetric[] => {
    const totalInterviews =
      recruiter.interviews.technical +
      recruiter.interviews.l1 +
      recruiter.interviews.l2 +
      recruiter.interviews.end_client

    return [
      {
        name: "Submission-to-Client Ratio",
        formula: "Sent to Client / Profiles Submitted",
        value: recruiter.profiles_submitted > 0 ? recruiter.sent_to_client / recruiter.profiles_submitted : 0,
        description: "Ratio of profiles sent to client vs total submitted",
      },
      {
        name: "Client Acceptance Rate",
        formula: "(Interviews + Offers + Joins) / Sent to Client",
        value:
          recruiter.sent_to_client > 0
            ? recruiter.interviews.l1 / recruiter.sent_to_client
            : 0,
        description: "Percentage of client-submitted profiles that move forward",
      },
      {
        name: "Interview Conversion Rate",
        formula: "Total Interviews / Sent to Client",
        value: recruiter.sent_to_client > 0 ? totalInterviews / recruiter.sent_to_client : 0,
        description: "Percentage of client-submitted profiles that get interviews",
      },
      {
        name: "Technical→L1 Conversion",
        formula: "L1 / Technical Selected",
        value:
          recruiter.interviews.technical_selected > 0
            ? recruiter.interviews.l1 / recruiter.interviews.technical_selected
            : 0,
        description: "Percentage of technical selected that progress to L1",
      },
      {
        name: "L1→L2 Conversion",
        formula: "L2 / L1 Selected",
        value: recruiter.interviews.l1_selected > 0 ? recruiter.interviews.l2 / recruiter.interviews.l1_selected : 0,
        description: "Percentage of L1 selected that progress to L2",
      },
      {
        name: "L2→End Client",
        formula: "End Client / L2",
        value: recruiter.interviews.l2 > 0 ? recruiter.interviews.end_client / recruiter.interviews.l2 : 0,
        description: "Percentage of L2 interviews that progress to End Client",
      },
      {
        name: "End Client→Offer",
        formula: "Offer Made / End Client",
        value: recruiter.interviews.end_client > 0 ? recruiter.offers.made / recruiter.interviews.end_client : 0,
        description: "Percentage of End Client interviews that result in offers",
      },
      {
        name: "Offer Acceptance Rate",
        formula: "Offer Accepted / Offer Made",
        value: recruiter.offers.made > 0 ? recruiter.offers.accepted / recruiter.offers.made : 0,
        description: "Percentage of offers that are accepted",
      },
      {
        name: "Join Rate",
        formula: "Joined / Offer Accepted",
        value: recruiter.offers.accepted > 0 ? recruiter.joining.joined / recruiter.offers.accepted : 0,
        description: "Percentage of accepted offers that result in joining",
      },
      {
        name: "Funnel Efficiency",
        formula: "Joined / Profiles Submitted",
        value: recruiter.profiles_submitted > 0 ? recruiter.joining.joined / recruiter.profiles_submitted : 0,
        description: "Overall efficiency of the recruitment funnel",
      },
      {
        name: "Client Reject Rate",
        formula: "Client Reject / Sent to Client",
        value: recruiter.sent_to_client > 0 ? recruiter.client_reject / recruiter.sent_to_client : 0,
        description: "Percentage of client-submitted profiles rejected by client",
      },
    ]
  }

  // Transform data for chart
  const chartData: ChartData[] = useMemo(() => {
    return data.map((recruiter) => ({
      recruiter: recruiter.recruiter,
      profiles_submitted: recruiter.profiles_submitted,
      internal_reject: recruiter.internal_reject,
      sent_to_client: recruiter.sent_to_client,
      client_reject: recruiter.client_reject,
      technical: recruiter.interviews.technical,
      technical_selected: recruiter.interviews.technical_selected,
      technical_reject: recruiter.interviews.technical_reject,
      l1: recruiter.interviews.l1,
      l1_selected: recruiter.interviews.l1_selected,
      l1_reject: recruiter.interviews.l1_reject,
      l2: recruiter.interviews.l2,
      l2_reject: recruiter.interviews.l2_reject,
      end_client: recruiter.interviews.end_client,
      end_client_reject: recruiter.interviews.end_client_reject,
      offers_made: recruiter.offers.made,
      offers_accepted: recruiter.offers.accepted,
      offers_rejected: recruiter.offers.rejected,
      joined: recruiter.joining.joined,
      no_show: recruiter.joining.no_show,
    }))
  }, [data])

  // Configuration based on Active Tab
  const config = useMemo(() => {
    switch (activeTab) {
      case "submission_flow":
        return {
          bars: [
            { key: "profiles_submitted", name: "Submitted", color: "#7e22ce", gradientId: "submissionGradient" },
            { key: "internal_reject", name: "Int. Reject", color: "#ef4444", gradientId: "rejectGradient" },
            { key: "sent_to_client", name: "To Client", color: "#10b981", gradientId: "clientGradient" },
          ],
        }
      case "client_response":
        return {
          bars: [
            { key: "sent_to_client", name: "To Client", color: "#10b981", gradientId: "clientGradient" },
            { key: "client_reject", name: "Client Reject", color: "#ef4444", gradientId: "rejectGradient" },
            { key: "technical", name: "Technical", color: "#3b82f6", gradientId: "technicalGradient" },
          ],
        }
      case "interviews":
        return {
          bars: [
            { key: "technical", name: "Technical", color: "#3b82f6", gradientId: "technicalGradient" },
            { key: "technical_selected", name: "Tech Selected", color: "#10b981", gradientId: "selectedGradient" },
            { key: "l1", name: "L1", color: "#8b5cf6", gradientId: "l1Gradient" },
            { key: "l1_selected", name: "L1 Selected", color: "#059669", gradientId: "l1SelectedGradient" },
            { key: "l2", name: "L2", color: "#f59e0b", gradientId: "l2Gradient" },
          ],
        }
      case "end_client":
        return {
          bars: [
            { key: "l2", name: "L2", color: "#f59e0b", gradientId: "l2Gradient" },
            { key: "end_client", name: "End Client", color: "#06b6d4", gradientId: "ecGradient" },
            { key: "end_client_reject", name: "EC Reject", color: "#ef4444", gradientId: "rejectGradient" },
          ],
        }
      case "final_stage":
        return {
          bars: [
            { key: "offers_made", name: "Offers Made", color: "#10b981", gradientId: "offerGradient" },
            { key: "offers_accepted", name: "Accepted", color: "#059669", gradientId: "acceptedGradient" },
            { key: "offers_rejected", name: "Rejected", color: "#ef4444", gradientId: "rejectGradient" },
            { key: "joined", name: "Joined", color: "#7e22ce", gradientId: "joinedGradient" },
            { key: "no_show", name: "No Show", color: "#dc2626", gradientId: "noShowGradient" },
          ],
        }
      default:
        return {
          bars: [
            { key: "profiles_submitted", name: "Submitted", color: "#7e22ce", gradientId: "submissionGradient" },
            { key: "internal_reject", name: "Int. Reject", color: "#ef4444", gradientId: "rejectGradient" },
            { key: "sent_to_client", name: "To Client", color: "#10b981", gradientId: "clientGradient" },
          ],
        }
    }
  }, [activeTab])

  const renderTotalLabel = useCallback(
    (props: LabelProps) => {
      const { x, y, width, payload } = props

      if (x == null || y == null || width == null || !payload) {
        return null
      }

      // Calculate total from all bars in current config
      const total = config.bars.reduce((sum, bar) => {
        return sum + (Number(payload[bar.key]) || 0)
      }, 0)

      const radius = 10

      return (
        <g>
          <circle
            cx={Number(x) + Number(width) / 2}
            cy={Number(y) - radius}
            r={radius}
            fill="#8884d8"
          />
          <text
            x={Number(x) + Number(width) / 2}
            y={Number(y) - radius}
            fill="#fff"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fontWeight="bold"
          >
            {total}
          </text>
        </g>
      )
    },
    [config]
  )

  const topRecruiters = useMemo(() => {
    if (!chartData.length) return []
    return [...chartData]
      .sort((a, b) => {
        // Calculate total based on all bars in current config
        const totalA = config.bars.reduce((sum, bar) => {
          return sum + (Number(a[bar.key as keyof ChartData]) || 0)
        }, 0)
        const totalB = config.bars.reduce((sum, bar) => {
          return sum + (Number(b[bar.key as keyof ChartData]) || 0)
        }, 0)
        return totalB - totalA
      })
      .slice(0, 10)
  }, [chartData, config])

  const exportToCSV = () => {
    let csv =
      "Recruiter,Jobs Assigned,Profiles Submitted,Internal Reject,Client Reject,Sent to Client,Client Duplicate,"
    csv +=
      "Technical,Technical Selected,Technical Reject,L1,L1 Selected,L1 Reject,L2,L2 Reject,End Client,End Client Reject,"
    csv += "Offers Made,Offers Accepted,Offers Rejected,Joined,No Show,"
    csv +=
      "Submission-to-Client Ratio,Client Acceptance Rate,Interview Conversion Rate,Technical→L1 Conversion,L1→L2 Conversion,L2→End Client,End Client→Offer,Offer Acceptance Rate,Join Rate,Funnel Efficiency,Client Reject Rate\n"

    data.forEach((recruiter) => {
      const metrics = calculateDerivedMetrics(recruiter)

      csv += `${recruiter.recruiter},${recruiter.jobs_assigned},${recruiter.profiles_submitted},${recruiter.internal_reject},${recruiter.client_reject},${recruiter.sent_to_client},`
      csv += `${recruiter.client_duplicate},`
      csv += `${recruiter.interviews.technical},${recruiter.interviews.technical_selected},${recruiter.interviews.technical_reject},`
      csv += `${recruiter.interviews.l1},${recruiter.interviews.l1_selected},${recruiter.interviews.l1_reject},`
      csv += `${recruiter.interviews.l2},${recruiter.interviews.l2_reject},${recruiter.interviews.end_client},${recruiter.interviews.end_client_reject},`
      csv += `${recruiter.offers.made},${recruiter.offers.accepted},${recruiter.offers.rejected},`
      csv += `${recruiter.joining.joined},${recruiter.joining.no_show},`

      metrics.forEach((metric) => {
        csv += `${metric.value.toFixed(2)},`
      })

      csv = csv.slice(0, -1) + "\n"
    })

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    FileSaver.saveAs(blob, "recruiter_performance.csv")
  }

  const exportToPDF = () => {
    const doc = new jsPDF("landscape")

    doc.setFontSize(18)
    doc.text("Recruiter Performance Report", 14, 22)

    const tableData = data.map((recruiter) => {
      const metrics = calculateDerivedMetrics(recruiter)

      return [
        recruiter.recruiter,
        recruiter.jobs_assigned.toString(),
        recruiter.profiles_submitted.toString(),
        recruiter.sent_to_client.toString(),
        `${recruiter.interviews.technical}/${recruiter.interviews.technical_reject}`,
        `${recruiter.interviews.l1}/${recruiter.interviews.l1_reject}`,
        `${recruiter.interviews.l2}/${recruiter.interviews.l2_reject}`,
        `${recruiter.interviews.end_client}/${recruiter.interviews.end_client_reject}`,
        `${recruiter.offers.made}/${recruiter.offers.accepted}`,
        `${recruiter.joining.joined}/${recruiter.joining.no_show}`,
        metrics[0].value.toFixed(2),
        metrics[1].value.toFixed(2),
        metrics[10].value.toFixed(2),
        metrics[7].value.toFixed(2),
        metrics[9].value.toFixed(2),
      ]
    })

    const headers = [
      "Recruiter",
      "Jobs",
      "Submitted",
      "To Client",
      "Tech (P/F)",
      "L1 (P/F)",
      "L2 (P/F)",
      "EC (P/F)",
      "Offers (M/A)",
      "Joined (J/NS)",
      "Sub Ratio",
      "Client Acc",
      "Client Rej",
      "Offer Acc",
      "Funnel Eff",
    ]
    ;(doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [240, 244, 255] },
    })

    doc.save("recruiter_performance.pdf")
  }

  return (
    <Card className="shadow-2xl bg-white/70 backdrop-blur-xl border border-white/20 hover:shadow-3xl transition-all duration-300 rounded-xl h-[600px] flex flex-col">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl pb-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Recruiter Performance Metrics
            </CardTitle>
            <CardDescription className="text-purple-100 mt-1">
              Visual breakdown of recruiter performance across the recruitment funnel
            </CardDescription>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 transition-all duration-200 rounded-lg"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 transition-all duration-200 rounded-lg"
            >
              <Files className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 flex flex-col flex-1 min-h-0">
        {/* Tabs Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4 flex-shrink-0">
          <div className="flex items-center">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-green-500 rounded-full mr-3"></div>
              Recruiter Analytics
              <span className="text-xs font-normal text-gray-500 ml-2">
                (Top 10)
              </span>
            </h3>
          </div>

          <div className="flex-shrink-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
                <TabsTrigger
                  value="submission_flow"
                  className="px-2 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Submission
                </TabsTrigger>
                <TabsTrigger
                  value="client_response"
                  className="px-2 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Client
                </TabsTrigger>
                <TabsTrigger
                  value="interviews"
                  className="px-2 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Interviews
                </TabsTrigger>
                <TabsTrigger
                  value="end_client"
                  className="px-2 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  End Client
                </TabsTrigger>
                <TabsTrigger
                  value="final_stage"
                  className="px-2 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Offers & Joining
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="flex-1 flex min-h-0 gap-4 max-h-[380px]">
          {topRecruiters.length > 0 ? (
            <>
              <div className="flex-[3] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topRecruiters}
                    margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="submissionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7e22ce" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#7e22ce" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="clientGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="rejectGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#ef4444" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="technicalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="selectedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="l1Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="l1SelectedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#059669" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="l2Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="ecGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="offerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="acceptedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#059669" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="joinedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7e22ce" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#7e22ce" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="noShowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#dc2626" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#dc2626" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      strokeOpacity={0.5}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="recruiter"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                      interval={0}
                      tickFormatter={(value) =>
                        value.length > 10 ? `${value.substring(0, 10)}...` : value
                      }
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "#64748b",
                        fontWeight: "500",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(243, 244, 246, 0.4)" }}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{
                        fontSize: "12px",
                        color: "#4b5563",
                        paddingBottom: "5px",
                      }}
                      iconType="rect"
                    />
                    {config.bars.map((bar, index) => (
                      <Bar
                        key={bar.key}
                        dataKey={bar.key}
                        stackId="a"
                        name={bar.name}
                        fill={`url(#${bar.gradientId})`}
                        maxBarSize={25}
                        label={index === config.bars.length - 1 ? renderTotalLabel : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-[280px] max-w-[320px] border-l border-gray-100 pl-4 flex flex-col overflow-hidden">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1 pb-2 border-b border-gray-200">
                  <Trophy className="w-4 h-4 text-yellow-500" /> Top Recruiters
                </div>
                <div className="overflow-y-auto pr-2 space-y-4 h-full flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                  {topRecruiters.map((recruiter, idx) => (
                    <div
                      key={idx}
                      className="group p-3 rounded-lg hover:bg-gradient-to-r hover:from-violet-50 hover:to-indigo-50 transition-all border border-gray-100 hover:border-violet-200 hover:shadow-sm"
                    >
                      {/* Recruiter Name with Rank */}
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                            {idx + 1}
                          </span>
                          <span
                            className="text-sm font-semibold text-gray-800 truncate"
                            title={recruiter.recruiter}
                          >
                            {recruiter.recruiter}
                          </span>
                        </div>
                      </div>
                      
                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {config.bars.map((bar) => (
                          <div key={bar.key} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 font-medium truncate pr-1">
                              {bar.name}:
                            </span>
                            <span
                              className="font-bold tabular-nums"
                              style={{ color: bar.color }}
                            >
                              {recruiter[bar.key as keyof ChartData]}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Total */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs font-semibold text-gray-700">Total:</span>
                        <span className="text-xs font-bold text-indigo-600 tabular-nums">
                          {config.bars.reduce((sum, bar) => {
                            return sum + (Number(recruiter[bar.key as keyof ChartData]) || 0)
                          }, 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
              <BarChart3 className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No data available.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default RecruiterPerformanceTable