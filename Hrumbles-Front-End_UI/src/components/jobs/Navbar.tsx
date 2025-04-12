
import { Link, useLocation } from "react-router-dom";
import { Briefcase, User, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Navbar = () => {
  const location = useLocation();
  
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-blue-500 text-white p-2 rounded-md">
                <Briefcase size={20} />
              </div>
              <span className="text-lg font-medium">Staffing Hub</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                to="/jobs" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === "/jobs" 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Jobs
              </Link>
              <Link 
                to="/candidates" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === "/candidates" 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Candidates
              </Link>
              <Link 
                to="/clients" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === "/clients" 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Clients
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search..."
                className="w-40 sm:w-64 pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            
            <button className="p-2 rounded-full hover:bg-gray-100 transition relative">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
            
            <Avatar className="cursor-pointer">
              <AvatarImage src="https://github.com/shadcn.png" alt="User" />
              <AvatarFallback>US</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </nav>
  );
};
