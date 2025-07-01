import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientDetailsData } from "./types";
import {
  Select1,
  SelectContent7,
  SelectItem9,
  SelectTrigger4,
  SelectValue3,
} from "@/components/ui/select";

interface BudgetFieldProps {
  data: ClientDetailsData;
  onChange: (data: Partial<ClientDetailsData>) => void;
}

const BudgetField = ({ data, onChange }: BudgetFieldProps) => {
  const currencies = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
  ];

  // Extract current currency and numeric value
  const currentCurrency =
    currencies.find((c) => data.clientBudget.startsWith(c.symbol)) || currencies[0];
  const numericValue = data.clientBudget.replace(currentCurrency.symbol, "").replace(" LPA", "").trim();

  // Handle input change
  const handleInputChange = (value: string) => {
    onChange({
      clientBudget: `${currentCurrency.symbol}${value} LPA`,
      currency_type: currentCurrency.value,
    });
  };

  // Handle currency change
  const handleCurrencyChange = (value: string) => {
    const selectedCurrency = currencies.find((c) => c.value === value) || currencies[0];
    onChange({
      clientBudget: `${selectedCurrency.symbol}${numericValue} LPA`,
      currency_type: selectedCurrency.value,
    });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="clientBudget">
        Client Budget <span className="text-red-500">*</span>
      </Label>
      <div className="flex">
        <Select1 value={currentCurrency.value} onValueChange={handleCurrencyChange}>
          <SelectTrigger4 className="w-[80px] rounded-r-none border-r-0">
            <SelectValue3 />
          </SelectTrigger4>
          <SelectContent7>
            {currencies.map((currency) => (
              <SelectItem9 key={currency.value} value={currency.value}>
                {currency.symbol} {currency.value}
              </SelectItem9>
            ))}
          </SelectContent7>
        </Select1>
        <Input
          id="clientBudget"
          placeholder="Enter client budget"
          value={numericValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className="rounded-r-none"
        />
        <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 bg-gray-100 text-gray-600 rounded-r-md">
          LPA
        </span>
      </div>
    </div>
  );
};

export default BudgetField;