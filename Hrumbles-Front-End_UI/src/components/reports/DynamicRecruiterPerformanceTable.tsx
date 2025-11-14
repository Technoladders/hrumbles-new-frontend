"use client"

import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, BarChart3, TrendingUp, FileSpreadsheet, Files, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import jsPDF from "jspdf";
import "jspdf-autotable";
import FileSaver from "file-saver";
import { DynamicRecruiterPerformanceData } from "@/hooks/useDynamicRecruiterReport"; // Using the updated interface

interface Props {
  data: DynamicRecruiterPerformanceData[];
}

const DynamicRecruiterPerformanceTable: React.FC<Props> = ({ data }) => {
  console.log("DynamicRecruiterPerformanceTable", data);
  const [sortColumn, setSortColumn] = useState<keyof DynamicRecruiterPerformanceData>('recruiter');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: keyof DynamicRecruiterPerformanceData) => {
    setSortColumn(column);
    setSortDirection(prev => (sortColumn === column && prev === 'asc' ? 'desc' : 'asc'));
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [data, sortColumn, sortDirection]);

  const formatRatio = (value: number, total: number) => {
    if (total === 0) return 'N/A';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const getPercentageColor = (value: number) => {
    if (value >= 0.8) return "text-emerald-600 font-semibold";
    if (value >= 0.6) return "text-amber-600 font-medium";
    return "text-rose-600";
  };

  const exportToCSV = () => {
    let csv = "Recruiter,Sourced,Screened,Submitted to Client,Interviews,Offers,Joined,Screen Rejections,Client Rejections,Candidate Rejections,Sourced → Screened,Screened → Submitted,Submitted → Interview\n";
    sortedData.forEach((recruiter) => {
      const sourcedToScreened = recruiter.sourced > 0 ? recruiter.screened / recruiter.sourced : 0;
      const screenedToSubmitted = recruiter.screened > 0 ? recruiter.submitted_to_client / recruiter.screened : 0;
      const submittedToInterview = recruiter.submitted_to_client > 0 ? recruiter.interviews / recruiter.submitted_to_client : 0;
      csv += `${recruiter.recruiter},${recruiter.sourced},${recruiter.screened},${recruiter.submitted_to_client},${recruiter.interviews},${recruiter.offers},${recruiter.joined},${recruiter.screen_rejections},${recruiter.client_rejections},${recruiter.candidate_rejections},${sourcedToScreened.toFixed(2)},${screenedToSubmitted.toFixed(2)},${submittedToInterview.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    FileSaver.saveAs(blob, "dynamic_recruiter_performance.csv");
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    doc.setFontSize(18);
    doc.text("Dynamic Recruiter Performance Report", 14, 22);

    const tableData = sortedData.map((recruiter) => {
      const sourcedToScreened = recruiter.sourced > 0 ? recruiter.screened / recruiter.sourced : 0;
      const screenedToSubmitted = recruiter.screened > 0 ? recruiter.submitted_to_client / recruiter.screened : 0;
      const submittedToInterview = recruiter.submitted_to_client > 0 ? recruiter.interviews / recruiter.submitted_to_client : 0;
      return [
        recruiter.recruiter,
        recruiter.sourced.toString(),
        recruiter.screened.toString(),
        recruiter.submitted_to_client.toString(),
        recruiter.interviews.toString(),
        recruiter.offers.toString(),
        recruiter.joined.toString(),
        recruiter.screen_rejections.toString(),
        recruiter.client_rejections.toString(),
        recruiter.candidate_rejections.toString(),
(sourcedToScreened * 100).toFixed(1) + "%",
(screenedToSubmitted * 100).toFixed(1) + "%",
(submittedToInterview * 100).toFixed(1) + "%",

      ];
    });

    const headers = [
      "Recruiter",
      "Sourced",
      "Screened",
      "Submitted",
      "Interviews",
      "Offers",
      "Joined",
      "Screen Rej.",
      "Client Rej.",
      "Candidate Rej.",
      "Sourced to Screened",
      "Screened to Submitted",
      "Submitted to Interview",
    ];
    (doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [240, 244, 255] },
    });

    doc.save("dynamic_recruiter_performance.pdf");
  };

  const renderSortIndicator = (column: keyof DynamicRecruiterPerformanceData) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? (
        <ChevronUp className="h-4 w-4 transition-transform duration-200" />
      ) : (
        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
      );
    }
    return null;
  };

  const SortableHeader = ({ column, title, tooltipText }: { column: keyof DynamicRecruiterPerformanceData; title: string; tooltipText?: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <TableHead
            className="cursor-pointer text-indigo-900 font-semibold hover:bg-indigo-100 transition-colors duration-200 py-4"
            onClick={() => handleSort(column)}
          >
            <div className="flex items-center gap-2">
              {title}
              {renderSortIndicator(column)}
            </div>
          </TableHead>
        </TooltipTrigger>
        {tooltipText && <TooltipContent>{tooltipText}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Recruiter Performance Report
            </CardTitle>
            <CardDescription className="text-purple-100 mt-1">
              Key performance indicators based on hiring stages of the candidates.
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
                <SortableHeader
                  column="recruiter"
                  title={
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-600" />
                      Recruiter
                    </div>
                  }
                  tooltipText="Recruiter name"
                />
                <SortableHeader column="sourced" title="Sourced" tooltipText="Total profiles sourced" />
                <SortableHeader column="screened" title="Screened" tooltipText="Profiles screened internally" />
                <SortableHeader column="submitted_to_client" title="Submitted to Client" tooltipText="Profiles sent to client" />
                <SortableHeader column="interviews" title="Interviews" tooltipText="Total interviews conducted" />
                <SortableHeader column="offers" title="Offers" tooltipText="Offers extended" />
                <SortableHeader column="joined" title="Joined" tooltipText="Candidates who joined" />
                <TableHead className="text-right text-indigo-900 font-semibold py-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Sourced → Screened</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Sourcing to screening conversion rate</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right text-indigo-900 font-semibold py-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Screened → Submitted</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Screening to client submission rate</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right text-indigo-900 font-semibold py-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>Submitted → Interview</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Submission to interview conversion rate</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <SortableHeader column="screen_rejections" title="Screen Rejects" tooltipText="Internal screening rejections" />
                <SortableHeader column="client_rejections" title="Client Rejects" tooltipText="Client-side rejections" />
                <SortableHeader column="candidate_rejections" title="Candidate Rej." tooltipText="Candidate rejections" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length > 0 ? (
                sortedData.map((recruiter, index) => (
                  <TableRow
                    key={recruiter.recruiter}
                    className={`border-b border-gray-100 hover:bg-indigo-50/50 transition-colors duration-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    <TableCell className="font-medium text-gray-900 sticky left-0 bg-white whitespace-nowrap">{recruiter.recruiter}</TableCell>
                    <TableCell className="text-gray-700">{recruiter.sourced}</TableCell>
                    <TableCell className="text-gray-700">{recruiter.screened}</TableCell>
                    <TableCell className="text-gray-700">{recruiter.submitted_to_client}</TableCell>
                    <TableCell className="text-gray-700">{recruiter.interviews}</TableCell>
                    <TableCell className="text-gray-700">{recruiter.offers}</TableCell>
                    <TableCell className="text-gray-700">{recruiter.joined}</TableCell>
                    <TableCell className={`text-right font-medium ${getPercentageColor(recruiter.sourced > 0 ? recruiter.screened / recruiter.sourced : 0)}`}>
                      {formatRatio(recruiter.screened, recruiter.sourced)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getPercentageColor(recruiter.screened > 0 ? recruiter.submitted_to_client / recruiter.screened : 0)}`}>
                      {formatRatio(recruiter.submitted_to_client, recruiter.screened)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getPercentageColor(recruiter.submitted_to_client > 0 ? recruiter.interviews / recruiter.submitted_to_client : 0)}`}>
                      {formatRatio(recruiter.interviews, recruiter.submitted_to_client)}
                    </TableCell>
                    <TableCell className="text-rose-600 font-medium">{recruiter.screen_rejections}</TableCell>
                    <TableCell className="text-rose-600 font-medium">{recruiter.client_rejections}</TableCell>
                    <TableCell className="text-rose-600 font-medium">{recruiter.candidate_rejections}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                    No performance data available for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DynamicRecruiterPerformanceTable;