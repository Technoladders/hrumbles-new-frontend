
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  ChevronRight, 
  Timer, 
  FileText, 
  Calendar, 
  Clock, 
  CalendarClock, 
  CheckSquare, 
  Settings, 
  CalendarDays,
  Briefcase, 
  Building2,
  FileEdit
} from "lucide-react";

type SidebarItemType = {
  title: string;
  icon: React.ElementType;
  path: string;
  section: string;
};

const sidebarItems: SidebarItemType[] = [
  // Employee section
  { title: "Time Tracker", icon: Timer, path: "/employee/time-tracker", section: "employee" },
  { title: "Timesheet", icon: FileText, path: "/employee/timesheet", section: "employee" },
  { title: "Regularization", icon: FileEdit, path: "/employee/regularization", section: "employee" },
  { title: "Leave", icon: Calendar, path: "/employee/leave", section: "employee" },
  { title: "Attendance", icon: Clock, path: "/employee/attendance", section: "employee" },
  { title: "Calendar", icon: CalendarClock, path: "/employee/calendar", section: "employee" },
  
  // Approvals section
  { title: "Timesheet Approval", icon: CheckSquare, path: "/approvals/timesheet", section: "approvals" },
  { title: "Regularization Approval", icon: CheckSquare, path: "/approvals/regularization", section: "approvals" },
  { title: "Leave Approval", icon: CheckSquare, path: "/approvals/leave", section: "approvals" },
  { title: "Auto-Terminated Timesheets", icon: CheckSquare, path: "/approvals/auto-terminated", section: "approvals" },
  
  // Admin Settings section
  { title: "Leave Policies", icon: Settings, path: "/admin/leave-policies", section: "admin" },
  { title: "Official Holidays", icon: CalendarDays, path: "/admin/holidays", section: "admin" },
  { title: "Assign Projects", icon: Briefcase, path: "/admin/projects", section: "admin" },
];

type SidebarProps = {
  onToggle: () => void;
  isSidebarOpen: boolean;
};

export function Sidebar({ onToggle, isSidebarOpen }: SidebarProps) {
  const location = useLocation();
  
  const employeeItems = sidebarItems.filter(item => item.section === "employee");
  const approvalItems = sidebarItems.filter(item => item.section === "approvals");
  const adminItems = sidebarItems.filter(item => item.section === "admin");

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo and collapse button */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {isSidebarOpen && (
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-accent" />
            <span className="text-lg font-semibold">TimeTracker</span>
          </div>
        )}
        {!isSidebarOpen && <Building2 className="h-6 w-6 mx-auto text-accent" />}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggle}
          className="ml-auto"
        >
          {isSidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Scrollable navigation area */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-4">
          {/* Employee Section */}
          <div className="mb-4">
            {isSidebarOpen && (
              <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider">
                Employee
              </h3>
            )}
            <div className="space-y-1">
              {employeeItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "sidebar-item",
                    location.pathname === item.path && "sidebar-item-active",
                    !isSidebarOpen && "justify-center p-2"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", !isSidebarOpen && "mx-0")} />
                  {isSidebarOpen && <span>{item.title}</span>}
                </Link>
              ))}
            </div>
          </div>

          {/* Approvals Section */}
          <div className="mb-4">
            {isSidebarOpen && (
              <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider">
                Approvals
              </h3>
            )}
            <div className="space-y-1">
              {approvalItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "sidebar-item",
                    location.pathname === item.path && "sidebar-item-active",
                    !isSidebarOpen && "justify-center p-2"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", !isSidebarOpen && "mx-0")} />
                  {isSidebarOpen && <span>{item.title}</span>}
                </Link>
              ))}
            </div>
          </div>

          {/* Admin Settings Section */}
          <div className="mb-4">
            {isSidebarOpen && (
              <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider">
                Admin Settings
              </h3>
            )}
            <div className="space-y-1">
              {adminItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "sidebar-item",
                    location.pathname === item.path && "sidebar-item-active",
                    !isSidebarOpen && "justify-center p-2"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", !isSidebarOpen && "mx-0")} />
                  {isSidebarOpen && <span>{item.title}</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
