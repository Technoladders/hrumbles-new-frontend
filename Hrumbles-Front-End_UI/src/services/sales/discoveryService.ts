import { supabase } from '@/integrations/supabase/client';

export const searchGlobalDatabase = async (filters: any, page: number) => {
  const { data, error } = await supabase.functions.invoke('apollo-people-search', {
    body: { filters, page, per_page: 100 }
  });
  if (error) throw error;
  return data;
};

/**
 * Saves a person to the CRM contacts table.
 *
 * Accepts either:
 *  1. Raw Apollo person object   (from API response)
 *  2. Mapped discovery row       (row.original from DataTable — has original_data nested inside)
 *
 * Always unwrap original_data first to get the real Apollo fields.
 */
export const saveDiscoveryToCRM = async (
  personOrRow: any,
  orgId: string,
  userId: string,
  fileId?: string
) => {
  // Unwrap mapped discovery row if needed
  // Mapped rows have: { id: "temp-xxx", apollo_id: "realId", original_data: { ...rawApollo } }
  // Raw Apollo persons have: { id: "realId", first_name, last_name_obfuscated, title, organization }
  const person = personOrRow?.original_data || personOrRow;

  // Extract real Apollo ID — prefer raw .id, fall back to mapped .apollo_id
  const apolloId = person.id && !person.id.toString().startsWith('temp-')
    ? person.id
    : (personOrRow.apollo_id || personOrRow.apollo_person_id || null);

  // Build full name — handle obfuscated last names from Apollo
  const firstName = person.first_name || '';
  const lastName  = person.last_name  || person.last_name_obfuscated || '';
  const fullName  = [firstName, lastName].filter(Boolean).join(' ') || person.name || 'Unknown';

  const { data: contact, error: contactErr } = await supabase
    .from('contacts')
    .upsert({
      apollo_person_id: apolloId,
      organization_id:  orgId,
      name:             fullName,
      job_title:        person.title || person.job_title || null,
      company_name:     person.organization?.name || person.company_name || null,
      contact_stage:    'Identified',
      created_by:       userId,
      updated_by:       userId,
    }, {
      onConflict: 'apollo_person_id, organization_id'
    })
    .select()
    .single();

  if (contactErr) {
    console.error('[saveDiscoveryToCRM] Upsert error:', contactErr);
    throw contactErr;
  }

  // Optionally link to a workspace list
  if (fileId && contact?.id) {
    const { error: linkErr } = await supabase.from('contact_workspace_files').upsert({
      contact_id: contact.id,
      file_id:    fileId,
      added_by:   userId,
    }, { onConflict: 'contact_id, file_id' });
    if (linkErr) console.error('[saveDiscoveryToCRM] List link error:', linkErr);
  }

  return contact;
};