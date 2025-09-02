// ClientRevenueExpenseChart.tsx

"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Loader2 } from "lucide-react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- INTERFACES ---
interface MonthlyData {
  month: string;
  revenue: number;
  profit: number;
}

interface Props {
  chartData: MonthlyData[];
  dataType: "revenue" | "profit";
  isLoading: boolean;
}

// --- MAIN COMPONENT ---
const ClientRevenueExpenseChart: React.FC<Props> = ({ chartData, dataType, isLoading }) => {

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const totalValue = chartData.reduce((sum, data) => sum + (dataType === "revenue" ? data.revenue : data.profit), 0);

  const createGradient = (context: any, startColor: string, endColor: string) => {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) return null;
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    return gradient;
  };

  const currentChartData = {
    labels: chartData.map((data) => data.month),
    datasets: [
      {
        label: dataType === "revenue" ? "Revenue" : "Profit",
        data: chartData.map((data) => (dataType === "revenue" ? data.revenue : data.profit)),
        backgroundColor: (context: any) =>
          createGradient(context, dataType === "revenue" ? "#9333ea" : "#eab308", dataType === "revenue" ? "#6366f1" : "#facc15"),
        borderWidth: 0,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
     responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: { color: "#000000", font: { size: 12, weight: "600" as const } },
      },
      y: { display: false },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: dataType === "revenue" ? "rgba(99, 102, 241, 0.9)" : "rgba(250, 204, 21, 0.9)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: dataType === "revenue" ? "#6366f1" : "#facc15",
        borderWidth: 2,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `${dataType === "revenue" ? "Revenue" : "Profit"}: ₹${context.parsed.y.toLocaleString("en-IN")}`,
        },
      },
    },
  };

  return (
    <Card className="shadow-xl h-full border-none bg-white text-gray-900 overflow-hidden">
      <CardHeader className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold flex items-center gap-3">
            <div className={`w-3 h-3 ${dataType === "revenue" ? "bg-indigo-500" : "bg-yellow-500"} rounded-full`}></div>
            Monthly {dataType === "revenue" ? "Revenue" : "Profit"}
          </CardTitle>
          <span className={`text-xl font-bold ${dataType === "revenue" ? "text-indigo-600" : "text-yellow-600"}`}>
            {formatCurrency(totalValue)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[240px]">
            <Loader2 className={`h-8 w-8 animate-spin ${dataType === "revenue" ? "text-indigo-500" : "text-yellow-500"}`} />
          </div>
        ) : (
          <div className="h-[240px]">
            <Bar data={currentChartData} options={chartOptions as any} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientRevenueExpenseChart;