import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Fetch employees ─────────────────────────────────────────────────────────
export const fetchEmployees = async (organizationId: string) => {
  try {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id, first_name, last_name, email, department_id, role_id')
      .eq('organization_id', organizationId);

    if (error) throw error;

    return data.map(employee => ({
      value: employee.id,
      label: `${employee.first_name} ${employee.last_name}`
    }));
  } catch (error) {
    console.error("Error fetching employees:", error);
    throw error;
  }
};

// ─── Fetch departments (kept for backwards compat if used elsewhere) ──────────
export const fetchDepartments = async (organizationId: string) => {
  try {
    const { data, error } = await supabase
      .from('hr_departments')
      .select('id, name')
      .eq('organization_id', organizationId);

    if (error) throw error;

    return data.map(department => ({
      value: department.id,
      label: department.name
    }));
  } catch (error) {
    console.error("Error fetching departments:", error);
    throw error;
  }
};

// ─── Fetch teams from hr_teams (replaces departments in AssignJobModal) ───────
/**
 * Returns active teams for the given org from `hr_teams`.
 * Each entry exposes the team lead name as a subtitle so the
 * modal can display it under the team name.
 */
export const fetchTeams = async (organizationId: string) => {
  try {
    const { data, error } = await supabase
      .from('hr_teams')
      .select(`
        id,
        name,
        team_type,
        level,
        team_lead:hr_employees!team_lead_id(first_name, last_name)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('level')
      .order('name');

    if (error) throw error;

    return (data ?? []).map(team => ({
      value: team.id,
      label: team.name,
      teamType: team.team_type as string,
      level: team.level as number,
      /** Sub-label shown in the dropdown — team lead name if available */
      leadName: team.team_lead
        ? `${team.team_lead.first_name} ${team.team_lead.last_name}`
        : null,
    }));
  } catch (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }
};

// ─── Fetch vendors ────────────────────────────────────────────────────────────
// REPLACE the existing fetchVendors function with this:

export async function fetchVendors(organizationId: string) {
  const { data: roleData, error: roleError } = await supabase
    .from("hr_roles")
    .select("id")
    .eq("name", "vendor")
    .single();

  if (roleError || !roleData) return [];

  const { data, error } = await supabase
    .from("hr_employees")
    .select("id, first_name, last_name, email")
    .eq("organization_id", organizationId)
    .eq("role_id", roleData.id)
    .eq("status", "active");

  if (error) return [];

  return (data || []).map(v => ({
    value: v.id,
    label: `${v.first_name} ${v.last_name}`,
    email: v.email,
  }));
}

// ─── Fetch existing job assignments ──────────────────────────────────────────
export const fetchJobAssignments = async (jobId: string) => {
  try {
const { data, error } = await supabase
  .from('hr_jobs')
  .select('assigned_to, assigned_vendor, budget, budget_type, vendor_budget, vendor_budget_type')
  .eq('id', jobId)
  .single();

    if (error) throw error;

    const assignedTo     = data?.assigned_to;
    const assignedVendor = data?.assigned_vendor ?? null;
    const budget         = data?.budget      ?? null;
    const budgetType     = data?.budget_type ?? null;
    const vendorBudget      = data?.vendor_budget      ?? null;   // ← ADD
const vendorBudgetType  = data?.vendor_budget_type ?? null;   // ← ADD

    let assignments: { value: string; label: string }[] = [];

    if (assignedTo?.type === 'individual' && assignedTo.id) {
      const employeeIds = assignedTo.id.split(',').filter(Boolean);
      const { data: employees } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name')
        .in('id', employeeIds);
      assignments = (employees || []).map(emp => ({
        value: emp.id,
        label: `${emp.first_name} ${emp.last_name}`,
      }));
    }

    return {
      assignments,
      teamAssignment:   assignedTo?.type === 'team' ? assignedTo : null,
      vendorAssignment: assignedVendor,   // keep for backward compat
      // NEW: normalize to array regardless of old object or new array shape
      vendorAssignments: Array.isArray(assignedVendor)
        ? assignedVendor
        : assignedVendor
          ? [assignedVendor]
          : [],
      budget,
      budgetType,
      vendorBudget,
      vendorBudgetType,
    };
  } catch (error) {
    console.error('Error fetching job assignments:', error);
    throw error;
  }
};

// ─── Assign job ───────────────────────────────────────────────────────────────
export const assignJob = async (
  jobId: string,
  assignmentType: 'individual' | 'team' | 'vendor',
  assignmentId: string,          // for vendor: comma-separated ids
  assignmentName: string,        // for vendor: comma-separated names
  budget?: string,
  budgetType?: string,
  userId?: string
) => {
  try {
    const updatePayload =
      assignmentType === 'vendor'
        ? {
            // Store all vendors as array in assigned_vendor
            assigned_vendor: assignmentId.split(',').map((id, i) => ({
              type: 'vendor',
              id:   id.trim(),
              name: assignmentName.split(',')[i]?.trim() ?? '',
            })),
            vendor_budget:      budget ? Number(budget) : null,
            vendor_budget_type: budgetType || null,
            updated_by:         userId,
            updated_at:         new Date().toISOString(),
          }
        : {
            assigned_to: { type: assignmentType, id: assignmentId, name: assignmentName },
            budget:      budget ? Number(budget) : null,
            budget_type: budgetType || null,
            updated_by:  userId,
            updated_at:  new Date().toISOString(),
          };

    const { data, error } = await supabase
      .from('hr_jobs')
      .update(updatePayload)
      .eq('id', jobId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error assigning job:', error);
    throw error;
  }
};