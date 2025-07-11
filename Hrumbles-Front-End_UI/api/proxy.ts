import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('Proxy request body:', req.body);
    console.log('Request payload:', JSON.stringify(req.body, null, 2));

    const backendUrl = 'http://62.72.51.159:5005/api/validate-candidate';
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    console.log('Backend response status:', response.status);
    console.log('Backend response headers:', Object.fromEntries(response.headers.entries()));

    const contentType = response.headers.get('Content-Type');
    if (!response.ok || !contentType?.includes('application/json')) {
      const errorText = await response.text();
      console.error('Backend error:', response.status, response.statusText, errorText.slice(0, 200));
      return res.status(response.status).json({
        error: `Backend responded with non-JSON or error: ${response.status} - ${response.statusText}`,
        details: errorText.slice(0, 200),
      });
    }

    const data = await response.json();
    console.log('Backend response data:', data);
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}