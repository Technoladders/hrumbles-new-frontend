
import { DollarSign } from "lucide-react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { JobData } from "@/lib/types";

interface ClientDetailsCardProps {
  clientDetails: JobData['clientDetails'];
}

const ClientDetailsCard = ({ clientDetails }: ClientDetailsCardProps) => {
  if (!clientDetails) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Details</CardTitle>
        <CardDescription>Client and budget information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {clientDetails.clientName && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Client Name</h4>
            <p>{clientDetails.clientName}</p>
          </div>
        )}
        
        {clientDetails.clientBudget && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Budget</h4>
            <div className="flex items-center gap-1">
              <DollarSign size={14} className="text-gray-500" />
              <p>{clientDetails.clientBudget}</p>
            </div>
          </div>
        )}
        
        {clientDetails.endClient && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">End Client</h4>
            <p>{clientDetails.endClient}</p>
          </div>
        )}
        
        {clientDetails.pointOfContact && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Contact Person</h4>
            <p>{clientDetails.pointOfContact}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientDetailsCard;
