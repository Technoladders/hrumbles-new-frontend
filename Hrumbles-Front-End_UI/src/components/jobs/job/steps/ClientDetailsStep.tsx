
import { ClientDetailsStepProps } from "./client-details/types";
import ClientInformationFields from "./client-details/ClientInformationFields";
import BudgetField from "./client-details/BudgetField";
import AssignJobField from "./client-details/AssignJobField";

const ClientDetailsStep = ({ data, onChange, hiringMode }: ClientDetailsStepProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Client Details</h3>
        <p className="text-sm text-gray-500">
          Enter details about the client for this job posting.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ClientInformationFields 
          data={data} 
          onChange={onChange} 
        />
        
        <BudgetField 
          data={data} 
          onChange={onChange} 
        
        />
        
        {/* <AssignJobField 
          data={data} 
          onChange={onChange} 
        /> */}
      </div>
    </div>
  );
};

export default ClientDetailsStep;
