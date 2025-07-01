import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('Dual Proxy request body:', req.body);
    console.log('Request payload:', JSON.stringify(req.body, null, 2));

    // Determine the endpoint from the query parameter or path
    const endpoint = req.query.endpoint || 'dual-encrypt'; // Fallback to dual-encrypt if no endpoint specified
    const backendUrl = `http://62.72.51.159:4001/api/dual/${endpoint}`;
    
    console.log('Forwarding to backend URL:', backendUrl);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', response.status, errorText);
      throw new Error(`Backend responded with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Backend response data:', data);
    res.status(200).json(data);
  } catch (error) {
    console.error('Dual Proxy error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}