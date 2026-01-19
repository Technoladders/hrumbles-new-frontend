import React, { useState } from 'react';
import { useSelector } from "react-redux";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, UserCog, Shield, Building, LocateFixed, 
  Mail, Blocks, KeyRound, UserCheck, Briefcase 
} from "lucide-react";
import { Box, Flex } from "@chakra-ui/react";
import { supabase } from "@/integrations/supabase/client";


// Components
import UserManagementDashboard from './UserManagementDashboard';
import TeamManagement from './TeamManagement';
import RolePermissionsManagement from './RolePermissionsManagement';
import OrganizationalChart from './OrganizationalChart';
import EmailConfigurationManagement from './EmailConfigurationManagement';
import OrganizationStructureManagement from './OrganizationStructureManagement';
import PermissionMatrix from './PermissionMatrix'; // The unified component we designed

// Utility Selectors
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EnhancedUserManagement = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const { details: organizationDetails } = useSelector((state: any) => state.firmOrganization);
  const [roleIdForDeptTab, setRoleIdForDeptTab] = useState<string>("");

  // States for the Three-Tier Mapping
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  console.log("organizationDetails", organizationDetails);
  console.log("selectedRoleId", selectedRoleId);
  console.log("selectedDeptId", selectedDeptId);
  console.log("selectedEmployeeId", selectedEmployeeId);


  // Helpers for conditional rendering
  const isAscendionUser = organizationId === "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";
  const isRecruitmentFirmUser = organizationDetails?.is_recruitment_firm;
  
  // Enabled Suites from Global Admin
  const enabledSuites = organizationDetails?.subscription_features || {};

  return (
    <div className="max-w-8xl mx-auto py-6 space-y-6">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <div className="flex justify-between items-center">
            <Box>
              <CardTitle className="text-2xl flex items-center gap-3">
                <UserCog className="h-8 w-8 text-violet-600" />
                Organization Management
              </CardTitle>
              <CardDescription>
                Manage your workforce, departments, and granular access permissions.
              </CardDescription>
            </Box>
          </div>
        </CardHeader>
        
        <CardContent className="px-0">
          <Tabs defaultValue="users" className="w-full">
            {/* MAIN NAVIGATION TABS */}
            <TabsList className="inline-flex h-12 items-center justify-start rounded-xl bg-gray-100/80 p-1 text-muted-foreground mb-6">
              <TabsTrigger value="users" className="rounded-lg px-5 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">
                <Users className="h-4 w-4" /> Users
              </TabsTrigger>
              
              {!isAscendionUser && !isRecruitmentFirmUser && (
                <>
                  <TabsTrigger value="teams" className="rounded-lg px-5 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-violet-700">
                    <Building className="h-4 w-4" /> Teams
                  </TabsTrigger>
                  <TabsTrigger value="structure" className="rounded-lg px-5 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-violet-700">
                    <Blocks className="h-4 w-4" /> Structure
                  </TabsTrigger>
                </>
              )}

              <TabsTrigger value="access" className="rounded-lg px-5 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-violet-700">
                <KeyRound className="h-4 w-4" /> Access Control
              </TabsTrigger>

              <TabsTrigger value="org-chart" className="rounded-lg px-5 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-violet-700">
                <LocateFixed className="h-4 w-4" /> Org Chart
              </TabsTrigger>

              <TabsTrigger value="email-config" className="rounded-lg px-5 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-violet-700">
                <Mail className="h-4 w-4" /> Email Config
              </TabsTrigger>
            </TabsList>

            {/* 1. USERS LIST */}
            <TabsContent value="users">
              <UserManagementDashboard />
            </TabsContent>

            {/* 2. TEAMS & STRUCTURE */}
            <TabsContent value="teams">
              <TeamManagement />
            </TabsContent>
            <TabsContent value="structure">
              <OrganizationStructureManagement />
            </TabsContent>

            {/* 3. ACCESS CONTROL (The Three-Tier Logic) */}
            <TabsContent value="access">
              <Card className="border shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b">
                  <CardTitle className="text-lg">Permission Settings</CardTitle>
                  <CardDescription>Configure menu visibility by Role, Department, or specific User overrides.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Tabs defaultValue="role-wise">
                    <TabsList className="mb-8 bg-transparent p-0 border-b rounded-none w-full justify-start gap-8">
                      <TabsTrigger value="role-wise" className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-violet-600 data-[state=active]:bg-transparent shadow-none">
                        Role-wise Access
                      </TabsTrigger>
                      <TabsTrigger value="dept-wise" className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-violet-600 data-[state=active]:bg-transparent shadow-none">
                        Department-wise Access
                      </TabsTrigger>
                      <TabsTrigger value="individual" className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-violet-600 data-[state=active]:bg-transparent shadow-none">
                        Individual Overrides
                      </TabsTrigger>
                    </TabsList>

                   {/* ROLE-WISE */}
<TabsContent value="role-wise" className="space-y-6">
  <div className="max-w-xs">
    <RoleSelector onSelect={(val) => setSelectedRoleId(val)} />
  </div>
  {selectedRoleId && (
    <PermissionMatrix 
      type="role" 
      targetId={selectedRoleId} 
      organizationId={organizationId} 
      enabledSuites={enabledSuites} 
    />
  )}
</TabsContent>

                    {/* DEPT-WISE */}
                    <TabsContent value="dept-wise" className="space-y-6">
  <Flex gap={4} wrap="wrap">
    <div className="max-w-xs flex-1">
      <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">1. Select Role (To view inheritance)</label>
      <RoleSelector organizationId={organizationId} onSelect={setRoleIdForDeptTab} />
    </div>
    <div className="max-w-xs flex-1">
      <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">2. Select Department</label>
      <DepartmentSelector organizationId={organizationId} onSelect={setSelectedDeptId} />
    </div>
  </Flex>

  {selectedDeptId ? (
    <PermissionMatrix 
      type="department" 
      targetId={selectedDeptId} 
      parentRoleId={roleIdForDeptTab} // NEW PROP
      organizationId={organizationId} 
      enabledSuites={enabledSuites} 
    />
  ) : (
    <div className="text-center py-10 border-2 border-dashed rounded-lg text-gray-400">
      Please select a Department to configure its access rules.
    </div>
  )}
</TabsContent>

                   {/* INDIVIDUAL */}
<TabsContent value="individual" className="space-y-6">
  <div className="max-w-xs">
    {/* Ensure this selector returns the 'id' (UUID) of the employee from hr_employees */}
    <EmployeeSelector organizationId={organizationId} onSelect={setSelectedEmployeeId} />
  </div>
  {selectedEmployeeId && (
    <PermissionMatrix 
      type="user" 
      targetId={selectedEmployeeId} 
      organizationId={organizationId} 
      enabledSuites={enabledSuites} 
    />
  )}
</TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4. OTHER TABS */}
            <TabsContent value="org-chart">
              <OrganizationalChart />
            </TabsContent>
            <TabsContent value="email-config">
              <EmailConfigurationManagement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

/** --- HELPER SELECTORS --- **/

const RoleSelector = ({ organizationId, onSelect }: any) => {
  const [roles, setRoles] = React.useState<any[]>([]);
  React.useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('hr_roles').select('*'); // Roles are global but mappings are org-specific
      // Filter out global_superadmin
      const filteredRoles = (data || []).filter((role: any) => role.name !== "global_superadmin");
      setRoles(filteredRoles);
    };
    fetch();
  }, []);
  return (
    <Select onValueChange={onSelect}>
      <SelectTrigger><SelectValue placeholder="Choose Role" /></SelectTrigger>
      <SelectContent>
        {roles.map((r: any) => {
          // Map display names
          let displayName = r.name;
          if (r.name === "organization_superadmin") {
            displayName = "Superadmin";
          } else if (r.name === "admin") {
            displayName = "Admin";
          } else if (r.name === "employee") {
            displayName = "User";
          }
          return <SelectItem key={r.id} value={r.id}>{displayName}</SelectItem>;
        })}
      </SelectContent>
    </Select>
  );
};

const DepartmentSelector = ({ organizationId, onSelect }: any) => {
  const [depts, setDepts] = React.useState<any[]>([]);
  React.useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('hr_departments').select('*').eq('organization_id', organizationId);
      setDepts(data || []);
    };
    fetch();
  }, [organizationId]);
  return (
    <Select onValueChange={onSelect}>
      <SelectTrigger><SelectValue placeholder="Choose Department" /></SelectTrigger>
      <SelectContent>{depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
    </Select>
  );
};

const EmployeeSelector = ({ organizationId, onSelect }: any) => {
  const [employees, setEmployees] = React.useState<any[]>([]);
  React.useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('hr_employees').select('id, first_name, last_name').eq('organization_id', organizationId);
      setEmployees(data || []);
    };
    fetch();
  }, [organizationId]);
  return (
    <Select onValueChange={onSelect}>
      <SelectTrigger><SelectValue placeholder="Search Employee" /></SelectTrigger>
      <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
    </Select>
  );
};

export default EnhancedUserManagement;