
import { useState, useEffect } from "react";
import { RegularizationRequest } from "@/types/time-tracker-types";
import { fetchRegularizationRequests, approveRegularizationRequest, rejectRegularizationRequest } from "@/api/regularization";
import { toast } from "sonner";

export const useRegularizationApproval = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [requests, setRequests] = useState<RegularizationRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RegularizationRequest | null>(null);
  const [approverNotes, setApproverNotes] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (requests.length > 0) {
      filterRequests();
    }
  }, [searchTerm, requests, activeTab]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchRegularizationRequests();
      setRequests(data);
    } catch (error) {
      console.error("Error loading regularization requests:", error);
      toast.error("Failed to load regularization requests");
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];
    
    if (activeTab === "pending") {
      filtered = filtered.filter(req => req.status === "pending");
    } else if (activeTab === "approved") {
      filtered = filtered.filter(req => req.status === "approved");
    } else if (activeTab === "rejected") {
      filtered = filtered.filter(req => req.status === "rejected");
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(req => {
        const employeeName = req.employees?.name?.toLowerCase() || '';
        return employeeName.includes(term);
      });
    }
    
    setFilteredRequests(filtered);
  };

  const handleViewDetails = (request: RegularizationRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const openActionDialog = (request: RegularizationRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setApproverNotes("");
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) {
      toast.error("Missing required information");
      return;
    }

    try {
      let success = false;
      
      if (actionType === 'approve') {
        success = await approveRegularizationRequest(
          selectedRequest.id,
          approverNotes
        );
      } else {
        if (!approverNotes) {
          toast.error("You must provide a reason for rejection");
          return;
        }
        success = await rejectRegularizationRequest(
          selectedRequest.id,
          approverNotes
        );
      }
      
      if (success) {
        setActionDialogOpen(false);
        loadRequests();
      }
    } catch (error) {
      console.error("Error processing regularization request:", error);
      toast.error(`Failed to ${actionType} regularization request`);
    }
  };

  const getPendingCount = () => {
    return requests.filter(req => req.status === "pending").length;
  };

  return {
    searchTerm,
    setSearchTerm,
    filteredRequests,
    loading,
    activeTab,
    setActiveTab,
    detailsOpen,
    setDetailsOpen,
    actionDialogOpen,
    setActionDialogOpen,
    actionType,
    selectedRequest,
    approverNotes,
    setApproverNotes,
    handleViewDetails,
    openActionDialog,
    handleAction,
    getPendingCount,
    loadRequests
  };
};
