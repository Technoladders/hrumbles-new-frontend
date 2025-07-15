// src/pages/sales/ContactsView.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { List, LayoutGrid, MoreHorizontal } from 'lucide-react';
import TanstackContactsPage from './TanstackContactsPage';
import KanbanBoard from './KanbanBoard';
import { ManageStagesDialog } from '@/components/sales/contacts-table/ManageStagesDialog';
import { AddColumnDialog } from '@/components/sales/contacts-table/AddColumnDialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type View = 'table' | 'kanban';

const ContactsView: React.FC = () => {
    const [view, setView] = useState<View>('table');
    const [isManageStagesOpen, setIsManageStagesOpen] = React.useState(false);
    const [isAddColumnOpen, setIsAddColumnOpen] = React.useState(false);

    return (
        // 1. Main container with gradient background and padding, like the example
        <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
            <main className="w-full max-w-8xl md:max-w-7xl lg:max-w-8xl mx-auto space-y-8">
            {/* 2. Page Header Section */}
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
                    {/* View Switcher */}
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

                    {/* Actions Menu */}
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

            {/* 3. Main Content Card - This will contain the table/board and handle scrolling */}
            <main className="flex-1 min-h-0">
                 <Card className="h-full w-full flex flex-col shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl rounded-2xl">
                    {/* The CardContent is now the scrollable container */}
                    <CardContent className="flex-1 overflow-auto p-0 md:p-2">
                         {view === 'table' ? <TanstackContactsPage /> : <KanbanBoard />}
                    </CardContent>
                </Card>
            </main>

            {/* Dialogs remain at the top level */}
            <ManageStagesDialog open={isManageStagesOpen} onOpenChange={setIsManageStagesOpen} />
            <AddColumnDialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen} />
            </main>
        </div>
    );
};

export default ContactsView;