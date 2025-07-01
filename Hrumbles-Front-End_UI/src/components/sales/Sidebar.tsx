// src/components/Sidebar.tsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom'; // Use NavLink for active styling
import { Building2, Users } from 'lucide-react'; // Or use Contact icon if preferred
import { cn } from "@/lib/utils"; // Assuming you have shadcn's utility function

const Sidebar: React.FC = () => {
  return (
    // Sidebar styling: fixed width, full height, sticky position, border, background, padding, flex column
    <aside className="w-60 h-screen sticky top-0 flex-shrink-0 border-r border-border bg-background p-4 flex flex-col">
      {/* Optional: Logo/Brand Area */}
      <div className="h-16 flex items-center justify-center border-b border-border px-4 mb-4">
        {/* Link the brand name to the homepage */}
        <Link to="/" className="text-xl font-bold text-primary">
          Sales Dashboard
        </Link>
        {/* Or replace with your actual logo image if you have one */}
        {/* <img src="/logo.svg" alt="Logo" className="h-8 w-auto" /> */}
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-2">
        <NavLink
          to="/" // Root path links to Companies list
          end // Use 'end' for exact match styling on the root path
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground" // Active link style
                : "text-muted-foreground hover:bg-muted hover:text-foreground" // Inactive link style
            )
          }
        >
          <Building2 className="h-4 w-4" />
          Companies
        </NavLink>

        <NavLink
          to="/contacts" // Path for the new Contacts page
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <Users className="h-4 w-4" /> {/* Icon for Contacts */}
          Contacts
        </NavLink>

        {/* === Add more sidebar links here as your application grows === */}
        {/* Example:
        <NavLink
          to="/reports"
          className={({ isActive }) => cn(...) }
        >
          <LineChart className="h-4 w-4" />
          Reports
        </NavLink>
        */}
      </nav>

      {/* Optional: Spacer to push footer down */}
      <div className="mt-auto"></div>

      {/* Optional: Footer or User Info Area */}
      {/* <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">User Info / Settings</p>
      </div> */}
    </aside>
  );
};

export default Sidebar; // Ensure default export