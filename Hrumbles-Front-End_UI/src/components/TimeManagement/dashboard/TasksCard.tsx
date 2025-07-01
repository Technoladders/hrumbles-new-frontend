
interface TasksCardProps {
  tasks: {
    id: number;
    name: string;
    project: string;
    time: string;
    bgColor: string;
  }[];
}

export function TasksCard({ tasks }: TasksCardProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {tasks.map(task => (
        <div key={task.id} className={`p-4 rounded-md ${task.bgColor} relative`}>
          <h4 className="font-medium mb-8">{task.name}</h4>
          <div className="absolute bottom-3 left-4 text-xs text-gray-500">
            {task.project}
          </div>
          <div className="absolute bottom-3 right-4 text-xs font-medium">
            {task.time}
          </div>
        </div>
      ))}
    </div>
  );
}
