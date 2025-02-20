
import React from "react";
import { useState } from "react";
// import Header from "@/components/Header";
import StatsCard from "../components/Client/StatsCard";
import ClientTable from "../components/Client/ClientTable";
import AddClientDialog from "../components/Client/AddClientDialog";
import { Button } from "../components/ui/button";
import { Download, Filter, Plus, ChevronDown } from "lucide-react";

const Index = () => {
  const [addClientOpen, setAddClientOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* <Header /> */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-6">Client Management</h1>
          <div className="flex items-center gap-4 mb-8">
            <StatsCard label="Ongoing" value="25%" color="bg-zinc-900" />
            <StatsCard label="Completed" value="51%" color="bg-primary" />
            <StatsCard label="Project time" value="10%" color="bg-secondary" textColor="text-muted-foreground" />
            <StatsCard label="Output" value="14%" color="bg-white" textColor="text-muted-foreground" />
          </div>
         
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                Columns
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm">
                Department
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm">
                Site
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm">
                Lifecycle
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm">
                Status
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm">
                Entity
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                variant="outline" 
                className="rounded-full"
                onClick={() => setAddClientOpen(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="outline" className="rounded-full">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <ClientTable />
        </div>
      </main>
      <AddClientDialog 
        open={addClientOpen} 
        onOpenChange={setAddClientOpen}
      />
    </div>
  );
};

export default Index;
