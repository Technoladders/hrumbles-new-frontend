import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import supabase from "../config/supabaseClient";
import ClientTable from "../components/Client/ClientTable";
import AddClientDialog from "../components/Client/AddClientDialog";
import { Button } from "../components/ui/button";
import { Download, Plus } from "lucide-react";
import CircularProgressBar from "../components/ui/CiruclarProgressBar";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import RevenueProfitChart from "../components/Client/RevenueProfitChart";

const ClientManagement = () => {
  const [addClientOpen, setAddClientOpen] = useState(false);

  // ✅ Fetch Clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_clients")
        .select("id, display_name");

      if (error) throw error;
      return data || [];
    },
  });

  // ✅ Fetch Project Employees (To Compute Revenue & Profit)
  const { data: projectEmployees } = useQuery({
    queryKey: ["project-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_project_employees")
        .select("client_id, project_id, salary, client_billing");

      if (error) throw error;
      return data || [];
    },
  });

  // ✅ Calculate Revenue & Profit Per Client
  const clientFinancials = clients?.map((client) => {
    const clientProjects = projectEmployees?.filter((pe) => pe.client_id === client.id) || [];
    const totalRevenue = clientProjects.reduce((acc, pe) => acc + (parseInt(pe.client_billing) || 0), 0);
    const totalProfit = totalRevenue - clientProjects.reduce((acc, pe) => acc + (parseInt(pe.salary) || 0), 0);

    return {
      ...client,
      total_projects: new Set(clientProjects.map((pe) => pe.project_id)).size,
      revenue: totalRevenue,
      profit: totalProfit,
    };
  }) || [];

  // ✅ Calculate Overall Stats
  const totalProjects = clientFinancials?.reduce((acc, c) => acc + c.total_projects, 0) || 0;
  const totalRevenue = clientFinancials?.reduce((acc, c) => acc + c.revenue, 0) || 0;
  const totalProfit = clientFinancials?.reduce((acc, c) => acc + c.profit, 0) || 0;

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-6">Project Management</h1>

          {/* ✅ Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-6 rounded-xl glass-card">
              <p className="text-sm text-muted-foreground mb-2">📌 Total Projects</p>
              <p className="text-2xl font-semibold">{totalProjects}</p>
            </div>
            <div className="p-6 rounded-xl glass-card">
              <p className="text-sm text-muted-foreground mb-2">💰 Total Revenue</p>
              <p className="text-2xl font-semibold">₹ {totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-6 rounded-xl glass-card">
              <p className="text-sm text-muted-foreground mb-2">💼 Total Profit</p>
              <p className="text-2xl font-semibold">₹ {totalProfit.toLocaleString()}</p>
            </div>
          </div>

          {/* ✅ Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4">Projects & Revenue per Client</h2>
              <ResponsiveContainer width="100%" height={250}>
  <BarChart data={clientFinancials}>
    <XAxis dataKey="display_name" />
    <YAxis />
    <Tooltip />

    {/* ✅ Normal Bar */}
    <Bar dataKey="total_projects" fill="#4A90E2" name="Projects" radius={[10, 10, 0, 0]} />

    {/* ✅ Apply CSS Gradient via className */}
    <Bar dataKey="revenue" className="bar-revenue" fill="var(--theme-green)" name="Revenue" radius={[10, 10, 0, 0]} />

    {/* ✅ Apply Normal Color via CSS Variable */}
    <Bar dataKey="profit" className="bar-profit" name="Profit" fill="var(--theme-gray)" radius={[10, 10, 0, 0]} />
  </BarChart>
</ResponsiveContainer>

            </div>

            <div className="glass-card p-6 flex flex-col items-center">
              {/* <h2 className="text-xl font-semibold mb-4">Total Revenue vs Profit</h2> */}
              <RevenueProfitChart revenue={totalRevenue} profit={totalProfit} />
            </div>
          </div>

          {/* ✅ Table Section */}
          <div className="glass-card rounded-2xl p-4">
            <ClientTable />
          </div>
        </div>
      </main>

      {/* ✅ Add Client Dialog */}
      <AddClientDialog open={addClientOpen} onOpenChange={setAddClientOpen} />
    </div>
  );
};

export default ClientManagement;
