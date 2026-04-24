// Hrumbles-Front-End_UI\src\layouts\MainLayout.jsx
import {
  Box, Flex, IconButton, Avatar, Menu, MenuButton, MenuList,
  MenuItem, MenuDivider, useColorMode, Text, useMediaQuery, Image,
} from "@chakra-ui/react";
import { FiBell, FiLogOut, FiUser, FiMenu } from "react-icons/fi";
import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import NewSidebar from "../components/Sidebar/NewSidebar";
import { useSelector, useDispatch } from "react-redux";
import { logout, setLoggingOut } from "../Redux/authSlice";
import { useActivityTracker } from "../hooks/useActivityTracker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isSameDay } from "date-fns";
import SubscriptionLockModal from "../layouts/SubscriptionLockModal";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ENRICHMENT_TYPES = [
  "contact_email_reveal",
  "contact_phone_reveal",
  "company_enrich",
  "company_search",
];

const ENRICHMENT_META = {
  contact_email_reveal: {
    label: "Email Reveals",
    color: "#3B82F6",
    bg: "#EFF6FF",
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  contact_phone_reveal: {
    label: "Phone Reveals",
    color: "#10B981",
    bg: "#ECFDF5",
    icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  },
  company_enrich: {
    label: "Company Enrich",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  company_search: {
    label: "Company Search",
    color: "#F97316",
    bg: "#FFF7ED",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVG icon helper — keeps the dropdown import-free
// ─────────────────────────────────────────────────────────────────────────────
const SvgIcon = ({ path, size = 12, color = "currentColor", strokeWidth = 2 }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d={path} />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// CreditMenuPanel
// Renders inside the user MenuList. Shows:
//   1. Overall balance bar (color-coded by level)
//   2. 30-day spend split (enrichment vs verification)
//   3. Per-type enrichment breakdown
//   4. Verification per-check pricing reference
// ─────────────────────────────────────────────────────────────────────────────
const CreditMenuPanel = ({
  balance, totalLimit,
  enrichUsed, verifyUsed,
  enrichBreakdown, pricingList,
}) => {
  const pct        = totalLimit > 0 ? Math.max(0, Math.min(100, (balance / totalLimit) * 100)) : 100;
  const isLow      = balance < 50;
  const isCritical = balance < 10;

  const balColor  = isCritical ? "#EF4444" : isLow ? "#F59E0B" : "#6366F1";
  const balBg     = isCritical ? "#FEF2F2" : isLow ? "#FFFBEB" : "#EEF2FF";
  const balBorder = isCritical ? "#FECACA" : isLow ? "#FDE68A" : "#C7D2FE";
  const balText   = isCritical ? "#DC2626" : isLow ? "#92400E" : "#3730A3";
  const trackBg   = isCritical ? "#FECACA" : isLow ? "#FDE68A" : "#C7D2FE";

  const totalSpent = enrichUsed + verifyUsed;
  const enrichPct  = totalSpent > 0 ? (enrichUsed / totalSpent) * 100 : 0;

  const activeEnrichTypes = ENRICHMENT_TYPES.filter(
    (t) => (enrichBreakdown?.[t]?.amount || 0) > 0 || (enrichBreakdown?.[t]?.count || 0) > 0
  );

  return (
    <Box mx="10px" my="10px" fontSize="11px">

      {/* ── 1. Balance bar ──────────────────────────────────────────────── */}
      <Box
        p="10px 12px" mb="8px" borderRadius="10px"
        bg={balBg} border="1px solid" borderColor={balBorder}
      >
        <Flex justify="space-between" align="center" mb="6px">
          <Flex align="center" gap="5px">
            <SvgIcon size={13} color={balColor}
              path="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <Text
              fontSize="10px" fontWeight="700"
              letterSpacing="0.07em" textTransform="uppercase" color={balText}
            >
              Credit Balance
            </Text>
          </Flex>
          <Flex align="baseline" gap="2px">
            <Text fontWeight="800" fontSize="14px" color={balText}>
              {Number(balance).toFixed(0)}
            </Text>
            <Text color="gray.400" fontSize="10px"> / {Number(totalLimit).toFixed(0)}</Text>
          </Flex>
        </Flex>

        {/* Progress */}
        <Box h="5px" borderRadius="full" bg={trackBg} overflow="hidden">
          <Box
            h="100%" borderRadius="full" bg={balColor}
            w={`${pct}%`} transition="width 0.4s ease"
          />
        </Box>

        {/* Low/critical warning */}
        {isLow && (
          <Flex align="center" gap="4px" mt="6px">
            <SvgIcon size={9} color={balText}
              path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
            <Text fontSize="9px" fontWeight="600" color={balText}>
              {isCritical ? "Critical — top up now" : "Low balance — recharge soon"}
            </Text>
          </Flex>
        )}
      </Box>

      {/* ── 2. 30-day spend split ────────────────────────────────────────── */}
      {totalSpent > 0 && (
        <Box
          p="8px 10px" mb="8px" borderRadius="8px"
          bg="#FAFAFA" border="1px solid #EFEFEF"
        >
          <Flex justify="space-between" align="center" mb="5px">
            <Text
              fontWeight="600" fontSize="9px"
              letterSpacing="0.06em" textTransform="uppercase" color="gray.400"
            >
              30-day spend
            </Text>
            <Text fontWeight="700" fontSize="10px" color="gray.700">
             {totalSpent.toFixed(0)}
            </Text>
          </Flex>

          {/* Stacked bar */}
          <Box h="5px" borderRadius="full" bg="#F3F4F6" overflow="hidden" display="flex">
            {enrichPct > 0 && (
              <Box h="100%" bg="#6366F1" w={`${enrichPct}%`} transition="width 0.4s ease" />
            )}
            {100 - enrichPct > 0 && (
              <Box h="100%" bg="#F59E0B" w={`${100 - enrichPct}%`} transition="width 0.4s ease" />
            )}
          </Box>

          <Flex justify="space-between" mt="4px">
            <Flex align="center" gap="3px">
              <Box w="7px" h="7px" borderRadius="full" bg="#6366F1" flexShrink={0} />
              <Text color="#4338CA" fontSize="9px" fontWeight="600">
                Enrichment {enrichUsed.toFixed(0)}
              </Text>
            </Flex>
            <Flex align="center" gap="3px">
              <Box w="7px" h="7px" borderRadius="full" bg="#F59E0B" flexShrink={0} />
              <Text color="#92400E" fontSize="9px" fontWeight="600">
                Verification {verifyUsed.toFixed(0)}
              </Text>
            </Flex>
          </Flex>
        </Box>
      )}

      {/* ── 3. Enrichment breakdown ─────────────────────────────────────── */}
      <Box mb="8px">
        <Flex align="center" gap="4px" mb="5px" px="1px">
          <SvgIcon size={10} color="#6366F1"
            path="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
          <Text
            fontWeight="700" fontSize="9px"
            letterSpacing="0.06em" textTransform="uppercase" color="#6366F1"
          >
            Enrichment (30d)
          </Text>
        </Flex>

        <Box borderRadius="8px" overflow="hidden" border="1px solid #EDE9FE">
          {activeEnrichTypes.length === 0 ? (
            <Flex px="10px" py="8px" justify="center">
              <Text fontSize="9px" color="gray.400" fontStyle="italic">
                No enrichment usage this period
              </Text>
            </Flex>
          ) : (
            activeEnrichTypes.map((type, idx) => {
              const meta  = ENRICHMENT_META[type];
              const stat  = enrichBreakdown?.[type] || {};
              const amt   = stat.amount || 0;
              const count = stat.count  || 0;
              return (
                <Flex
                  key={type}
                  align="center" justify="space-between"
                  px="10px" py="6px"
                  bg={idx % 2 === 0 ? "white" : "#FAFAFA"}
                  borderBottom={idx < activeEnrichTypes.length - 1 ? "1px solid #F5F3FF" : "none"}
                >
                  <Flex align="center" gap="7px">
                    <Box
                      w="22px" h="22px" borderRadius="5px" bg={meta.bg}
                      display="flex" alignItems="center" justifyContent="center"
                      flexShrink={0}
                    >
                      <SvgIcon size={10} color={meta.color} path={meta.icon} />
                    </Box>
                    <Text fontSize="10px" fontWeight="500" color="gray.700">
                      {meta.label}
                    </Text>
                  </Flex>
                  <Flex align="center" gap="7px">
                    <Text fontSize="9px" color="gray.400">{count}×</Text>
                    <Box px="7px" py="1px" borderRadius="4px" bg={meta.bg}>
                      <Text fontSize="9px" fontWeight="700" color={meta.color}>
                        {amt.toFixed(0)}
                      </Text>
                    </Box>
                  </Flex>
                </Flex>
              );
            })
          )}
        </Box>
      </Box>

      {/* ── 4. Pricing reference: enrichment (Apollo) + verification ──── */}
      {pricingList && pricingList.length > 0 && (() => {
        // Split into two groups
        const enrichPricing = pricingList.filter(p => ENRICHMENT_TYPES.includes(p.verification_type));
        const verifyPricing = pricingList.filter(p => !ENRICHMENT_TYPES.includes(p.verification_type));

        const PricingRow = ({ item, idx, total, bgAlt, borderColor, badgeBg, badgeText }) => {
          const name     = item.verification_type
            .replace(/_gl$/, "").replace(/_/g, " ").replace(/\buan\b/gi, "UAN").trim();
          const price    = Number(item.price);
          const possible = price > 0 ? Math.floor(balance / price) : Infinity;
          return (
            <Flex
              key={item.verification_type}
              align="center" justify="space-between"
              px="10px" py="6px"
              bg={idx % 2 === 0 ? "white" : bgAlt}
              borderBottom={idx < total - 1 ? `1px solid ${borderColor}` : "none"}
            >
              <Text fontSize="10px" fontWeight="500" color="gray.700" textTransform="capitalize">
                {name}
              </Text>
              <Flex align="center" gap="7px">
                <Box px="7px" py="1px" borderRadius="4px" bg={badgeBg}>
                  <Text fontSize="9px" fontWeight="700" color={badgeText}>
                    {price.toFixed(0)}
                  </Text>
                </Box>
                {/* <Text
                  fontSize="9px" fontWeight="600"
                  color={possible === 0 ? "#EF4444" : possible < 5 ? "#F59E0B" : "gray.400"}
                  minW="40px" textAlign="right"
                >
                  {possible === Infinity ? "∞ left" : possible === 0 ? "0 left" : `×${possible}`}
                </Text> */}
              </Flex>
            </Flex>
          );
        };

        return (
          <>
            {/* Enrichment pricing */}
            {enrichPricing.length > 0 && (
              <Box mb="6px">
                <Flex align="center" gap="4px" mb="5px" px="1px">
                  <SvgIcon size={10} color="#6366F1"
                    path="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                  <Text fontWeight="700" fontSize="9px" letterSpacing="0.06em" textTransform="uppercase" color="#6366F1">
                    Enrichment credit per request
                  </Text>
                </Flex>
                <Box borderRadius="8px" overflow="hidden" border="1px solid #EDE9FE">
                  {enrichPricing.map((item, idx) => (
                    <PricingRow
                      key={item.verification_type}
                      item={item} idx={idx} total={enrichPricing.length}
                      bgAlt="#F5F3FF" borderColor="#EDE9FE"
                      badgeBg="#EEF2FF" badgeText="#4338CA"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Verification pricing */}
            {verifyPricing.length > 0 && (
              <Box>
                <Flex align="center" gap="4px" mb="5px" px="1px">
                  <SvgIcon size={10} color="#D97706"
                    path="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                  <Text fontWeight="700" fontSize="9px" letterSpacing="0.06em" textTransform="uppercase" color="#D97706">
                    Verification credit per request
                  </Text>
                </Flex>
                <Box borderRadius="8px" overflow="hidden" border="1px solid #FEF3C7">
                  {verifyPricing.map((item, idx) => (
                    <PricingRow
                      key={item.verification_type}
                      item={item} idx={idx} total={verifyPricing.length}
                      bgAlt="#FFFBEB" borderColor="#FEF9C3"
                      badgeBg="#FEF3C7" badgeText="#B45309"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </>
        );
      })()}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MainLayout
// ─────────────────────────────────────────────────────────────────────────────
const MainLayout = () => {
  const { colorMode } = useColorMode();
  const navigate      = useNavigate();
  const dispatch      = useDispatch();
  const [isMobile]    = useMediaQuery("(max-width: 768px)");

  const [isSidebarExpanded, setSidebarExpanded] = useState(!isMobile);
  const [interviews, setInterviews]             = useState([]);
  const [hasTodayInterview, setHasTodayInterview] = useState(false);

  const user           = useSelector((s) => s.auth.user);
  const role           = useSelector((s) => s.auth.role);
  const organizationId = useSelector((s) => s.auth.organization_id);

  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
   const [orgLockReason, setOrgLockReason] = useState(null); // null | 'expired' | 'suspended' | 'inactive'
  const [orgCredits, setOrgCredits]             = useState(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);

  // Full credit data for the menu panel
  // Shape: { balance, totalLimit, enrichUsed, verifyUsed, enrichBreakdown, pricingList }
  const [menuCreditData, setMenuCreditData] = useState(null);

  const [activeSuite, setActiveSuite] = useState(
    () => localStorage.getItem("activeSuite") || "HIRING SUITE"
  );

  // ── Suite polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = (e) => {
      if (e.key === "activeSuite") setActiveSuite(e.newValue || "HIRING SUITE");
    };
    window.addEventListener("storage", onChange);
    const id = setInterval(() => {
      const s = localStorage.getItem("activeSuite");
      if (s !== activeSuite) setActiveSuite(s || "HIRING SUITE");
    }, 100);
    return () => { window.removeEventListener("storage", onChange); clearInterval(id); };
  }, [activeSuite]);

  const getLogoSrc = (suite) => {
    const s = suite?.toUpperCase();
    if (s?.includes("RECRUIT") || s?.includes("HIRING")) return "/xrilic/Xrilic Recruit.svg";
    if (s?.includes("PROJECT"))      return "/xrilic/Xrilic Recruit.svg";
    if (s?.includes("VERIFICATION")) return "/xrilic/Xrilic Verify Black.svg";
    if (s?.includes("SALES"))        return "/xrilic/Xrilic CRM.svg";
    if (s?.includes("FINANCE"))      return "/xrilic/Xrilic Books.svg";
    return "/xrilic/Xrilic logo.svg";
  };

  useActivityTracker({ inactivityThreshold: 300000 });

  console.log("userrrrrrrr", user);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    dispatch(setLoggingOut(true));
    try {
      await supabase.auth.signOut();
      dispatch(logout());
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sb-")) localStorage.removeItem(k);
      });
      localStorage.clear();
      sessionStorage.clear();
    } catch (err) {
      console.error("Logout error:", err);
      localStorage.clear();
      sessionStorage.clear();
    } finally {
      navigate("/login", { replace: true });
    }
  }, [dispatch, navigate, user?.id, organizationId]);

  // ── Activity logger ───────────────────────────────────────────────────────
  const logUserActivity = async (userId, orgId, eventType, details = {}) => {
    try {
      if (!userId || !orgId) return;
      const { error } = await supabase.from("user_activity_logs").insert({
        user_id: userId, organization_id: orgId, event_type: eventType,
        ip_address: details.ip_address, ipv6_address: details.ipv6_address,
        city: details.city, country: details.country,
        latitude: details.latitude, longitude: details.longitude,
        device_info: details.device_info || navigator.userAgent,
        details: details.errorMessage ? { errorMessage: details.errorMessage } : null,
      });
      if (error) console.error("Activity log error:", error.message);
    } catch (err) {
      console.error("Activity log unexpected error:", err);
    }
  };

  useEffect(() => { setSidebarExpanded(!isMobile); }, [isMobile]);

  // ── Org role-credit limits (seat counts) ─────────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (role !== "organization_superadmin" || !organizationId) {
        setIsLoadingCredits(false);
        return;
      }
      try {
        setIsLoadingCredits(true);
        const [orgRes, empRes] = await Promise.all([
          supabase.from("hr_organizations").select("role_credit_limits").eq("id", organizationId).single(),
          supabase.from("hr_employees").select("id, hr_roles(name)").eq("organization_id", organizationId),
        ]);
        if (orgRes.error) throw orgRes.error;
        if (empRes.error) throw empRes.error;
        const limits = orgRes.data.role_credit_limits;
        const counts = empRes.data.reduce((a, e) => {
          const n = e.hr_roles?.name;
          if (n) a[n] = (a[n] || 0) + 1;
          return a;
        }, {});
        setOrgCredits(Object.keys(limits).reduce((a, n) => {
          a[n] = { limit: limits[n], count: counts[n] || 0 };
          return a;
        }, {}));
      } catch (err) {
        console.error("Org credits fetch error:", err);
        toast.error("Could not load user credit details.");
      } finally {
        setIsLoadingCredits(false);
      }
    };
    run();
  }, [role, organizationId]);

  // ── Full credit data fetch (balance + enrichment + verification) ──────────
  useEffect(() => {
    if (!organizationId) return;
    const isCreditRole = role === "organization_superadmin" || role === "admin";
    if (!isCreditRole) return;

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const fetchAll = async () => {
      try {
        const [orgRes, topupRes, txRes] = await Promise.all([
          supabase
            .from("hr_organizations")
            .select("credit_balance, verification_check")
            .eq("id", organizationId)
            .single(),

          supabase
            .from("credit_transactions")
            .select("balance_after")
            .eq("organization_id", organizationId)
            .eq("transaction_type", "topup")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),

          // FIX 1: real transaction_type values are "enrichment_usage" and "usage",
          // NOT "debit" — so we filter to only spend transactions
          supabase
            .from("credit_transactions")
            .select("amount, verification_type, transaction_type")
            .eq("organization_id", organizationId)
            .in("transaction_type", ["enrichment_usage", "usage"])
            .gte("created_at", since30),
        ]);

        if (orgRes.error) throw orgRes.error;

        const balance    = Number(orgRes.data.credit_balance);
        const provider   = orgRes.data.verification_check || "truthscreen";
        const totalLimit = topupRes.data ? Number(topupRes.data.balance_after) : balance;

        // Aggregate spend — use transaction_type as the reliable discriminator:
        //   "enrichment_usage" → Apollo enrichment
        //   "usage"            → verification (gridlines / truthscreen)
        let enrichUsed = 0;
        let verifyUsed = 0;
        const enrichBreakdown = {};

        (txRes.data || []).forEach(({ amount, verification_type, transaction_type }) => {
          const abs = Math.abs(Number(amount));
          if (transaction_type === "enrichment_usage") {
            enrichUsed += abs;
            if (!enrichBreakdown[verification_type])
              enrichBreakdown[verification_type] = { amount: 0, count: 0 };
            enrichBreakdown[verification_type].amount += abs;
            enrichBreakdown[verification_type].count  += 1;
          } else {
            // transaction_type === "usage"
            verifyUsed += abs;
          }
        });

        // FIX 2: fetch TWO pricing sets and merge them:
        //   a) Org-specific verification pricing (gridlines / truthscreen)
        //   b) Apollo enrichment pricing — org-specific first, fall back to global (org_id IS NULL)
        const [verifyPricingRes, enrichOrgPricingRes, enrichGlobalPricingRes] = await Promise.all([
          // Verification: org-specific rows for their provider
          supabase
            .from("verification_pricing")
            .select("verification_type, price")
            .eq("organization_id", organizationId)
            .eq("source", provider),

          // Enrichment: org-specific Apollo overrides (if any)
          supabase
            .from("verification_pricing")
            .select("verification_type, price")
            .eq("organization_id", organizationId)
            .eq("source", "apollo")
            .in("verification_type", ENRICHMENT_TYPES),

          // Enrichment: global Apollo defaults (organization_id IS NULL)
          supabase
            .from("verification_pricing")
            .select("verification_type, price")
            .is("organization_id", null)
            .eq("source", "apollo")
            .in("verification_type", ENRICHMENT_TYPES),
        ]);

        // Build enrichment pricing: org-specific overrides global
        const enrichPricingMap = {};
        (enrichGlobalPricingRes.data || []).forEach((r) => {
          enrichPricingMap[r.verification_type] = r;
        });
        (enrichOrgPricingRes.data || []).forEach((r) => {
          enrichPricingMap[r.verification_type] = r; // org override wins
        });

        const combinedPricingList = [
          ...(verifyPricingRes.data || []),
          ...Object.values(enrichPricingMap),
        ];

        setMenuCreditData({
          balance, totalLimit,
          enrichUsed, verifyUsed,
          enrichBreakdown,
          pricingList: combinedPricingList,
        });
      } catch (err) {
        console.error("Menu credit data fetch error:", err);
      }
    };

    fetchAll();

    // Realtime: balance update OR new debit transaction
    const ch = supabase
      .channel(`menu-credits:${organizationId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "hr_organizations",
        filter: `id=eq.${organizationId}`,
      }, (payload) => {
        if (payload.new.credit_balance !== undefined) {
          setMenuCreditData((prev) =>
            prev ? { ...prev, balance: Number(payload.new.credit_balance) } : null
          );
        }
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "credit_transactions",
        filter: `organization_id=eq.${organizationId}`,
      }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [organizationId, role]);

  // ── Subscription check ────────────────────────────────────────────────────
useEffect(() => {
    if (!organizationId) return;
 
    const SUBSCRIPTION_LOCK_STATUSES = ['expired', 'inactive', 'canceled'];
 
    const check = async () => {
      const { data } = await supabase
        .from("hr_organizations")
        .select("subscription_status, status")
        .eq("id", organizationId)
        .single();
 
      if (data) {
        const subLocked    = SUBSCRIPTION_LOCK_STATUSES.includes(data.subscription_status);
        const orgSuspended = data.status === 'suspended';
        const orgInactive  = data.status === 'inactive';
 
        let reason = null;
        if (orgSuspended)      reason = 'suspended';
        else if (orgInactive)  reason = 'inactive';
        else if (subLocked)    reason = 'expired';
 
        setOrgLockReason(reason);
 
        // Non-superadmins get force-logged out
        if (reason && role !== "organization_superadmin" && role !== "global_superadmin") {
          handleLogout();
        }
      }
    };
 
    check();
 
    // Realtime: watch for org status changes
    const ch = supabase
      .channel(`org-status:${organizationId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "hr_organizations",
        filter: `id=eq.${organizationId}`,
      }, (payload) => {
        const subLocked    = SUBSCRIPTION_LOCK_STATUSES.includes(payload.new.subscription_status);
        const orgSuspended = payload.new.status === 'suspended';
        const orgInactive  = payload.new.status === 'inactive';
 
        let reason = null;
        if (orgSuspended)      reason = 'suspended';
        else if (orgInactive)  reason = 'inactive';
        else if (subLocked)    reason = 'expired';
 
        setOrgLockReason(reason);
 
        if (reason && role !== "organization_superadmin" && role !== "global_superadmin") {
          toast.error(`Organization account is ${reason}.`);
          handleLogout();
        }
      })
      .subscribe();
 
    return () => { supabase.removeChannel(ch); };
  }, [organizationId, role, handleLogout]);


  // ── Employee deactivation force-logout ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`emp-status:${user.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "hr_employees",
        filter: `id=eq.${user.id}`,
      }, async (payload) => {
        if (payload.new.status !== "active") {
          toast.warning("Your account is disabled. Please contact your administrator.");
          await handleLogout();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, handleLogout]);

  // ── Interviews (bell) ─────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        if (!user?.id || !user?.user_metadata?.first_name || !user?.user_metadata?.last_name)
          throw new Error("User data incomplete");

        const fullName = `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
        const { data, error } = await supabase
          .from("hr_job_candidates")
          .select("name, interview_date, interview_time, interview_location, interview_type, round")
          .eq("main_status_id", "f72e13f8-7825-4793-85e0-e31d669f8097")
          .eq("applied_from", fullName)
          .not("interview_date", "is", null);

        if (error) throw new Error(error.message);

        const now = new Date();
        const upcoming = data.filter((c) => {
          if (!c.interview_date) return false;
          return new Date(`${c.interview_date}T${c.interview_time || "00:00:00"}+05:30`) >= now;
        });

        setInterviews(upcoming);
        const today = new Date("2025-05-20T21:23:00+05:30");
        setHasTodayInterview(upcoming.some((i) => isSameDay(new Date(i.interview_date), today)));
      } catch (err) {
        console.error("Interview fetch error:", err.message);
        setInterviews([]);
        setHasTodayInterview(false);
      }
    };
    if (user?.id) run();
  }, [user?.id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const fmtTime = (t) => {
    if (!t) return "N/A";
    const [h, m] = t.split(":");
    const d = new Date(); d.setHours(+h, +m);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const headerHeight          = "70px";
  const expandedSidebarWidth  = "210px";
  const collapsedSidebarWidth = "74px";
  const mainSidebarWidth      = isSidebarExpanded ? expandedSidebarWidth : collapsedSidebarWidth;
  const toggleSidebar         = () => setSidebarExpanded((v) => !v);

  const fullName  = `${user?.user_metadata?.first_name || "User"} ${user?.user_metadata?.last_name || "Name"}`;
  const roleLabel = { organization_superadmin: "Super Admin", admin: "Admin", global_superadmin: "Global Admin" }[role] || "User";

  const showCredits = menuCreditData && (role === "organization_superadmin" || role === "admin");

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Flex direction="column" height="100vh" overflow="hidden" bg={colorMode === "dark" ? "gray.800" : "#F8F7F7"}>

         <SubscriptionLockModal
     isOpen={!!orgLockReason && (role === "organization_superadmin" || role === "global_superadmin")}
     reason={orgLockReason}
   />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Flex
        as="header" align="center" justify="space-between"
        w="100%" height={headerHeight} p={4}
        bg={colorMode === "dark" ? "base.bgdark" : "white"}
        boxShadow="sm" zIndex={10} position="relative"
      >
        <Image
          key={activeSuite} src={getLogoSrc(activeSuite)} alt="Logo"
          width={{ base: "100px", md: "140px" }} height="auto" mr={4}
          transition="opacity 0.2s ease-in-out"
        />

        <Flex align="center" gap={2} flex="1" justify="center">
          {isMobile && (
            <IconButton icon={<FiMenu />} aria-label="Toggle Sidebar"
              onClick={toggleSidebar} variant="ghost" />
          )}
        </Flex>

        {/* Right: bell + user menu (CreditBalanceDisplay removed from header) */}
        <Flex align="center" gap={4}>

          {/* Bell */}
          <Menu>
            <MenuButton
              as={IconButton}
              icon={
                <Box position="relative">
                  <FiBell />
                  {hasTodayInterview && (
                    <Box
                      position="absolute" top="-2px" right="-2px"
                      w="8px" h="8px" bg="red.500" borderRadius="full"
                      border="1px solid"
                      borderColor={colorMode === "dark" ? "base.bgdark" : "white"}
                    />
                  )}
                </Box>
              }
              size="lg" aria-label="Notifications" variant="ghost"
              color={colorMode === "dark" ? "white" : "base.greylg"}
            />
            <MenuList maxW="300px" p={2} zIndex={9999}>
              {interviews.length > 0 ? (
                interviews.map((iv, i) => (
                  <MenuItem key={i} bg="transparent" _hover={{ bg: "gray.100" }} p={2}>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" isTruncated>{iv.name}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {fmtDate(iv.interview_date)} at {fmtTime(iv.interview_time)}
                      </Text>
                      <Text fontSize="xs" color="gray.600">{iv.interview_location || "N/A"}</Text>
                      <Text fontSize="xs" color="blue.600">
                        {iv.interview_type || "N/A"} — {iv.round || "N/A"}
                      </Text>
                    </Box>
                  </MenuItem>
                ))
              ) : (
                <MenuItem bg="transparent" p={2}>
                  <Text fontSize="sm" color="gray.500">No upcoming interviews.</Text>
                </MenuItem>
              )}
            </MenuList>
          </Menu>

          {/* ── User menu ───────────────────────────────────────────────── */}
          <Menu>
            <MenuButton>
              <Flex align="center" gap={3}>
                <Box textAlign="right" display={{ base: "none", md: "block" }}>
                  <Text fontSize="sm" fontWeight="700" lineHeight="1.2"
                    color={colorMode === "dark" ? "white" : "gray.800"}>
                    {fullName}
                  </Text>
                  <Text fontSize="10px" color="gray.400" letterSpacing="0.02em">
                    {user?.email || "user@example.com"}
                  </Text>
                </Box>
                <Avatar
                  size="sm" name={fullName} src="/user-avatar.png"
                  bg="purple.500" color="white" fontWeight="700" fontSize="xs"
                  border="2px solid"
                  borderColor={colorMode === "dark" ? "whiteAlpha.200" : "#E0E7FF"}
                />
              </Flex>
            </MenuButton>

            <MenuList
              zIndex={9999} p={0}
              minW={showCredits ? "290px" : "230px"}
              border="1px solid"
              borderColor={colorMode === "dark" ? "whiteAlpha.100" : "gray.100"}
              boxShadow="0 12px 40px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)"
              borderRadius="14px" overflow="hidden"
            >
              {/* Profile header */}
              <Box
                px={4} pt={4} pb={3}
                bg={colorMode === "dark"
                  ? "gray.700"
                  : "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)"}
                borderBottom="1px solid"
                borderColor={colorMode === "dark" ? "whiteAlpha.100" : "#E0E7FF"}
              >
                <Flex align="center" gap={3}>
                  <Avatar
                    size="md" name={fullName} src="/user-avatar.png"
                    bg="purple.500" color="white" fontWeight="700"
                    border="2px solid white"
                    boxShadow="0 2px 8px rgba(99,102,241,0.3)"
                  />
                  <Box minW={0}>
                    <Text fontSize="13px" fontWeight="700" noOfLines={1}
                      color={colorMode === "dark" ? "white" : "gray.800"}>
                      {fullName}
                    </Text>
                    <Text fontSize="10px" color="gray.500" noOfLines={1}>
                      {user?.email || "user@example.com"}
                    </Text>
                    {role && (
                      <Box mt={1} display="inline-block"
                        px={2} py="1px" borderRadius="full" bg="#6366F1" color="white">
                        <Text fontSize="9px" fontWeight="700"
                          letterSpacing="0.06em" textTransform="uppercase">
                          {roleLabel}
                        </Text>
                      </Box>
                    )}
                  </Box>
                </Flex>
              </Box>

              {/* ── Credit panel ──────────────────────────────────────── */}
              {showCredits && (
                <>
                  {/* Scrollable if content is tall */}
                  <Box
                    maxH="360px" overflowY="auto"
                    sx={{
                      "&::-webkit-scrollbar": { width: "4px" },
                      "&::-webkit-scrollbar-thumb": { background: "#E0E7FF", borderRadius: "4px" },
                    }}
                  >
                    <CreditMenuPanel
                      balance={menuCreditData.balance}
                      totalLimit={menuCreditData.totalLimit}
                      enrichUsed={menuCreditData.enrichUsed}
                      verifyUsed={menuCreditData.verifyUsed}
                      enrichBreakdown={menuCreditData.enrichBreakdown}
                      pricingList={menuCreditData.pricingList}
                    />
                  </Box>
                  <Box mx={3} h="1px" bg={colorMode === "dark" ? "whiteAlpha.100" : "gray.100"} />
                </>
              )}

              {/* Actions */}
              <Box py={1.5}>
                <MenuItem
                  onClick={() => navigate("/profile")}
                  icon={<FiUser size={14} />}
                  fontSize="13px" fontWeight="500"
                  color={colorMode === "dark" ? "gray.200" : "gray.700"}
                  _hover={{ bg: colorMode === "dark" ? "whiteAlpha.100" : "#F5F3FF", color: "#6366F1" }}
                  px={4} py={2.5}
                >
                  View Profile
                </MenuItem>

                <MenuDivider my={1} borderColor={colorMode === "dark" ? "whiteAlpha.100" : "gray.100"} />

                <MenuItem
                  onClick={handleLogout}
                  icon={<FiLogOut size={14} />}
                  fontSize="13px" fontWeight="500"
                  color="red.500"
                  _hover={{ bg: "red.50", color: "red.600" }}
                  px={4} py={2.5}
                >
                  Logout
                </MenuItem>
              </Box>
            </MenuList>
          </Menu>

        </Flex>
      </Flex>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <Flex flex="1" overflow="hidden">
        {isMobile && isSidebarExpanded && (
          <Box
            position="fixed" top={headerHeight} left={0} right={0} bottom={0}
            bg="blackAlpha.600" zIndex={15} onClick={toggleSidebar}
          />
        )}

        <NewSidebar
          isExpanded={isSidebarExpanded}
          toggleSidebar={toggleSidebar}
          headerHeight={headerHeight}
          mainSidebarWidth={mainSidebarWidth}
        />

        <Box
          flex="1" overflowY="auto" p={1} bg={colorMode}
          overflowX="hidden" w="100%" maxW="100%"
          ml={{ base: isMobile ? "0" : mainSidebarWidth, md: mainSidebarWidth }}
          transition="margin-left 0.1s ease-in-out"
          position="relative" zIndex={1}
        >
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};

export default MainLayout;