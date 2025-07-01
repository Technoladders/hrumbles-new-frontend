// pages/api/company-employee-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- CORS HEADERS ---
  // Always set CORS headers, especially for development and cross-origin access.
  // Dynamically setting Access-Control-Allow-Origin based on the incoming Origin header
  // is a good practice for production if you have multiple known origins.
  const allowedOrigins = [
    'http://localhost:8081', // Your local development environment
    'https://hrumblesdevelop.vercel.app', // Your deployed Vercel frontend
    // Add any other production origins here as needed
  ];
  const origin = req.headers.origin as string;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // During local development, if the origin isn't explicitly listed,
    // allow all origins. This is less secure for production.
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Include Authorization if your frontend sends it

  // Handle preflight OPTIONS request
  // Browsers send an OPTIONS request first to check CORS permissions.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // --- END CORS HEADERS ---


  try {
    // --- METHOD CHECK ---
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed', message: `Only POST requests are supported for this endpoint. Received: ${req.method}` });
    }

    // --- ENDPOINT VALIDATION ---
    const endpoint = req.query.endpoint || '';
    const validEndpoints = [
      'company-encrypt', 'company-verify', 'company-decrypt',
      'employee-encrypt', 'employee-verify', 'employee-decrypt',
    ];
    if (!validEndpoints.includes(endpoint as string)) {
      return res.status(400).json({ error: 'Bad Request', message: `Invalid endpoint specified: ${endpoint}` });
    }

    // --- BACKEND URL MAPPING ---
    const endpointMap: { [key: string]: string } = {
      'company-encrypt': 'employee-encrypt-step1',
      'company-verify': 'employee-verify-step1',
      'company-decrypt': 'employee-decrypt-step1',
      'employee-encrypt': 'employee-encrypt-step2',
      'employee-verify': 'employee-verify-step2',
      'employee-decrypt': 'employee-decrypt-step2',
    };

    const backendEndpoint = endpointMap[endpoint as string];
    // Base URL for the internal backend, assuming it's consistent for company/employee verification
    // For dual-uan, you'd use 'http://62.72.51.159:4001/api/uan'
    const backendBaseUrl = 'http://62.72.51.159:4001/api/employee';
    const backendUrl = `${backendBaseUrl}/${backendEndpoint}`;

    console.log(`[Proxy Log] Forwarding request for Vercel endpoint "${endpoint}" to backend: ${backendUrl}`);
    // console.log('[Proxy Log] Request body from frontend:', req.body); // Uncomment for debugging if needed

    // --- PREPARING REQUEST BODY FOR BACKEND ---
    // The TruthScreen API (via your internal backend) expects specific structures.
    // Frontend sends `{ prop: value }` where prop might be `requestData` or `responseData`.
    // The internal backend at `62.72.51.159:4001` expects certain data types for its `body`.
    // The previous error "requestData.slice is not a function" indicated the backend was
    // trying to call `.slice()` on a raw string instead of a property within an object.
    // This means the internal backend expected an object, and received a string directly.
    // The fix is to ensure the `fetch` body *always* sends a JSON object to your internal backend.
    
    let requestBodyForBackend: any;
    
    // TruthScreen's encrypt steps sometimes expect just the data (e.g., companyName)
    // and sometimes expect an object with a specific key (e.g., { requestData: "..." }).
    // Your frontend is already sending the correct JSON structure for each step.
    // So, we should simply pass `req.body` as the JSON payload to your internal backend.
    // Your internal backend is then responsible for correctly formatting the payload
    // for the external TruthScreen API.
    
    requestBodyForBackend = req.body; // Frontend ensures the correct JSON structure for each step.

    // --- MAKING THE BACKEND REQUEST ---
    let backendResponse: Response;
    let backendResponseBody: any; // Can be object (parsed JSON) or string (raw text/HTML)
    let finalStatusToSend: number = 200; // HTTP status code to send back to the frontend
    let finalBodyToSend: any;    // Body to send back to the frontend

    try {
        backendResponse = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBodyForBackend), // Ensure we always send JSON to your internal backend
        });

        // --- PARSING BACKEND RESPONSE ---
        // TruthScreen's `Content-Type` is often misleading (`text/html` for JSON).
        // We will read the response as text and then try to parse it as JSON.
        let rawText = '';
        try {
            rawText = await backendResponse.text();
            backendResponseBody = JSON.parse(rawText); // Attempt JSON parsing
            console.log(`[Proxy Log] Backend response from "${backendEndpoint}" parsed as JSON.`);
        } catch (jsonParseError) {
            backendResponseBody = rawText; // Fallback to raw text if JSON parsing fails
            console.warn(`[Proxy Log] Backend response from "${backendEndpoint}" was NOT JSON or parsing failed. Treated as raw text.`);
        }

        console.log(`[Proxy Log] Backend response status from "${backendEndpoint}": ${backendResponse.status} ${backendResponse.statusText}`);
        // console.log('[Proxy Log] Backend raw body (parsed/text):', backendResponseBody); // Uncomment for deep debugging

        // Determine the HTTP status code to send back to the frontend (usually backend's status)
        finalStatusToSend = backendResponse.status;
        finalBodyToSend = backendResponseBody; // Default: send backend's parsed/raw body as is

        // --- CUSTOM TRUTHSCREEN RESPONSE HANDLING ---
        // This section handles the specific quirks of the TruthScreen API
        // where it might send `responseData` or `msg` in different scenarios.

        if (typeof backendResponseBody === 'object' && backendResponseBody !== null) {
            // Case 1: Backend response is an object (could be success, or an error object with `responseData`)
            if ('responseData' in backendResponseBody || 'requestData' in backendResponseBody || 'CompanyName' in backendResponseBody || 'msg' in backendResponseBody) {
                 // If it contains expected TruthScreen properties, forward the object as is.
                 finalBodyToSend = backendResponseBody;
            } else {
                // If it's an object but doesn't look like a standard TruthScreen API response (e.g., some other internal backend error object)
                console.warn('[Proxy Log] Backend returned an unexpected object structure:', backendResponseBody);
                finalBodyToSend = {
                    error: backendResponseBody, // Send the full object as an error detail
                    message: `Backend returned an unexpected object structure for endpoint ${endpoint}.`
                };
            }
        } else if (typeof backendResponseBody === 'string' && backendResponseBody.length > 50 && !backendResponseBody.includes('<html')) {
            // Case 2: Backend response is a long string (often the encrypted `responseData` directly)
            // Heuristic: If it's a long string and doesn't appear to be full HTML, assume it's `responseData`.
            finalBodyToSend = { responseData: backendResponseBody };
            console.log('[Proxy Log] Identified raw string as potential `responseData`.');
        } else if (!backendResponse.ok && typeof backendResponseBody === 'string') {
            // Case 3: Backend sent a non-OK status and the body is a simple error string (not encrypted data)
            console.log('[Proxy Log] Backend sent non-OK status with plain error message.');
            finalBodyToSend = {
                error: backendResponseBody, // The plain string is the error message
                message: `Backend Error for ${endpoint}: ${backendResponseBody.substring(0,100)}...`
            };
        }
        // If backendResponse.ok and it was a simple JSON, finalBodyToSend is already correctly set to backendResponseBody.

    } catch (fetchError: any) {
        // This catch block handles network errors, DNS issues, or actual timeouts of the `fetch` operation itself
        console.error(`[Proxy Log] Fetch to backend "${backendUrl}" failed:`, { message: fetchError.message, name: fetchError.name, stack: fetchError.stack });

        // A 504 (Gateway Timeout) or 500 (Internal Server Error) indicates an issue
        // connecting to or waiting for the backend from the proxy's perspective.
        finalStatusToSend = (fetchError.name === 'AbortError' || fetchError.code === 'ETIMEDOUT') ? 504 : 500;
        finalBodyToSend = {
            error: {
                code: finalStatusToSend.toString(),
                message: (finalStatusToSend === 504 ? 'Backend request timed out (proxy level)' : 'Proxy could not reach backend or internal fetch error'),
                details: fetchError.message,
            },
            responseData: null, // Explicitly set responseData to null for these types of proxy failures
        };
    }

    // --- SENDING RESPONSE TO FRONTEND ---
    res.status(finalStatusToSend).json(finalBodyToSend);

  } catch (error: any) {
    // This outer catch handles any unexpected errors that occur within the proxy function itself
    console.error('[Proxy Log] Unexpected error in company-employee-proxy:', { message: error.message, stack: error.stack });
    res.status(500).json({
        error: {
            code: '500',
            message: 'Internal server error in proxy',
            details: error.message,
        },
        responseData: null, // Explicitly set responseData to null for general proxy errors
    });
  }
}