
import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/utils/currency';
import { X, Plus } from 'lucide-react';

interface CustomItem {
  name: string;
  amount: number;
}

interface DynamicEarningsProps {
  title: string;
  items: CustomItem[];
  onChange: (items: CustomItem[]) => void;
  type: 'earnings' | 'deductions';
}

const DynamicEarningsDeductions: React.FC<DynamicEarningsProps> = ({ 
  title, items, onChange, type 
}) => {
  const addItem = () => {
    onChange([...items, { name: '', amount: 0 }]);
  };

  const updateItem = (index: number, field: 'name' | 'amount', value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Button onClick={addItem} type="button" variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add {type === 'earnings' ? 'Earning' : 'Deduction'}
        </Button>
      </div>
      
      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <Label>Name</Label>
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  placeholder={`${type === 'earnings' ? 'Earning' : 'Deduction'} name`}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.amount || ''}
                  onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                />
              </div>
              <Button 
                onClick={() => removeItem(index)} 
                type="button" 
                variant="ghost" 
                size="icon"
                className="text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No custom {type} added yet. Click the button above to add.
        </p>
      )}
    </Card>
  );
};

export default DynamicEarningsDeductions;
