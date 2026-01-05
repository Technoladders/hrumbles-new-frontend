// pages/api/apollo/enrich.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { linkedin_url, email, contact_id } = req.body;

  // Validation
  if (!linkedin_url && !email) {
    return res.status(400).json({ 
      error: 'Either LinkedIn URL or email is required' 
    });
  }

  if (!APOLLO_API_KEY) {
    console.error('APOLLO_API_KEY is not configured in environment variables');
    return res.status(500).json({ 
      error: 'API key not configured. Please add APOLLO_API_KEY to .env.local' 
    });
  }

 
  try {
    console.log('🚀 Enriching contact:', { contact_id, has_linkedin: !!linkedin_url, has_email: !!email });

    // Call Apollo.io API
    const response = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': APOLLO_API_KEY,
      },
      body: JSON.stringify({
        linkedin_url: linkedin_url || undefined,
        email: email || undefined,
        reveal_personal_emails: true,
        reveal_phone_number: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Apollo API error:', errorData);
      return res.status(response.status).json({ 
        error: errorData.message || 'Apollo API request failed' 
      });
    }

    const data = await response.json();
    
    console.log('✅ Apollo.io enrichment successful for contact:', contact_id);

    return res.status(200).json(data.person);
  } catch (error: any) {
    console.error('❌ Apollo.io API error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}





