import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BudgetFieldProps {
  data: {
    clientBudget?: string;
    currency_type?: string;
    budget_type?: string;
    hiringMode?: string;
  };
  onChange: (data: Partial<{ clientBudget: string; currency_type: string; budget_type: string }>) => void;
}

const BudgetField = ({ data, onChange }: BudgetFieldProps) => {
  const currencies = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
  ];

  // Determines budget type options based on the hiring mode
  const getBudgetTypeOptions = () => {
    switch (data.hiringMode) {
      case "Full Time":
        return ["LPA", "Monthly", "Hourly"];
      case "Contract":
      case "Part Time":
        return ["Monthly", "Hourly"];
      case "Intern":
        return ["Stipend", "Unpaid"];
      default:
        return ["LPA", "Monthly"]; // Default if no hiring mode is selected
    }
  };

  const budgetTypeOptions = getBudgetTypeOptions();
  
  // Effect to auto-update budget type if it becomes invalid after changing hiring mode
  useEffect(() => {
    if (data.budget_type && !budgetTypeOptions.includes(data.budget_type)) {
      const newBudgetType = budgetTypeOptions[0];
      const currentCurrency = currencies.find((c) => c.value === data.currency_type) || currencies[0];
      const numericValue = (data.clientBudget || "").replace(/[^0-9.]/g, '');
      
      const newClientBudget = newBudgetType === 'Unpaid' 
        ? 'Unpaid' 
        : `${currentCurrency.symbol}${numericValue} ${newBudgetType}`;
        
      onChange({ budget_type: newBudgetType, clientBudget: newClientBudget });
    }
  }, [data.hiringMode]);

  // Derive current state from props for rendering
  const currentBudgetType = data.budget_type || budgetTypeOptions[0];
  const isUnpaid = currentBudgetType === "Unpaid";
  const currentCurrency = currencies.find((c) => c.value === data.currency_type) || currencies[0];
  const numericValue = isUnpaid ? "" : (data.clientBudget || "").replace(/[^0-9.]/g, '');

  // Helper function to build the final budget string
  const recomposeBudget = (
    currency: { value: string; symbol: string }, 
    value: string, 
    type: string
  ) => {
    if (type === "Unpaid") return "Unpaid";
    return `${currency.symbol}${value} ${type}`;
  };

  // Handlers for updating form state
  const handleInputChange = (value: string) => {
    const sanitizedValue = value.match(/^\d*\.?\d*$/) ? value : numericValue;
    onChange({
      clientBudget: recomposeBudget(currentCurrency, sanitizedValue, currentBudgetType),
    });
  };

  const handleCurrencyChange = (value: string) => {
    const selectedCurrency = currencies.find((c) => c.value === value) || currencies[0];
    onChange({
      currency_type: selectedCurrency.value,
      clientBudget: recomposeBudget(selectedCurrency, numericValue, currentBudgetType),
    });
  };

  const handleBudgetTypeChange = (value: string) => {
    const newNumericValue = value === 'Unpaid' ? '' : numericValue;
    onChange({
      budget_type: value,
      clientBudget: recomposeBudget(currentCurrency, newNumericValue, value),
    });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="clientBudget">
        Client Budget <span className="text-red-500">*</span>
      </Label>
      <div className="flex">
        {/* Currency Selector */}
        <Select value={currentCurrency.value} onValueChange={handleCurrencyChange} disabled={isUnpaid}>
          <SelectTrigger className="w-[80px] rounded-r-none border-r-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((currency) => (
              <SelectItem key={currency.value} value={currency.value}>
                {currency.symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Budget Input */}
        <Input
          id="clientBudget"
          placeholder={isUnpaid ? "Unpaid Internship" : "Enter amount"}
          value={numericValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className="rounded-none"
          disabled={isUnpaid}
          type="text"
          inputMode="decimal"
        />

        {/* Dynamic Budget Type Selector */}
        <Select value={currentBudgetType} onValueChange={handleBudgetTypeChange}>
          <SelectTrigger className="w-[110px] rounded-l-none border-l-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {budgetTypeOptions.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default BudgetField;