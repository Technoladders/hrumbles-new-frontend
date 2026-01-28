import { LeadsHeader } from '@/components/crm/LeadsHeader';
import { ActiveFilters } from '@/components/crm/ActiveFilters';
import { FilterSidebar } from '@/components/crm/FilterSidebar';
import { DataTable } from '@/components/crm/DataTable';
import { useCRMStore } from '@/stores/crmStore';

export default function LeadsWorkspace() {
  const sidebarOpen = useCRMStore((state) => state.sidebarOpen);

  return (
    <div className="flex h-screen w-full flex-col bg-background overflow-hidden">
      {/* 1. Global Header */}
      <LeadsHeader />

      {/* 2. Feedback Bar for Filters */}
      <ActiveFilters />

      {/* 3. Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Collapsible Sidebar */}
        <div className={sidebarOpen ? "block" : "hidden"}>
           <FilterSidebar />
        </div>

        {/* The Grid / Table Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-surface-1">
          <div className="h-full w-full overflow-hidden">
             <DataTable />
          </div>
        </main>

      </div>

      {/* 4. Background Styles for Apollo Look */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --surface-0: #ffffff;
          --surface-1: #f8fafc;
          --surface-2: #f1f5f9;
          --border: #e2e8f0;
          --hover: #f1f5f9;
          --primary: #6366f1;
        }
        .table-row-hover:hover { background-color: var(--hover); }
        .filter-group-header { 
           display: flex; align-items: center; justify-content: space-between;
           padding: 10px 16px; transition: all 0.2s;
        }
        .filter-group-header:hover { background-color: var(--surface-2); }
      `}} />
    </div>
  );
}