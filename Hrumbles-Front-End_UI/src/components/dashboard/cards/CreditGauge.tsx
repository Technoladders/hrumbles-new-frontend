import React from "react";
import { motion } from "framer-motion";
import { Coins, Mail, Phone, Building2, Search, ShieldCheck } from "lucide-react";

interface CreditGaugeProps {
  balance: number;
  totalConsumed: number;
  enrichmentUsed: number;
  verificationUsed: number;
  byEnrichmentType?: {
    contact_email_reveal: number;
    contact_phone_reveal: number;
    company_enrich: number;
    company_search: number;
  };
  byVerificationType?: Record<string, number>;
  delay?: number;
}

const CreditGauge: React.FC<CreditGaugeProps> = ({
  balance,
  totalConsumed,
  enrichmentUsed,
  verificationUsed,
  byEnrichmentType,
  byVerificationType = {},
  delay = 0,
}) => {
  const total = balance + totalConsumed;
  const usagePct = total > 0 ? (totalConsumed / total) * 100 : 0;
  const enrichPct = totalConsumed > 0 ? (enrichmentUsed / totalConsumed) * 100 : 0;

  const radius = 65;
  const circ = Math.PI * radius;
  const offset = circ - (usagePct / 100) * circ;

  const services = [
    {
      label: "Email Reveals",
      value: byEnrichmentType?.contact_email_reveal || 0,
      icon: <Mail className="w-3 h-3" />,
      color: "#6366f1",
    },
    {
      label: "Phone Reveals",
      value: byEnrichmentType?.contact_phone_reveal || 0,
      icon: <Phone className="w-3 h-3" />,
      color: "#10b981",
    },
    {
      label: "Company Enrich",
      value: byEnrichmentType?.company_enrich || 0,
      icon: <Building2 className="w-3 h-3" />,
      color: "#f59e0b",
    },
    {
      label: "Company Search",
      value: byEnrichmentType?.company_search || 0,
      icon: <Search className="w-3 h-3" />,
      color: "#ec4899",
    },
    ...Object.entries(byVerificationType).map(([key, value]) => ({
      label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value: value as number,
      icon: <ShieldCheck className="w-3 h-3" />,
      color: "#06b6d4",
    })),
  ].filter((s) => s.value > 0);

  const maxVal = Math.max(...services.map((s) => s.value), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-gray-100 p-4"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        // ── KEY FIX: explicit height so this card never drives row height ──
        // Must match HiringFunnel & CreditTrendChart natural height (~380px)
        height: 380,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-amber-500">
          <Coins className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-700 block">Credit Balance</span>
          <span className="text-[9px] text-gray-400">Usage breakdown</span>
        </div>
      </div>

      {/* ── Gauge arc ── */}
      <div className="flex justify-center mb-1 flex-shrink-0">
        <div className="relative">
          <svg width="140" height="76" viewBox="0 0 160 90">
            <path
              d="M 10 80 A 65 65 0 0 1 150 80"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <motion.path
              d="M 10 80 A 65 65 0 0 1 150 80"
              fill="none"
              stroke="url(#gaugeGradLight)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, delay: delay + 0.2, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="gaugeGradLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.4 }}
              className="text-xl font-bold text-gray-900 leading-none"
            >
              {balance.toLocaleString()}
            </motion.span>
            <span className="text-[8px] text-gray-400 uppercase tracking-wider mt-0.5">
              Available
            </span>
          </div>
        </div>
      </div>

      {/* ── Enrich vs Verify bar ── */}
      <div className="mb-2 flex-shrink-0">
        <div className="flex justify-between text-[9px] text-gray-400 mb-1">
          <span>
            Enrich{" "}
            <span className="font-semibold text-indigo-500">{enrichPct.toFixed(0)}%</span>
          </span>
          <span>
            Verify{" "}
            <span className="font-semibold text-cyan-500">{(100 - enrichPct).toFixed(0)}%</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden flex">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${enrichPct || 0}%` }}
            transition={{ duration: 0.8, delay: delay + 0.5 }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${100 - enrichPct}%` }}
            transition={{ duration: 0.8, delay: delay + 0.6 }}
            className="h-full bg-gradient-to-r from-cyan-400 to-teal-400"
          />
        </div>
        <div className="flex justify-between text-[9px] mt-0.5">
          <span className="text-indigo-500 font-medium">{enrichmentUsed.toLocaleString()}</span>
          <span className="text-cyan-500 font-medium">{verificationUsed.toLocaleString()}</span>
        </div>
      </div>

      {/* ── By Service label ── */}
      <div className="flex items-center justify-between mb-1 flex-shrink-0">
        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
          By Service
        </span>
        {services.length > 5 && (
          <span className="text-[8px] text-gray-300">↕ scroll</span>
        )}
      </div>

      {/* ── Services list: flex-1 + overflow-y-auto keeps it inside fixed height ── */}
      <div
        className="flex-1 overflow-y-auto space-y-1.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {services.length === 0 ? (
          <p className="text-[10px] text-gray-300 text-center py-4">No usage data</p>
        ) : (
          services.map((svc, idx) => {
            const pct = (svc.value / maxVal) * 100;
            return (
              <motion.div
                key={svc.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.6 + idx * 0.05 }}
                className="flex items-center gap-1.5"
              >
                <div
                  className="flex items-center justify-center w-5 h-5 rounded flex-shrink-0"
                  style={{ backgroundColor: `${svc.color}12`, color: svc.color }}
                >
                  {svc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className="text-[9px] text-gray-500 truncate leading-none"
                      title={svc.label}
                    >
                      {svc.label}
                    </span>
                    <span
                      className="text-[9px] font-bold ml-1 flex-shrink-0"
                      style={{ color: svc.color }}
                    >
                      {svc.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: delay + 0.7 + idx * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: svc.color }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default CreditGauge;