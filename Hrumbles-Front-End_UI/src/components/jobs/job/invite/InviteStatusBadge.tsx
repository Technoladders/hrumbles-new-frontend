// src/components/jobs/job/invite/InviteStatusBadge.tsx
// Standalone status badge for candidate invite statuses.
// All new — no shared components.

import React from 'react';

type InviteStatus = 'sent' | 'opened' | 'applied' | 'expired' | 'declined';

interface InviteStatusBadgeProps {
  status: InviteStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  InviteStatus,
  { label: string; bg: string; color: string; dot: string }
> = {
  sent:     { label: 'Sent',     bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
  opened:   { label: 'Opened',   bg: '#FEF3C7', color: '#D97706', dot: '#F59E0B' },
  applied:  { label: 'Applied',  bg: '#EDE9FE', color: '#7C3AED', dot: '#8B5CF6' },
  expired:  { label: 'Expired',  bg: '#FEE2E2', color: '#DC2626', dot: '#EF4444' },
  declined: { label: 'Declined', bg: '#F3F4F6', color: '#9CA3AF', dot: '#D1D5DB' },
};

const InviteStatusBadge: React.FC<InviteStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.sent;

  const padding = size === 'sm' ? '2px 8px' : '3px 10px';
  const fontSize = size === 'sm' ? '11px' : '12px';
  const dotSize  = size === 'sm' ? '5px' : '6px';

  return (
    <span
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '5px',
        padding,
        borderRadius:   '99px',
        background:     config.bg,
        color:          config.color,
        fontSize,
        fontWeight:     600,
        fontFamily:     'inherit',
        lineHeight:     1.5,
        whiteSpace:     'nowrap',
      }}
    >
      <span
        style={{
          width:        dotSize,
          height:       dotSize,
          borderRadius: '50%',
          background:   config.dot,
          flexShrink:   0,
        }}
      />
      {config.label}
    </span>
  );
};

export default InviteStatusBadge;