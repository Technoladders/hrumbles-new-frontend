import { supabase } from '@/integrations/supabase/client';

export const searchGlobalDatabase = async (filters: any, page: number) => {
  const { data, error } = await supabase.functions.invoke('apollo-people-search', {
    body: { filters, page, per_page: 100 }
  });
  if (error) throw error;
  return data;
};

export const saveDiscoveryToCRM = async (person: any, orgId: string, userId: string, fileId?: string) => {
  // We use .upsert with the explicit 'onConflict' matching the SQL constraint above
  const { data: contact, error: contactErr } = await supabase
    .from('contacts')
    .upsert({
      apollo_person_id: person.id,
      organization_id: orgId, // This is your internal tenant ID
      name: `${person.first_name} ${person.last_name_obfuscated || ''}`.trim(),
      job_title: person.title,
      company_name: person.organization?.name,
      contact_stage: 'Identified',
      created_by: userId,
      updated_by: userId
    }, { 
      onConflict: 'apollo_person_id, organization_id' 
    })
    .select()
    .single();

  if (contactErr) {
    console.error("Error in Discovery Upsert:", contactErr);
    throw contactErr;
  }

  // Handle the multi-list junction table
  if (fileId) {
    await supabase.from('contact_workspace_files').upsert({
      contact_id: contact.id,
      file_id: fileId,
      added_by: userId
    }, {
      onConflict: 'contact_id, file_id'
    });
  }
  
  return contact.id;
};