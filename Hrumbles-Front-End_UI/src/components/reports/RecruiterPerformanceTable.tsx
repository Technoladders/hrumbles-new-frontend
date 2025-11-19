"use client"

import type React from "react"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Files, ChevronUp, ChevronDown, User, BarChart3, ChevronLeft, ChevronRight } from "lucide-react"
import jsPDF from "jspdf"
import "jspdf-autotable"
import FileSaver from "file-saver"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

const RecruiterPerformanceTable: React.FC<RecruiterPerformanceTableProps> = ({ data }) => {
  const [sortColumn, setSortColumn] = useState<string>("recruiter")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState<number>(1)

  const rowsPerPage = 5
  const totalPages = Math.ceil(data.length / rowsPerPage)

  console.log("datatat", data)

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
    setCurrentPage(1) // Reset to first page on sort
  }

  const sortedData = [...data].sort((a, b) => {
    let aValue: any = a
    let bValue: any = b

    const parts = sortColumn.split(".")
    for (const part of parts) {
      aValue = aValue[part as keyof typeof aValue]
      bValue = bValue[part as keyof typeof bValue]
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return sortDirection === "asc" ? aValue - bValue : bValue - aValue
  })

  // Calculate the data to display for the current page
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage)

  console.log("paginatedData", paginatedData)
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
            ? (recruiter.interviews.l1) / recruiter.sent_to_client
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

  const renderSortIndicator = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === "asc" ? (
        <ChevronUp className="h-4 w-4 transition-transform duration-200" />
      ) : (
        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
      )
    }
    return null
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const getPercentageColor = (value: number) => {
    if (value >= 0.7) return "text-emerald-600 font-semibold"
    if (value >= 0.5) return "text-amber-600 font-medium"
    return "text-rose-600"
  }

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Recruiter Performance Metrics
            </CardTitle>
            <CardDescription className="text-purple-100 mt-1">
              Detailed breakdown of recruiter performance across the recruitment funnel
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
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-indigo-50 border-b border-indigo-100">
                <TableHead
                  className="cursor-pointer whitespace-nowrap text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4 sticky left-0 bg-white whitespace-nowrap"
                  onClick={() => handleSort("recruiter")}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    Recruiter
                    {renderSortIndicator("recruiter")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
                  onClick={() => handleSort("jobs_assigned")}
                >
                  <div className="flex items-center gap-2">
                    Jobs
                    {renderSortIndicator("jobs_assigned")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
                  onClick={() => handleSort("profiles_submitted")}
                >
                  <div className="flex items-center gap-2">
                    Submitted
                    {renderSortIndicator("profiles_submitted")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
                  onClick={() => handleSort("internal_reject")}
                >
                  <div className="flex items-center gap-2">
                    Int. Reject
                    {renderSortIndicator("internal_reject")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
                  onClick={() => handleSort("client_reject")}
                >
                  <div className="flex items-center gap-2">
                    Client Rej.
                    {renderSortIndicator("client_reject")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
                  onClick={() => handleSort("sent_to_client")}
                >
                  <div className="flex items-center gap-2">
                    To Client
                    {renderSortIndicator("sent_to_client")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
                  onClick={() => handleSort("interviews.technical")}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          Technical
                          {renderSortIndicator("interviews.technical")}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Technical interview stage</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
                  onClick={() => handleSort("interviews.l1")}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          L1 Int.
                          {renderSortIndicator("interviews.l1")}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Level 1 interview stage</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
                  onClick={() => handleSort("interviews.l2")}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          L2 Int.
                          {renderSortIndicator("interviews.l2")}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Level 2 interview stage</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
                  onClick={() => handleSort("interviews.end_client")}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          EC Int.
                          {renderSortIndicator("interviews.end_client")}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">End Client interview stage</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
                  onClick={() => handleSort("offers.made")}
                >
                  <div className="flex items-center gap-2">
                    Offers
                    {renderSortIndicator("offers.made")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
                  onClick={() => handleSort("joining.joined")}
                >
                  <div className="flex items-center gap-2">
                    Joined
                    {renderSortIndicator("joining.joined")}
                  </div>
                </TableHead>
                <TableHead className="text-right text-indigo-900 font-semibold py-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Sub→Client</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Submission-to-Client Ratio</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right text-indigo-900 font-semibold py-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Client Accept</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Client Acceptance Rate</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right text-indigo-900 font-semibold py-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Client Rej. Rate</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Client Rejection Rate</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                {/* <TableHead className="text-right text-indigo-900 font-semibold py-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Tech→L1</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Technical to L1 Conversion Rate</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead> */}
                <TableHead className="text-right text-indigo-900 font-semibold py-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Offer Accept</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Offer Acceptance Rate</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right text-indigo-900 font-semibold py-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Funnel Eff.</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Overall Funnel Efficiency</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((recruiter, index) => {
                const metrics = calculateDerivedMetrics(recruiter)

                return (
                  <TableRow
                    key={index}
                    className={`border-b border-gray-100 hover:bg-indigo-50/50 transition-colors duration-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    <TableCell className="font-medium text-gray-900 sticky left-0 bg-white whitespace-nowrap">{recruiter.recruiter}</TableCell>
                    <TableCell className="text-gray-700">{recruiter.jobs_assigned}</TableCell>
                    <TableCell className="text-gray-700">{recruiter.profiles_submitted}</TableCell>
                    <TableCell className="text-gray-700">{recruiter.internal_reject}</TableCell>
                    <TableCell className="text-gray-700">{recruiter.client_reject}</TableCell>
                    <TableCell className="text-gray-700">{recruiter.sent_to_client}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1.5 justify-center items-center">
                        <span className="font-medium text-gray-800">{recruiter.interviews.technical}</span>
                        <div className="flex justify-center items-center">
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0.5 text-center hover:bg-gray-100 transition-colors duration-200"
                          >
                            <span className="bg-emerald-100 text-emerald-700 px-1 rounded">{recruiter.interviews.technical_selected}</span>
                            <span className="mx-1">/</span>
                            <span className="bg-rose-100 text-rose-700 px-1 rounded">{recruiter.interviews.technical_reject}</span>
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1.5 justify-center items-center">
                        <span className="font-medium text-gray-800">{recruiter.interviews.l1}</span>
                        <div className="flex justify-center items-center">
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0.5 text-center hover:bg-gray-100 transition-colors duration-200"
                          >
                            <span className="bg-emerald-100 text-emerald-700 px-1 rounded">{recruiter.interviews.l1_selected}</span>
                            <span className="mx-1">/</span>
                            <span className="bg-rose-100 text-rose-700 px-1 rounded">{recruiter.interviews.l1_reject}</span>
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1.5 justify-center items-center">
                        <span className="font-medium text-gray-800">{recruiter.interviews.l2}</span>
                        <div className="flex justify-center items-center">
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0.5 text-center hover:bg-gray-100 transition-colors duration-200"
                          >
                            <span className="bg-rose-100 text-rose-700 px-1 rounded">{recruiter.interviews.l2_reject}</span>
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1.5 justify-center items-center">
                        <span className="font-medium text-gray-800">{recruiter.interviews.end_client}</span>
                        <div className="flex justify-center items-center">
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0.5 text-center hover:bg-gray-100 transition-colors duration-200"
                          >
                            <span className="bg-rose-100 text-rose-700 px-1 rounded">{recruiter.interviews.end_client_reject}</span>
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1.5 justify-center items-center">
                        <span className="font-medium text-gray-800">{recruiter.offers.made}</span>
                        <div className="flex justify-center items-center">
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0.5 text-center hover:bg-gray-100 transition-colors duration-200"
                          >
                            <span className="bg-emerald-100 text-emerald-700 px-1 rounded">{recruiter.offers.accepted}</span>
                            <span className="mx-1">/</span>
                            <span className="bg-rose-100 text-rose-700 px-1 rounded">{recruiter.offers.rejected}</span>
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-1.5 justify-center items-center">
                        <span className="font-medium text-gray-800">{recruiter.joining.joined}</span>
                        <div className="flex justify-center items-center">
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-0.5 text-center hover:bg-gray-100 transition-colors duration-200"
                          >
                            <span className="bg-rose-100 text-rose-700 px-1 rounded">{recruiter.joining.no_show}</span>
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right ${getPercentageColor(metrics[0].value)}`}>
                      {formatPercentage(metrics[0].value)}
                    </TableCell>
                    <TableCell className={`text-right ${getPercentageColor(metrics[1].value)}`}>
                      {formatPercentage(metrics[1].value)}
                    </TableCell>
                    <TableCell className={`text-right text-rose-600`}>
                      {formatPercentage(metrics[10].value)}
                    </TableCell>
                    {/* <TableCell className={`text-right ${getPercentageColor(metrics[3].value)}`}>
                      {formatPercentage(metrics[3].value)}
                    </TableCell> */}
                    <TableCell className={`text-right ${getPercentageColor(metrics[7].value)}`}>
                      {formatPercentage(metrics[7].value)}
                    </TableCell>
                    <TableCell className={`text-right ${getPercentageColor(metrics[9].value)}`}>
                      {formatPercentage(metrics[9].value)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RecruiterPerformanceTable