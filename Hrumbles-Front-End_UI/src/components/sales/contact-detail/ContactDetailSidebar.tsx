import React from 'react';
import { Mail, Phone, ShieldCheck, Clock, CheckCircle2, XCircle, AlertCircle, MapPin, Globe, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractFromRaw, hasData } from '@/utils/dataExtractor';
import { cn } from '@/lib/utils';

export const ContactDetailSidebar = ({ contact, isRequestingPhone, setIsRequestingPhone, refetch }: any) => {
  const { toast } = useToast();
  const data = extractFromRaw(contact);

  const handleRequestPhone = async () => {
    setIsRequestingPhone(true);
    try {
      const { error } = await supabase.functions.invoke('request-phone', {
        body: { 
          contactId: contact.id, 
          apolloPersonId: data.rawPerson.id 
        }
      });
      if (error) throw error;
      toast({ title: "Phone enrichment requested", description: "We'll verify and add phone numbers shortly" });
      refetch();
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Request failed", 
        description: err.message 
      });
    } finally { 
      setIsRequestingPhone(false); 
    }
  };


  return (
    <aside className="w-[380px] bg-gradient-to-b from-white to-slate-50 border-r border-slate-200 overflow-y-auto flex flex-col no-scrollbar shadow-lg">
      <div className="p-6 space-y-6">
        {/* Quick Info Section */}
        <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
            <MapPin size={12} />
            Quick Information
          </h3>
          <div className="space-y-3">
            {data.city && (
              <QuickInfoRow 
                label="Location"
                value={[data.city, data.state, data.country].filter(Boolean).join(', ')}
              />
            )}
            {data.timezone && (
              <QuickInfoRow 
                label="Timezone"
                value={data.timezone}
              />
            )}
            {data.seniority && (
              <QuickInfoRow 
                label="Seniority"
                value={
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[9px] font-black uppercase">
                    {data.seniority}
                  </Badge>
                }
              />
            )}
          </div>
        </section>

        <Separator className="bg-slate-200" />

        {/* Email Addresses Section */}
        <section>
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
            <Mail size={12} />
            Email Addresses
          </h3>
          
          <div className="space-y-3">
            {/* Manual Entry Email */}
            {contact.email && (
              <EmailCard 
                email={contact.email}
                status="Manual Entry"
                isPrimary={true}
                source="User Input"
              />
            )}

            {/* Enriched Emails */}
            {data.allEmails.filter((e: any) => e.email !== contact.email).map((emailData: any, idx: number) => (
              <EmailCard 
                key={idx}
                email={emailData.email}
                status={emailData.email_status || emailData.status}
                trueStatus={emailData.email_true_status}
                // source={emailData.source}
              />
            ))}

            {/* Personal Emails */}
            {hasData(data.personalEmails) && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">
                  Personal Emails
                </p>
                {data.personalEmails.map((email: string, idx: number) => (
                  <EmailCard 
                    key={idx}
                    email={email}
                    status="Personal"
                    source="Enrichment"
                  />
                ))}
              </div>
            )}

            {!hasData(data.allEmails) && !contact.email && (
              <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No email addresses found</p>
              </div>
            )}
          </div>
        </section>

        <Separator className="bg-slate-200" />

        {/* Phone Numbers Section */}
        <section>
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
            <Phone size={12} />
            Phone Numbers
          </h3>
          
          <div className="space-y-3">
            {/* Manual Entry Phone */}
            {contact.mobile && (
              <PhoneCard 
                number={contact.mobile}
                type="Primary Mobile"
                status="Manual Entry"
                source="User Input"
              />
            )}

            {/* Enriched Phones */}
            {data.phoneNumbers.map((phoneData: any, idx: number) => (
              <PhoneCard 
                key={idx}
                number={phoneData.phone_number || phoneData.raw_number}
                type={phoneData.type}
                status={phoneData.status}
                source={phoneData.source_name}
              />
            ))}

            {/* Request Phone Button */}
{/* Request Phone Button – show when we believe Apollo has a phone to reveal */}
{!contact.mobile &&
  data.phoneNumbers.length === 0 &&
  contact.phone_enrichment_status !== 'pending_phones' &&
  (
    // Option A – if you already compute this in extractFromRaw
    data.hasDirectPhone ||
    
    // Option B – safer fallback checks (add these to your extractFromRaw or inline)
    data.directDialStatus === 'enrichment_successful' ||
    !!data.organization?.primary_phone ||
    (data.phoneNumbersUnrevealed?.length > 0)   // if you extract unrevealed ones
  ) && (
  <Button
    onClick={handleRequestPhone}
    disabled={isRequestingPhone}
    className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-xs shadow-lg hover:shadow-xl transition-all"
  >
    {isRequestingPhone ? (
      <>
        <Clock size={14} className="mr-2 animate-spin" />
        VERIFYING...
      </>
    ) : (
      <>
        <Phone size={14} className="mr-2" />
        REVEAL VERIFIED PHONE
      </>
    )}
  </Button>
)}

            {/* Pending Status */}
            {contact.phone_enrichment_status === 'pending_phones' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <Clock size={20} className="text-amber-600 mx-auto mb-2 animate-spin" />
                <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
                  Phone Verification in Progress
                </p>
              </div>
            )}

            {/* No phones available */}
            {!contact.mobile && 
             data.phoneNumbers.length === 0 && 
             !data.hasDirectPhone && 
             contact.phone_enrichment_status !== 'pending_phones' && (
              <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <Phone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No phone numbers available</p>
              </div>
            )}
          </div>
        </section>

        <Separator className="bg-slate-200" />

        {/* Social Links Section */}
        {(data.linkedinUrl || data.twitterUrl || data.facebookUrl || data.githubUrl) && (
          <section>
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
              <Globe size={12} />
              Social Profiles
            </h3>
            <div className="space-y-2">
              {data.linkedinUrl && (
                <SocialLink 
                  url={data.linkedinUrl}
                  icon={<Linkedin size={14} />}
                  label="LinkedIn Profile"
                  color="bg-blue-600"
                />
              )}
              {data.twitterUrl && (
                <SocialLink 
                  url={data.twitterUrl}
                  icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
                  label="X (Twitter)"
                  color="bg-slate-800"
                />
              )}
              {data.facebookUrl && (
                <SocialLink 
                  url={data.facebookUrl}
                  icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>}
                  label="Facebook"
                  color="bg-blue-700"
                />
              )}
            </div>
          </section>
        )}

        {/* Record Metadata */}
        <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
            Record Details
          </h3>
          <div className="space-y-3">
            <MetadataRow 
              label="CRM Stage"
              value={
                <Badge className="bg-indigo-600 text-white border-none text-[9px] font-bold">
                  {contact.contact_stage}
                </Badge>
              }
            />
            {contact.medium && (
              <MetadataRow 
                label="Source"
                value={contact.medium}
              />
            )}
            {contact.created_at && (
              <MetadataRow 
                label="Created"
                value={new Date(contact.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              />
            )}
            {contact.updated_at && (
              <MetadataRow 
                label="Last Updated"
                value={new Date(contact.updated_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              />
            )}
          </div>
        </section>
      </div>
    </aside>
  );
};

  const getEmailStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'verified': 'text-green-600 bg-green-50 border-green-200',
      'likely': 'text-blue-600 bg-blue-50 border-blue-200',
      'unavailable': 'text-slate-500 bg-slate-50 border-slate-200',
      'unknown': 'text-amber-600 bg-amber-50 border-amber-200'
    };
    return statusColors[status?.toLowerCase()] || statusColors.unknown;
  };

  const getEmailStatusIcon = (status: string) => {
    const lowerStatus = status?.toLowerCase();
    if (lowerStatus === 'verified') return <CheckCircle2 size={12} className="text-green-600" />;
    if (lowerStatus === 'likely') return <AlertCircle size={12} className="text-blue-600" />;
    if (lowerStatus === 'unavailable') return <XCircle size={12} className="text-slate-500" />;
    return <AlertCircle size={12} className="text-amber-600" />;
  };

// Helper Components
const QuickInfoRow = ({ label, value }: any) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className="text-slate-900 font-bold">{value}</span>
  </div>
);

const EmailCard = ({ email, status, trueStatus, isPrimary, source }: any) => (
  <div className={cn(
    "bg-white rounded-lg p-3 border-2 transition-all hover:shadow-md",
    isPrimary ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200"
  )}>
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-900 truncate" title={email}>
          {email}
        </p>
      </div>
      {isPrimary && (
        <Badge className="ml-2 bg-indigo-600 text-white border-none text-[8px] font-black px-1.5 py-0">
          PRIMARY
        </Badge>
      )}
    </div>
    
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {status && status !== 'Manual Entry' && getEmailStatusIcon(status)}
        <Badge className={cn(
          "text-[8px] font-bold border px-1.5 py-0",
          status === 'Manual Entry' 
            ? "bg-slate-100 text-slate-700 border-slate-200" 
            : getEmailStatusColor(status)
        )}>
          {trueStatus || status}
        </Badge>
      </div>
      {source && (
        <span className="text-[8px] text-slate-400 font-medium uppercase tracking-wider">
          {source}
        </span>
      )}
    </div>
  </div>
);

const PhoneCard = ({ number, type, status, source }: any) => (
  <div className="bg-white rounded-lg p-3 border-2 border-slate-200 hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-black text-slate-900">{number}</p>
      {status === 'valid_number' && (
        <ShieldCheck size={14} className="text-green-600" />
      )}
    </div>
    <div className="flex items-center justify-between">
      <Badge variant="outline" className="text-[8px] font-bold bg-slate-50 text-slate-600 border-slate-200 px-1.5 py-0">
        {type || 'Phone'}
      </Badge>
      {source && (
        <span className="text-[8px] text-slate-400 font-medium uppercase tracking-wider">
          {source}
        </span>
      )}
    </div>
  </div>
);

const SocialLink = ({ url, icon, label, color }: any) => (
  <a 
    href={url}
    target="_blank"
    rel="noreferrer"
    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all group"
  >
    <div className={cn("p-2 rounded-lg text-white", color)}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
        {label}
      </p>
    </div>
  </a>
);

const MetadataRow = ({ label, value }: any) => (
  <div className="flex items-center justify-between">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    <span className="text-[10px] font-black text-slate-800">{value}</span>
  </div>
);