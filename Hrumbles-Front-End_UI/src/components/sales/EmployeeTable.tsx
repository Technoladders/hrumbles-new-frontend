
// import React from "react";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Badge } from "@/components/ui/badge";
// import { CandidateDetail } from "@/types/company";

// interface EmployeeTableProps {
//   employees: CandidateDetail[];
// }

// const EmployeeTable: React.FC<EmployeeTableProps> = ({ employees }) => {
//   return (
//     <div className="w-full overflow-x-auto">
//       <table className="w-full border-collapse">
//         <thead>
//           <tr className="border-b">
//             <th className="p-3 text-left w-10">
//               <Checkbox />
//             </th>
//             <th className="p-3 text-left">Name</th>
//             <th className="p-3 text-left">Job title</th>
//             <th className="p-3 text-left">Department</th>
//             <th className="p-3 text-left">Site</th>
//             <th className="p-3 text-left">Salary</th>
//             <th className="p-3 text-left">Start date</th>
//             <th className="p-3 text-left">Lifecycle</th>
//             <th className="p-3 text-left">Status</th>
//           </tr>
//         </thead>
//         <tbody>
//           {employees.map((employee) => (
//             <tr 
//               key={employee.id} 
//               className={`border-b hover:bg-gray-50 ${
//                 employee.id === "2" ? "table-row-highlighted" : ""
//               }`}
//             >
//               <td className="p-3">
//                 <Checkbox checked={employee.id === "2"} />
//               </td>
//               <td className="p-3">
//                 <div className="flex items-center gap-3">
//                   <div className="avatar-wrapper">
//                     {employee.avatar_url ? (
//                       <img src={employee.avatar_url} alt={employee.name} className="h-full w-full object-cover" />
//                     ) : (
//                       employee.name.charAt(0)
//                     )}
//                   </div>
//                   <span className="font-medium">{employee.name}</span>
//                 </div>
//               </td>
//               <td className="p-3">{employee.job_title || employee.designation || "N/A"}</td>
//               <td className="p-3">{employee.department || "N/A"}</td>
//               <td className="p-3">
//                 {employee.site && (
//                   <div className="flex items-center gap-2">
//                     <span className="inline-block w-5 h-5 rounded-sm overflow-hidden">
//                       {getSiteFlag(employee.site)}
//                     </span>
//                     <span>{employee.site}</span>
//                   </div>
//                 )}
//               </td>
//               <td className="p-3">{employee.salary || "N/A"}</td>
//               <td className="p-3">{employee.start_date || "N/A"}</td>
//               <td className="p-3">{employee.lifecycle || "N/A"}</td>
//               <td className="p-3">
//                 {employee.status && (
//                   <span className={`status-badge ${getStatusClass(employee.status)}`}>
//                     {employee.status}
//                   </span>
//                 )}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// // Helper function to get site flag
// const getSiteFlag = (site: string): JSX.Element => {
//   const countryFlags: Record<string, string> = {
//     'Stockholm': '🇸🇪',
//     'Miami': '🇺🇸',
//     'Kyiv': '🇺🇦',
//     'Ottawa': '🇨🇦',
//     'Sao Paulo': '🇧🇷',
//     'London': '🇬🇧',
//   };
  
//   return <span>{countryFlags[site] || '🌍'}</span>;
// };

// // Helper function to get status class
// const getStatusClass = (status: string): string => {
//   switch (status.toLowerCase()) {
//     case 'invited':
//       return 'status-invited';
//     case 'absent':
//       return 'status-absent';
//     case 'employed':
//       return 'status-employed';
//     case 'hired':
//       return 'status-hired';
//     default:
//       return '';
//   }
// };

// export default EmployeeTable;



// import React from 'react';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"; // Assuming shadcn/ui table components
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Linkedin, Mail, Phone, Edit } from 'lucide-react';
// import { CandidateDetail } from '@/types/company'; // Import the type

// interface EmployeeTableProps {
//   employees: CandidateDetail[]; // Expecting the array of employees fetched from the hook
//   onEdit: (employee: CandidateDetail) => void; // Keep onEdit callback
// }

// // Define the number of columns for the colspan in case of empty data
// const NUM_COLUMNS = 6; // Avatar, Name, Designation, Email, Phone, LinkedIn

// const EmployeeTable: React.FC<EmployeeTableProps> = ({ employees }) => {
//   // Helper function to generate initials
//   const getInitials = (name?: string): string => {
//     if (!name) return '?';
//     return name.split(' ').map(n => n[0]).join('').toUpperCase();
//   };

//   // Helper to format LinkedIn URL
//   const formatLinkedInUrl = (url?: string): string | null => {
//     if (!url || url === 'N/A') return null;
//     return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
//   };

//   return (
//     <div className="overflow-x-auto rounded-md border">
//       <Table>
//         <TableHeader>
//           <TableRow>
//             {/* REMOVED: Checkbox column */}
//             <TableHead className="w-[50px] px-3 py-3"></TableHead> {/* Avatar */}
//             <TableHead className="px-3 py-3 text-left">Name</TableHead>
//             <TableHead className="px-3 py-3 text-left">Designation</TableHead>
//             <TableHead className="px-3 py-3 text-left">Email</TableHead>
//             <TableHead className="px-3 py-3 text-left">Phone</TableHead>
//             <TableHead className="px-3 py-3 text-left">LinkedIn</TableHead>
//             {/* REMOVED: Department, Site, Salary, Start date, Lifecycle, Status */}
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {employees && employees.length > 0 ? (
//             employees.map((employee) => {
//               const linkedInUrl = formatLinkedInUrl(employee.linkedin); // Use the helper

//               return (
//                 <TableRow key={employee.id} className="border-b hover:bg-muted/50">
//                   {/* REMOVED: Checkbox cell */}
//                   <TableCell className="p-3">
//                     <Avatar className="h-8 w-8 border">
//                       {/* Assuming avatar_url might be added to CandidateDetail type later */}
//                       <AvatarImage src={employee.avatar_url} alt={employee.name} />
//                       <AvatarFallback className="text-xs">
//                         {getInitials(employee.name)}
//                       </AvatarFallback>
//                     </Avatar>
//                   </TableCell>
//                   <TableCell className="p-3 font-medium">
//                     {/* Display the actual name fetched from hr_candidates */}
//                     {employee.name || `ID: ${employee.id?.substring(0, 5)}...`}
//                   </TableCell>
//                   <TableCell className="p-3">
//                     {/* Display the designation fetched from candidate_companies */}
//                     {employee.designation || 'N/A'}
//                   </TableCell>
//                   <TableCell className="p-3">
//                     {/* Display email as a link if available */}
//                     {employee.email && employee.email !== 'N/A' ? (
//                       <a href={`mailto:${employee.email}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary" title={employee.email}>
//                         <Mail className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
//                         <span className="truncate hidden md:inline">{employee.email}</span>
//                         <span className="md:hidden">Email</span>
//                       </a>
//                     ) : (
//                       <span className="text-sm text-muted-foreground">N/A</span>
//                     )}
//                   </TableCell>
//                   <TableCell className="p-3">
//                     {/* Display phone if available */}
//                     {employee.phone_number && employee.phone_number !== 'N/A' ? (
//                       <span className="inline-flex items-center text-sm text-muted-foreground" title={employee.phone_number}>
//                         <Phone className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
//                         <span className="truncate hidden md:inline">{employee.phone_number}</span>
//                          <span className="md:hidden">Phone</span>
//                       </span>
//                     ) : (
//                       <span className="text-sm text-muted-foreground">N/A</span>
//                     )}
//                   </TableCell>
//                   <TableCell className="p-3">
//                     {/* Display LinkedIn icon as a link if available */}
//                     {linkedInUrl ? (
//                       <a
//                         href={linkedInUrl}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="inline-flex items-center text-muted-foreground hover:text-primary"
//                         title="View LinkedIn Profile"
//                       >
//                         <Linkedin className="h-4 w-4" />
//                         <span className="sr-only">LinkedIn Profile</span>
//                       </a>
//                     ) : (
//                       <span className="text-sm text-muted-foreground">N/A</span>
//                     )}
//                   </TableCell>
//                   {/* REMOVED: Cells for Department, Site, Salary, Start date, Lifecycle, Status */}
//                 </TableRow>
//               );
//             })
//           ) : (
//             <TableRow>
//               {/* Updated colSpan */}
//               <TableCell colSpan={NUM_COLUMNS} className="h-24 text-center">
//                 No associated employees found.
//               </TableCell>
//             </TableRow>
//           )}
//         </TableBody>
//       </Table>
//     </div>
//   );
// };

// // REMOVED HELPER FUNCTIONS: getSiteFlag, getStatusClass
// src/components/EmployeeTable.tsx


// import React from 'react';
// import {
//   Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
// } from "@/components/ui/table";
// import { Button } from '@/components/ui/button';
// import { Edit, Mail, Phone, Copy, Check } from 'lucide-react'; // Add Copy, Check icons
// import { CandidateDetail } from '@/types/company';
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from "@/components/ui/tooltip"; // For hover details
// import { useToast } from "@/hooks/use-toast"; // For copy feedback

// interface EmployeeTableProps {
//   employees: CandidateDetail[];
//   onEdit: (employee: CandidateDetail) => void;
// }

// // Updated column count
// const NUM_COLUMNS = 7; // Name, Designation, Contact, Contact Owner, Contact Stage, Action (Job ID removed from display)

// const EmployeeTable: React.FC<EmployeeTableProps> = ({ employees, onEdit }) => {
//   const { toast } = useToast();
//   const [copiedValue, setCopiedValue] = React.useState<string | null>(null);

//   const getDisplayValue = (value: string | null | undefined): string => value?.trim() ? value : 'N/A';

//   const handleCopy = (text: string | null | undefined, type: string) => {
//     if (!text || text === 'N/A') return;
//     navigator.clipboard.writeText(text).then(() => {
//       setCopiedValue(type); // Indicate which type was copied
//       toast({ title: `${type} Copied!`, description: text });
//       setTimeout(() => setCopiedValue(null), 1500); // Reset icon after delay
//     }).catch(err => {
//       console.error(`Failed to copy ${type}: `, err);
//       toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
//     });
//   };

//   return (
//     <TooltipProvider delayDuration={100}> {/* Wrap table for tooltips */}
//       <div className="overflow-x-auto rounded-md border">
//         <Table>
//           <TableHeader>
//             <TableRow className="bg-muted/50 hover:bg-muted/50">
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</TableHead>
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Designation</TableHead>
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</TableHead>
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Owner</TableHead>
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Stage</TableHead>
//               {/* <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Job ID</TableHead> */} {/* Optional: Add back if needed */}
//               <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {employees && employees.length > 0 ? (
//               employees.map((employee) => (
//                 // Use a key that identifies the specific association if possible
//                 <TableRow key={employee.association_id || `${employee.id}-${employee.job_id}`} className="border-b hover:bg-gray-50">
//                   <TableCell className="p-3 font-medium text-sm">{getDisplayValue(employee.name)}</TableCell>
//                   <TableCell className="p-3 text-sm text-muted-foreground">{getDisplayValue(employee.designation)}</TableCell>
//                   {/* --- Contact Column --- */}
//                   <TableCell className="p-3 text-sm text-muted-foreground">
//                     <div className="flex items-center gap-2">
//                       {/* Email Icon & Tooltip */}
//                       <Tooltip>
//                         <TooltipTrigger asChild>
//                            <Button
//                                 variant="ghost" size="icon"
//                                 className={`h-6 w-6 p-0 ${!employee.email || employee.email === 'N/A' ? 'opacity-30 cursor-not-allowed' : 'hover:text-primary'}`}
//                                 onClick={() => handleCopy(employee.email, 'Email')}
//                                 disabled={!employee.email || employee.email === 'N/A'}
//                                 title={employee.email && employee.email !== 'N/A' ? `Click to copy ${employee.email}` : 'Email not available'}
//                             >
//                                 {copiedValue === 'Email' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Mail className="h-3.5 w-3.5" />}
//                                 <span className="sr-only">Email details</span>
//                            </Button>
//                         </TooltipTrigger>
//                         {employee.email && employee.email !== 'N/A' && (
//                             <TooltipContent>
//                                 <p>{employee.email}</p>
//                             </TooltipContent>
//                         )}
//                       </Tooltip>
//                       {/* Phone Icon & Tooltip */}
//                       <Tooltip>
//                          <TooltipTrigger asChild>
//                             <Button
//                                 variant="ghost" size="icon"
//                                 className={`h-6 w-6 p-0 ${!employee.phone_number || employee.phone_number === 'N/A' ? 'opacity-30 cursor-not-allowed' : 'hover:text-primary'}`}
//                                 onClick={() => handleCopy(employee.phone_number, 'Phone')}
//                                 disabled={!employee.phone_number || employee.phone_number === 'N/A'}
//                                 title={employee.phone_number && employee.phone_number !== 'N/A' ? `Click to copy ${employee.phone_number}` : 'Phone not available'}
//                             >
//                                 {copiedValue === 'Phone' ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Phone className="h-3.5 w-3.5" />}
//                                 <span className="sr-only">Phone details</span>
//                             </Button>
//                          </TooltipTrigger>
//                           {employee.phone_number && employee.phone_number !== 'N/A' && (
//                             <TooltipContent>
//                                 <p>{employee.phone_number}</p>
//                             </TooltipContent>
//                           )}
//                       </Tooltip>
//                     </div>
//                   </TableCell>
//                   {/* --- End Contact Column --- */}
//                   <TableCell className="p-3 text-sm text-muted-foreground">{getDisplayValue(employee.contact_owner)}</TableCell>
//                   <TableCell className="p-3 text-sm text-muted-foreground">{getDisplayValue(employee.contact_stage)}</TableCell>
//                   {/* <TableCell className="p-3 text-sm text-muted-foreground">{getDisplayValue(employee.job_id)}</TableCell> */} {/* Optional */}
//                   {/* Action Cell */}
//                   <TableCell className="p-3">
//                       <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => onEdit(employee)} title="Edit Contact Association">
//                           <Edit className="h-3.5 w-3.5" /> <span className="sr-only">Edit</span>
//                       </Button>
//                   </TableCell>
//                 </TableRow>
//               ))
//             ) : (
//               <TableRow>
//                 <TableCell colSpan={NUM_COLUMNS} className="h-24 text-center text-muted-foreground">
//                   No associated employees found.
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </div>
//     </TooltipProvider>
//   );
// };

// export default EmployeeTable;


// src/components/EmployeeTable.tsx


import React, { useState } from 'react'; // Import useState
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Edit, Mail, Phone, Copy, Check, ChevronDown } from 'lucide-react'; // Added Copy, Check, ChevronDown
import { CandidateDetail } from '@/types/company';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel, // Keep if using labels
  DropdownMenuSeparator, // Keep if using separators
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Added Dropdown components
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Added for stage update
import { supabase } from '@/integrations/supabase/client'; // Added for stage update

interface EmployeeTableProps {
  employees: CandidateDetail[];
  onEdit: (employee: CandidateDetail) => void; // Callback to open the edit modal
  // Removed onDelete prop
}

// Define possible contact stages (align with your application's stages)
const CONTACT_STAGES = ['Cold', 'Approaching', 'Replied', 'Interested', 'Not Interested', 'Un Responsive', 'Do Not Contact', 'Bad Data', 'Changed Job', 'Prospect'];

// Define colors for contact stages (Tailwind classes) - Customize as needed
const contactStageColors: Record<string, string> = {
  'Cold': 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  'Approaching': 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
  'Replied': 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200',
  'Interested': 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  'Not Interested': 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  'Un Responsive': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
  'Do Not Contact': 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  'Bad Data': 'bg-red-200 text-red-800 border-red-300 hover:bg-red-300',
  'Changed Job': 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
  'Prospect': 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200',
  'default': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200', // Fallback
};

// Updated column count
const NUM_COLUMNS = 7; // Name, Designation, Contact, Contact Owner, Contact Stage, Action

const EmployeeTable: React.FC<EmployeeTableProps> = ({ employees, onEdit }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // State to track which specific item (email or phone) and for which row ID is copied
  // Use candidate ID (employee.id) as it's the stable identifier for the person
  const [copiedInfo, setCopiedInfo] = useState<{ type: 'Email' | 'Phone' | 'Contact'; id: string } | null>(null);

  // Helper for consistent display of N/A
  const getDisplayValue = (value: string | null | undefined): string => {
    return value?.trim() && value.trim().toUpperCase() !== 'N/A' ? value : 'N/A';
  };

    // --- UPDATED Contact Stage Update Mutation ---
    const updateContactStageMutation = useMutation({
      mutationFn: async ({ employee, newStage }: { employee: CandidateDetail; newStage: string }) => {
        let updateError = null;
        const updateData = { contact_stage: newStage };
  
        console.log(`Attempting stage update for candidate ${employee.id} from source: ${employee.source_table}`);
  
        // --- Conditional Update based on source ---
        if (employee.source_table === 'employee_associations' && employee.association_id) {
          // Update the newer employee_associations table using its primary key 'id'
          console.log(`Updating employee_associations ID ${employee.association_id} to stage ${newStage}`);
          ({ error: updateError } = await supabase
            .from('employee_associations')
            .update(updateData)
            .eq('id', employee.association_id)); // Use association_id (PK)
  
        } else if (employee.source_table === 'candidate_companies' && employee.job_id && employee.company_id) {
          // Update the legacy candidate_companies table using its composite key
          // Ensure the candidate_id type matches (it might be text here)
          console.log(`Updating candidate_companies for candidate ${employee.id}, job ${employee.job_id}, company ${employee.company_id} to stage ${newStage}`);
          ({ error: updateError } = await supabase
            .from('candidate_companies')
            .update(updateData)
            .eq('candidate_id', employee.id) // Use candidate ID (text or uuid?)
            .eq('job_id', employee.job_id)     // Use job ID
            .eq('company_id', employee.company_id)); // Use company ID
        } else {
          // Cannot update if source or necessary keys are missing
          console.error("Cannot update stage: Missing keys or invalid source for employee:", employee);
          throw new Error(`Cannot update stage: Missing keys or invalid source for candidate ${employee.id}`);
        }
        // --- End Conditional Update ---

      if (updateError) throw updateError; // Throw error for onError handling
      return { stage: newStage, companyId: employee.company_id }; // Return data needed for onSuccess
    },
    onSuccess: (data, variables) => {
      toast({ title: "Contact Stage Updated", description: `Stage set to ${variables.newStage}.` });
      // Invalidate the query for this specific company's employees to refresh the list
      if (data?.companyId) {
        queryClient.invalidateQueries({ queryKey: ['company-employees', data.companyId] });
      } else {
        // Fallback invalidation if companyId wasn't returned (shouldn't happen)
        queryClient.invalidateQueries({ queryKey: ['company-employees'] });
      }
    },
    onError: (updateError: any) => {
      toast({ title: "Stage Update Failed", description: updateError.message, variant: "destructive" });
    },
  });

  // Handler to call the mutation
  const handleContactStageChange = (employee: CandidateDetail, newStage: string) => {
    updateContactStageMutation.mutate({ employee, newStage });
  };
  // --- End Stage Update ---


  // --- Updated Copy Handler ---
  const handleCopy = (textToCopy: string | null | undefined, type: 'Email' | 'Phone' | 'Contact', candidateId: string) => {
    const valueToCopy = getDisplayValue(textToCopy); // Get the actual text or 'N/A'
    if (!textToCopy || valueToCopy === 'N/A') return; // Don't copy 'N/A' or null/undefined

    navigator.clipboard.writeText(valueToCopy).then(() => {
      setCopiedInfo({ type, id: candidateId }); // Track type and specific candidate ID
      toast({ title: `${type} Copied!`, description: valueToCopy });
      setTimeout(() => setCopiedInfo(null), 1500); // Reset after 1.5 seconds
    }).catch(err => {
      console.error(`Failed to copy ${type}: `, err);
      toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
    });
  };
  // --- End Copy Handler ---

  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Designation</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Owner</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Stage</TableHead>
              <TableHead className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees && employees.length > 0 ? (
              employees.map((employee) => (
                // Use a robust unique key - association ID if available, otherwise composite
                <TableRow key={employee.association_id || `${employee.id}-${employee.job_id}`} className="border-b hover:bg-gray-50">
                  {/* Name & Designation Cells */}
                  <TableCell className="p-3 font-medium text-sm">{getDisplayValue(employee.name)}</TableCell>
                  <TableCell className="p-3 text-sm text-muted-foreground">{getDisplayValue(employee.designation)}</TableCell>

                  {/* --- UPDATED Contact Column --- */}
                  <TableCell className="p-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"> {/* Reduced gap */}
                      {/* Email Icon & Tooltip/Copy */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                                variant="ghost" size="icon"
                                className={`h-6 w-6 p-0 ${getDisplayValue(employee.email) === 'N/A' ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:text-primary'}`}
                                onClick={(e) => { e.stopPropagation(); handleCopy(employee.email, 'Email', employee.id); }}
                                disabled={getDisplayValue(employee.email) === 'N/A'}
                                title={getDisplayValue(employee.email) !== 'N/A' ? `Copy Email: ${employee.email}` : 'Email not available'}
                            >
                                {copiedInfo?.type === 'Email' && copiedInfo?.id === employee.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Mail className="h-3.5 w-3.5" />}
                                <span className="sr-only">Email details</span>
                           </Button>
                        </TooltipTrigger>
                        {getDisplayValue(employee.email) !== 'N/A' && (
                            <TooltipContent className="text-xs" side="top">
                                <p>Email: {employee.email}</p>
                                <p className="text-muted-foreground">(Click icon to copy)</p>
                            </TooltipContent>
                        )}
                      </Tooltip>
                      {/* Phone Icon & Tooltip/Copy */}
                      <Tooltip>
                         <TooltipTrigger asChild>
                            <Button
                                variant="ghost" size="icon"
                                className={`h-6 w-6 p-0 ${getDisplayValue(employee.phone_number) === 'N/A' ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:text-primary'}`}
                                onClick={(e) => { e.stopPropagation(); handleCopy(employee.phone_number, 'Phone', employee.id); }}
                                disabled={getDisplayValue(employee.phone_number) === 'N/A'}
                                title={getDisplayValue(employee.phone_number) !== 'N/A' ? `Copy Phone: ${employee.phone_number}` : 'Phone not available'}
                            >
                                {copiedInfo?.type === 'Phone' && copiedInfo?.id === employee.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Phone className="h-3.5 w-3.5" />}
                                <span className="sr-only">Phone details</span>
                            </Button>
                         </TooltipTrigger>
                          {getDisplayValue(employee.phone_number) !== 'N/A' && (
                            <TooltipContent className="text-xs" side="top">
                                <p>Phone: {employee.phone_number}</p>
                                <p className="text-muted-foreground">(Click icon to copy)</p>
                            </TooltipContent>
                          )}
                      </Tooltip>
                       {/* General Copy Icon */}
                       <Tooltip>
                         <TooltipTrigger asChild>
                              <Button
                                  variant="ghost" size="icon"
                                  className={`h-6 w-6 p-0 ${getDisplayValue(employee.email) === 'N/A' && getDisplayValue(employee.phone_number) === 'N/A' ? 'opacity-30 cursor-not-allowed' : 'hover:text-primary'}`}
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      const contactInfo = `Email: ${getDisplayValue(employee.email)}\nPhone: ${getDisplayValue(employee.phone_number)}`;
                                      handleCopy(contactInfo, 'Contact', employee.id);
                                  }}
                                  disabled={getDisplayValue(employee.email) === 'N/A' && getDisplayValue(employee.phone_number) === 'N/A'}
                                  title="Copy Email & Phone"
                              >
                                  {copiedInfo?.type === 'Contact' && copiedInfo?.id === employee.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                  <span className="sr-only">Copy contact info</span>
                              </Button>
                         </TooltipTrigger>
                           <TooltipContent className="text-xs" side="top">
                                <p>Copy Email & Phone</p>
                           </TooltipContent>
                       </Tooltip>
                    </div>
                  </TableCell>
                  {/* --- End Contact Column --- */}

                  <TableCell className="p-3 text-sm text-muted-foreground">{getDisplayValue(employee.contact_owner)}</TableCell>

                  {/* --- Contact Stage Dropdown --- */}
                  <TableCell className="p-3 text-sm">
                     {/* Stage update is primarily for employee_associations */}
                     {/* If you need to update candidate_companies stage, add specific logic */}
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button
                           variant="outline"
                           size="sm"
                           className={`h-7 px-2 text-xs w-full max-w-[150px] justify-between truncate border ${contactStageColors[employee.contact_stage || 'default'] ?? contactStageColors['default']}`}
                           // Disable if update is pending for this specific association
                           disabled={updateContactStageMutation.isPending && updateContactStageMutation.variables?.associationId === employee.association_id}
                         >
                           <span className="truncate">{employee.contact_stage || 'N/A'}</span>
                           <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="start">
                         <DropdownMenuLabel>Set Contact Stage</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                         {CONTACT_STAGES.map(stage => (
                           <DropdownMenuItem
                             key={stage}
                             onSelect={() => handleContactStageChange(employee, stage)} // Pass the whole employee object
                             disabled={employee.contact_stage === stage || (updateContactStageMutation.isPending && updateContactStageMutation.variables?.associationId === employee.association_id)}
                             className="text-xs"
                           >
                             {stage}
                           </DropdownMenuItem>
                         ))}
                       </DropdownMenuContent>
                     </DropdownMenu>
                  </TableCell>
                  {/* --- End Contact Stage Dropdown --- */}

                  {/* Action Cell */}
                  <TableCell className="p-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => onEdit(employee)} title="Edit Contact Association">
                          <Edit className="h-3.5 w-3.5" /> <span className="sr-only">Edit</span>
                      </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={NUM_COLUMNS} className="h-24 text-center text-muted-foreground">
                  No associated employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};

export default EmployeeTable;