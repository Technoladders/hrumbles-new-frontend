
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Receipt, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AccountsLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AccountsLayout: React.FC<AccountsLayoutProps> = ({ children, title }) => {
  const location = useLocation();
  
  const navItems = [
    { 
      label: 'Finance Dashboard', 
      path: '/finance', 
      icon: Home 
    },
    { 
      label: 'Invoices', 
      path: '/accounts/invoices', 
      icon: FileText 
    },
    { 
      label: 'Expenses', 
      path: '/accounts/expenses', 
      icon: Receipt 
    },
   
  ];
  
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col h-full">
        {/* Top Navigation */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <nav className="hidden flex-1 items-center space-x-2 md:flex">
            {navItems.map((item) => (
              <Button 
                key={item.path} 
                variant={location.pathname === item.path ? "default" : "ghost"} 
                size="sm" 
                asChild
              >
                <Link to={item.path} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            {/* Mobile menu button would go here */}
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 pt-2">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AccountsLayout;
