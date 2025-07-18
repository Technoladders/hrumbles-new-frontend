// src/pages/sales/ContactsView.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { List, LayoutGrid, MoreHorizontal } from 'lucide-react';
import TanstackContactsPage from './TanstackContactsPage';
import KanbanBoard from './KanbanBoard';
import { ManageStagesDialog } from '@/components/sales/contacts-table/ManageStagesDialog';
import { AddColumnDialog } from '@/components/sales/contacts-table/AddColumnDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

type View = 'table' | 'kanban';

const ContactsView: React.FC = () => {
  const [view, setView] = useState<View>('table');
  const [isManageStagesOpen, setIsManageStagesOpen] = React.useState(false);
  const [isAddColumnOpen, setIsAddColumnOpen] = React.useState(false);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full max-w-full space-y-4">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
              Contacts
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Your centralized contact database.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-slate-200 rounded-lg flex items-center">
              <Button
                variant={view === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 md:w-auto px-2 md:px-3"
                onClick={() => setView('table')}
              >
                <List className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Table</span>
              </Button>
              <Button
                variant={view === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 w-8 md:w-auto px-2 md:px-3"
                onClick={() => setView('kanban')}
              >
                <LayoutGrid className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Kanban</span>
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsManageStagesOpen(true)}>
                  Manage Stages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAddColumnOpen(true)}>
                  Add Column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div>
          {view === 'table' ? <TanstackContactsPage /> : <KanbanBoard />}
        </div>
        <ManageStagesDialog open={isManageStagesOpen} onOpenChange={setIsManageStagesOpen} />
        <AddColumnDialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen} />
      </div>
    </DndProvider>
  );
};

export default ContactsView;