
export interface ClientDetailsData {
  clientName: string;
  clientBudget: string;
  endClient: string;
  pointOfContact: string;
  assignedTo: string;
  currency_type: string;
}

export interface ClientDetailsStepProps {
  data: ClientDetailsData;
  onChange: (data: Partial<ClientDetailsData>) => void;
  hiringMode: string;
}
