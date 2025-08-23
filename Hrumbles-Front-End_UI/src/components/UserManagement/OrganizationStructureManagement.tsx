// UserManagement/OrganizationStructureManagement.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Building, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from 'react-redux';
import CreateDepartmentModal from './CreateDepartmentModal';
import CreateDesignationModal from './CreateDesignationModal';

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  name: string;
  department_name: string;
}

const OrganizationStructureManagement = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDeptModalOpen, setDeptModalOpen] = useState(false);
  const [isDesgModalOpen, setDesgModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Departments
      const { data: deptData, error: deptError } = await supabase
        .from('hr_departments')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');
      if (deptError) throw deptError;
      setDepartments(deptData || []);

      // Fetch Designations with Department names
      const { data: desgData, error: desgError } = await supabase
        .from('hr_designations')
        .select(`id, name, department:hr_departments(name)`)
        .eq('organization_id', organizationId)
        .order('name');
      if (desgError) throw desgError;
      const formattedDesignations = desgData?.map(d => ({
        id: d.id,
        name: d.name,
        department_name: d.department?.name || 'N/A'
      })) || [];
      setDesignations(formattedDesignations);

    } catch (error: any) {
      toast({ title: "Error fetching data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [organizationId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="text-center">Loading structure...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Departments Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" /> Departments</CardTitle>
          <Button size="sm" onClick={() => setDeptModalOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Department
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department Name</TableHead>
                {/* Add actions column if needed */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map(dept => (
                <TableRow key={dept.id}>
                  <TableCell>{dept.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Designations Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Designations</CardTitle>
          <Button size="sm" onClick={() => setDesgModalOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Designation
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Designation Name</TableHead>
                <TableHead>Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {designations.map(desg => (
                <TableRow key={desg.id}>
                  <TableCell>{desg.name}</TableCell>
                  <TableCell>{desg.department_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateDepartmentModal
        isOpen={isDeptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        onSuccess={fetchData}
      />
      <CreateDesignationModal
        isOpen={isDesgModalOpen}
        onClose={() => setDesgModalOpen(false)}
        onSuccess={fetchData}
        departments={departments}
      />
    </div>
  );
};

export default OrganizationStructureManagement;