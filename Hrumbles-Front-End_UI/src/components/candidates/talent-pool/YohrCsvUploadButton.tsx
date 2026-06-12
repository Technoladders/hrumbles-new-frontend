// src/components/candidates/talent-pool/YohrCsvUploadButton.tsx
// Gate: visible only for YOHR org. Uses Redux org_id (consistent with TalentPoolPage).

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Upload } from 'lucide-react';
import YohrCsvUploadModal from './YohrCsvUploadModal';

const YOHR_ORG_ID = '2e569073-86de-4199-9d36-99dfe4d2e8f6';

const YohrCsvUploadButton: React.FC = () => {
  const [open, setOpen]    = useState(false);
  const organizationId     = useSelector((state: any) => state.auth.organization_id);

  // Also show for demo org during testing — remove this second condition in production
  const DEMO_ORG_ID = '53989f03-bdc9-439a-901c-45b274eff506';
  if (organizationId !== YOHR_ORG_ID && organizationId !== DEMO_ORG_ID) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 16px', borderRadius: 10,
          background: 'linear-gradient(135deg, #6D28D9, #7C3AED)',
          border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 700, color: '#fff',
          boxShadow: '0 2px 10px rgba(109,40,217,0.3)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(109,40,217,0.45)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(109,40,217,0.3)')}
      >
        <Upload size={14} />
        Import CSV
      </button>

      {open && <YohrCsvUploadModal onClose={() => setOpen(false)} />}
    </>
  );
};

export default YohrCsvUploadButton;