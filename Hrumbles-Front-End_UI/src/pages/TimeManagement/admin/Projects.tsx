
import { useProjectData } from "@/hooks/TimeManagement/useProjectData";
import { CreateProjectDialog } from "@/components/TimeManagement/projects/CreateProjectDialog";
import { CreateEmployeeDialog } from "@/components/TimeManagement/projects/CreateEmployeeDialog";
import { ProjectsTable } from "@/components/TimeManagement/projects/ProjectsTable";
import { ProjectAssignments } from "@/components/TimeManagement/projects/ProjectAssignments";
import { toast } from "sonner";
import { useEffect } from "react";

const Projects = () => {
  const { 
    projects, 
    employees, 
    assignments,
    loading, 
    refetchData,
    assignEmployeeToProject,
    removeEmployeeFromProject 
  } = useProjectData();

  // Assign a project to John Doe on component mount if no assignments exist
  useEffect(() => {
    const setupInitialAssignment = async () => {
      if (assignments.length === 0 && projects.length > 0 && employees.length > 0) {
        // Find John Doe employee
        const johnDoe = employees.find(emp => emp.name === "John Doe");
        const firstProject = projects[0]; // Get the first project
        
        if (johnDoe && firstProject) {
          console.log("Setting up initial project assignment for John Doe");
          const result = await assignEmployeeToProject(firstProject.id, johnDoe.id);
          if (result.success) {
            toast.success("John Doe assigned to project");
            refetchData();
          }
        }
      }
    };
    
    if (!loading) {
      setupInitialAssignment();
    }
  }, [loading, assignments.length, projects, employees]);

  return (
    <div className="content-area">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
          <p className="text-muted-foreground">
            Manage projects and assign employees
          </p>
        </div>
        <div className="flex gap-2">
          <CreateProjectDialog onProjectCreated={refetchData} />
          <CreateEmployeeDialog onEmployeeCreated={refetchData} />
        </div>
      </div>

      <ProjectsTable 
        projects={projects}
        employees={employees}
        onRefetch={refetchData}
      />

      <ProjectAssignments
        projects={projects}
        employees={employees}
        assignments={assignments}
        onAssignEmployee={assignEmployeeToProject}
        onRemoveEmployee={removeEmployeeFromProject}
      />
    </div>
  );
};

export default Projects;
