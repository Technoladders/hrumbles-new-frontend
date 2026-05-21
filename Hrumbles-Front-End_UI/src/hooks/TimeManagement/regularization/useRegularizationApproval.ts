import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RegularizationRequest } from "@/types/time-tracker-types";
import {
  fetchRegularizationRequests,
  approveRegularizationRequest,
  rejectRegularizationRequest,
} from "@/api/regularization";
import { toast } from "sonner";

export const useRegularizationApproval = () => {
  const [searchTerm, setSearchTerm]           = useState("");
  const [activeTab, setActiveTab]             = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<RegularizationRequest | null>(null);
  const [sheetOpen, setSheetOpen]             = useState(false);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [actionType, setActionType]           = useState<'approve' | 'reject' | null>(null);
  const [approverNotes, setApproverNotes]     = useState("");
  const [selectedIds, setSelectedIds]         = useState<string[]>([]);
  const [isActioning, setIsActioning]         = useState(false);

  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const userId         = useSelector((state: any) => state.auth.user?.id);
  const queryClient    = useQueryClient();

  const QUERY_KEY = ['regularization-approval', organizationId];

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn:  () => fetchRegularizationRequests(organizationId),
    enabled:  !!organizationId,
    staleTime: 30 * 1000,
  });

  const counts = useMemo(() => ({
    pending:   requests.filter(r => r.status === 'pending').length,
    approved:  requests.filter(r => r.status === 'approved').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    let list = requests.filter(r => r.status === activeTab);
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      list = list.filter(r => {
        const name = `${r.employee?.first_name ?? ''} ${r.employee?.last_name ?? ''}`.toLowerCase();
        return name.includes(t);
      });
    }
    return list;
  }, [requests, activeTab, searchTerm]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  // ── Detail sheet ────────────────────────────────────────────────────────────
  const openDetail = (req: RegularizationRequest) => {
    setSelectedRequest(req);
    setSheetOpen(true);
  };

  // ── Inline action (row expand) ───────────────────────────────────────────────
  const openInlineAction = (req: RegularizationRequest, type: 'approve' | 'reject') => {
    if (expandedActionId === req.id && actionType === type) {
      closeInlineAction();
    } else {
      setExpandedActionId(req.id);
      setActionType(type);
      setApproverNotes("");
    }
  };

  const closeInlineAction = () => {
    setExpandedActionId(null);
    setActionType(null);
    setApproverNotes("");
  };

  const handleAction = async (requestId: string) => {
    if (!actionType) return;
    if (actionType === 'reject' && !approverNotes.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    setIsActioning(true);
    try {
      let ok = false;
      if (actionType === 'approve') {
        ok = await approveRegularizationRequest(requestId, userId, approverNotes);
      } else {
        ok = await rejectRegularizationRequest(requestId, userId, approverNotes);
      }
      if (ok) {
        closeInlineAction();
        setSelectedIds(p => p.filter(id => id !== requestId));
        invalidate();
      }
    } finally {
      setIsActioning(false);
    }
  };

  // ── Bulk approve ─────────────────────────────────────────────────────────────
  const handleBulkApprove = async (bulkNotes: string) => {
    if (!selectedIds.length) return;
    setIsActioning(true);
    try {
      const results = await Promise.all(
        selectedIds.map(id => approveRegularizationRequest(id, userId, bulkNotes))
      );
      const n = results.filter(Boolean).length;
      toast.success(`${n} request${n !== 1 ? 's' : ''} approved`);
      setSelectedIds([]);
      invalidate();
    } finally {
      setIsActioning(false);
    }
  };

  // ── Selection ────────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const toggleSelectAll = () => {
    const ids = filteredRequests.map(r => r.id);
    setSelectedIds(p => p.length === ids.length ? [] : ids);
  };

  const clearSelection = () => setSelectedIds([]);

  return {
    searchTerm, setSearchTerm,
    filteredRequests,
    isLoading,
    activeTab, setActiveTab,
    selectedRequest, setSelectedRequest,
    sheetOpen, setSheetOpen,
    expandedActionId,
    actionType,
    approverNotes, setApproverNotes,
    selectedIds,
    isActioning,
    counts,
    openDetail,
    openInlineAction,
    closeInlineAction,
    handleAction,
    handleBulkApprove,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    refetch,
  };
};