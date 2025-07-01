
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface TopEmployeeProps {
  title: string;
  employees: {
    id: string;
    name: string;
    percent?: number;
    timeLogged?: string;
    color?: string;
  }[];
  type: 'activity' | 'time';
}

export function TopEmployeesCard({ title, employees, type }: TopEmployeeProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-amber-500">🏆</span>
          <h3 className="font-medium text-gray-700">{title}</h3>
        </div>

        <div className="space-y-4">
          {employees.map((employee) => (
            <div key={employee.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  employee.color ? '' : 'bg-sky-400'
                }`} 
                style={employee.color ? { backgroundColor: employee.color } : {}}
                />
                <span className="text-sm">{employee.name}</span>
              </div>
              
              {type === 'activity' ? (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${employee.color ? '' : 'bg-sky-400'}`}
                      style={{ 
                        width: `${employee.percent}%`,
                        backgroundColor: employee.color || ''
                      }} 
                    />
                  </div>
                  <span className="text-sm font-medium">{employee.percent}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">{employee.timeLogged}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
