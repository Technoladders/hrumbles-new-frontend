// EnhancedUserManagement.tsx

import React from 'react';
// MODIFICATION: Import useSelector
import { useSelector } from "react-redux";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCog, Shield, Building, LocateFixed, Mail, Blocks } from "lucide-react";
import UserManagementDashboard from './UserManagementDashboard';
import TeamManagement from './TeamManagement';
import RolePermissionsManagement from './RolePermissionsManagement';
import OrganizationalChart from './OrganizationalChart';
import EmailConfigurationManagement from './EmailConfigurationManagement';
import OrganizationStructureManagement from './OrganizationStructureManagement';

const EnhancedUserManagement = () => {
  // MODIFICATION: Define the specific organization ID
  const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

  // MODIFICATION: Get the current user's organization ID from Redux
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // MODIFICATION: Create a boolean flag for easier conditional rendering
  const isAscendionUser = organizationId === ASCENDION_ORGANIZATION_ID;

  // MODIFICATION: Dynamically set the grid columns class based on the flag
  const gridColsClass = isAscendionUser ? "grid-cols-3" : "grid-cols-6";

  return (
    <div className="max-w-8xl mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            User Management System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="w-full">
            {/* MODIFICATION: Use the dynamic grid class */}
            <TabsList className={`grid w-full ${gridColsClass}`}>
              {/* --- Tabs visible for ALL users --- */}
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              
              {/* --- MODIFICATION: Conditionally render tabs for non-Ascendion users --- */}
              {!isAscendionUser && (
                <>
                  <TabsTrigger value="teams" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Teams
                  </TabsTrigger>
                  <TabsTrigger value="structure" className="flex items-center gap-2">
                    <Blocks className="h-4 w-4" />
                    Structure
                  </TabsTrigger>
                  <TabsTrigger value="roles" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Roles & Permissions
                  </TabsTrigger>
                </>
              )}

              {/* --- Tabs visible for ALL users --- */}
              <TabsTrigger value="org-chart" className="flex items-center gap-2">
                <LocateFixed className="h-4 w-4" />
                Org Chart
              </TabsTrigger>
              <TabsTrigger value="email-config" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Config
              </TabsTrigger>
            </TabsList>

            {/* --- Render Tab Content --- */}
            <TabsContent value="users" className="mt-6">
              <UserManagementDashboard />
            </TabsContent>

            {/* --- MODIFICATION: Conditionally render content for non-Ascendion users --- */}
            {!isAscendionUser && (
              <>
                <TabsContent value="teams" className="mt-6">
                  <TeamManagement />
                </TabsContent>
                <TabsContent value="structure" className="mt-6">
                  <OrganizationStructureManagement />
                </TabsContent>
                <TabsContent value="roles" className="mt-6">
                  <RolePermissionsManagement />
                </TabsContent>
              </>
            )}

            <TabsContent value="org-chart" className="mt-6">
              <OrganizationalChart />
            </TabsContent>
            <TabsContent value="email-config" className="mt-6">
              <EmailConfigurationManagement />
            </TabsContent>
            
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedUserManagement;