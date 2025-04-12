
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/jobs/ui/table";
import { Button } from "@/components/jobs/ui/button";

// Simple placeholder component to resolve the import error
const JobTable = () => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Job Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Sample Job</TableCell>
          <TableCell>Active</TableCell>
          <TableCell>
            <Button asChild size="sm">
              <Link to="/jobs/sample">View</Link>
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

export default JobTable;
