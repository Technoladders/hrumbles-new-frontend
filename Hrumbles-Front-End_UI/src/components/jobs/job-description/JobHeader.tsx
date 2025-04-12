
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, MoreVertical } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenLine, Trash2 } from "lucide-react";
import { JobData } from "@/lib/types";

interface JobHeaderProps {
  job: JobData;
  onViewJD: () => void;
}

const JobHeader = ({ job, onViewJD }: JobHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
        <Link to="/jobs" className="text-gray-500 hover:text-gray-700">
          <Button variant="ghost" className="h-8 w-8 p-0">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{job.title}</h1>
        <Badge
          variant="outline"
          className={`
            ${job.status === "Active" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
            ${job.status === "Pending" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : ""}
            ${job.status === "Completed" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : ""}
          `}
        >
          {job.status}
        </Badge>
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={onViewJD}
        >
          <Eye size={16} />
          <span>View Job Description</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="flex items-center gap-2">
              <PenLine size={16} />
              <span>Edit Job</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Eye size={16} />
              <span>Preview Job</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2 text-red-600 focus:text-red-600">
              <Trash2 size={16} />
              <span>Delete Job</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default JobHeader;
