
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface ProjectBreakdownProps {
  projects: {
    name: string;
    value: number;
    time: string;
    color: string;
  }[];
}

export function ProjectBreakdown({ projects }: ProjectBreakdownProps) {
  return (
    <div className="flex h-64">
      <div className="w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={projects}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {projects.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="w-1/2 flex flex-col justify-center space-y-4">
        {projects.map((project, index) => (
          <div key={index} className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: project.color }} />
              <span className="text-sm">{project.name}</span>
            </div>
            <span className="text-sm text-gray-500">{project.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
