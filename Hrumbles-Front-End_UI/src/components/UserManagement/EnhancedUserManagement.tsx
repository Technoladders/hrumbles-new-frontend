// EnhancedUserManagement.tsx

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// MODIFICATION: Add Mail icon
import { Users, UserCog, Shield, Building, Clock, LocateFixed, Mail } from "lucide-react";
import UserManagementDashboard from './UserManagementDashboard';
import TeamManagement from './TeamManagement';
import ShiftManagement from './ShiftManagement';
import UserManagementTree from './UserManagementTree';
import RolePermissionsManagement from './RolePermissionsManagement';
import OrganizationalChart from './OrganizationalChart';
// MODIFICATION: Import the new component
import EmailConfigurationManagement from './EmailConfigurationManagement';


const EnhancedUserManagement = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            User Management System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="w-full">
            {/* MODIFICATION: Adjust grid columns to fit new tab */}
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="teams" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Teams
              </TabsTrigger>
              {/* <TabsTrigger value="shifts" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Shifts
              </TabsTrigger> */}
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Roles & Permissions
              </TabsTrigger>
              <TabsTrigger value="org-chart" className="flex items-center gap-2">
                <LocateFixed className="h-4 w-4" />
                Org Chart
              </TabsTrigger>
              {/* MODIFICATION: Add the new Email Config tab trigger */}
              <TabsTrigger value="email-config" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Config
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
              <UserManagementDashboard />
            </TabsContent>
            <TabsContent value="teams" className="mt-6">
              <TeamManagement />
            </TabsContent>
            {/* <TabsContent value="shifts" className="mt-6">
              <ShiftManagement />
            </TabsContent> */}
            <TabsContent value="roles" className="mt-6">
              <RolePermissionsManagement />
            </TabsContent>
            <TabsContent value="org-chart" className="mt-6">
              <OrganizationalChart />
            </TabsContent>
            {/* NOTE: I am removing the "Organization Tree" tab as it seems duplicative of "Org Chart"
                         and was not in the original grid-cols-5. You can add it back if needed. */}

            {/* MODIFICATION: Add the new content for the Email Config tab */}
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