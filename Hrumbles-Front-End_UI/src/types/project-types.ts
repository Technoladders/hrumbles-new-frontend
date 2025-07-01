
export type Project = {
  id: string;
  name: string;
  client: string;
  start_date: string;
  end_date: string | null;
  status: string;
};

export type Employee = {
  id: string;
  name: string;
  department: string;
};

export type NewProject = {
  name: string;
  client: string;
  start_date: string;
  end_date: string;
};

export type NewEmployee = {
  name: string;
  department: string;
};

export type ProjectAssignment = {
  id: string;
  project_id: string;
  employee_id: string;
  assigned_at: string;
};
