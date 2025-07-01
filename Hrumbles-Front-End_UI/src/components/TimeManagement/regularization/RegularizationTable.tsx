
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/timeFormatters";
import { RegularizationRequest } from "@/types/time-tracker-types";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface RegularizationTableProps {
  requests: RegularizationRequest[];
  onViewDetails: (request: RegularizationRequest) => void;
  showActions?: boolean;
  loading?: boolean;
  onApprove?: (request: RegularizationRequest) => void;
  onReject?: (request: RegularizationRequest) => void;
}

export const RegularizationTable = ({
  requests,
  onViewDetails,
  showActions = true,
  loading = false,
  onApprove,
  onReject
}: RegularizationTableProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };
  console.log("RegularizationTable requests:", requests);


  // Format time in 12-hour format preserving original input time
  const formatTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return '';
    try {
      console.log("Formatting time from:", dateTimeStr);
      
      // Extract only the time portion from the ISO string to prevent timezone conversion
      // The format is expected to be: yyyy-MM-ddTHH:mm or yyyy-MM-ddTHH:mm:ss or with timezone
      const timeParts = dateTimeStr.split('T');
      if (timeParts.length < 2) {
        console.log("Invalid dateTimeStr format, using fallback parsing");
        return format(parseISO(dateTimeStr), "hh:mm a");
      }
      
      // Extract time part and remove any timezone information
      let timePart = timeParts[1];
      timePart = timePart.split('+')[0].split('-')[0].split('Z')[0];
      
      // Extract hours and minutes
      const timeComponents = timePart.split(':');
      const hours = parseInt(timeComponents[0], 10);
      const minutes = parseInt(timeComponents[1], 10);
      
      // Create a new date object with just the time info
      const timeDate = new Date();
      timeDate.setHours(hours, minutes, 0, 0);
      
      console.log("Processed time:", timeDate, "will format as:", format(timeDate, "hh:mm a"));
      
      // Format in 12-hour format
      return format(timeDate, "hh:mm a");
    } catch (error) {
      console.error("Error formatting time:", error, dateTimeStr);
      return dateTimeStr || '';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array(3).fill(0).map((_, i) => (
          <Skeleton key={i} className="w-full h-12" />
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Employee</TableHead>
          <TableHead>Requested Time</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 5 : 4} className="text-center py-6 text-muted-foreground">
              No regularization requests found
            </TableCell>
          </TableRow>
        ) : (
          requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{formatDate(request.date)}</TableCell>
              <TableCell>
  {request?.employee?.first_name && request?.employee?.last_name
    ? `${request.employee.first_name} ${request.employee.last_name}`
    : 'Unknown'}
</TableCell>

              <TableCell>
                {formatTime(request.requested_clock_in)} - {formatTime(request.requested_clock_out)}
              </TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(request)}
                    >
                      View Details
                    </Button>
                    
                    {onApprove && onReject && request.status === 'pending' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                          onClick={() => onApprove(request)}
                        >
                          <CheckCircle className="h-4 w-4" /> Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => onReject(request)}
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
