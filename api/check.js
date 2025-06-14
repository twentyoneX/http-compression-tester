// This is a Vercel Serverless Function.
// It receives a URL, fetches it, analyzes its headers for compression,
// and returns a JSON report.

export default async function handler(request, response) {
  // ===================================================================
  // STEP 1: SET CORS HEADERS
  // This is the most critical part for fixing the "NetworkError".
  // It tells browsers that your Blogspot page is allowed to make
  // requests to this API.
  // ===================================================================
  response.setHeader('Access-Control-Allow-Origin', '*'); // Allows any origin
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS'); // Allows these HTTP methods
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Allows these headers

  // Browsers will sometimes send a "pre-flight" OPTIONS request to check
  // permissions before sending the actual GET request. We need to handle this.
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // ===================================================================
  // STEP 2: GET AND VALIDATE THE URL FROM THE QUERY
  // ===================================================================
  const { url } = request.query;

  // If the 'url' parameter is missing, send a 400 Bad Request error.
  if (!url) {
    return response.status(400).json({ error: 'URL parameter is required.' });
  }

  // Try to create a valid URL object. We add 'http://' if no protocol
  // is provided to prevent errors.
  let targetUrl;
  try {
    targetUrl = new URL(url.startsWith('http') ? url : `http://${url}`).toString();
  } catch (e) {
    return response.status(400).json({ error: 'Invalid URL provided.' });
  }


  // ===================================================================
  // STEP 3: FETCH THE URL AND ANALYZE THE RESPONSE
  // ===================================================================
  try {
    // We use `fetch` to make the network request to the user's URL.
    const fetchResponse = await fetch(targetUrl, {
      headers: {
        // A custom User-Agent is good practice for a tool like this.
        'User-Agent': 'Blogspot-HTTP-Compression-Tester/1.0',
        // We tell the server that we accept compressed responses.
        'Accept-Encoding': 'gzip, deflate, br',
      },
      // 'manual' redirect handling allows us to see the 301/302 redirect
      // response instead of automatically following it.
      redirect: 'manual', 
    });

    const headers = fetchResponse.headers;
    const contentEncoding = headers.get('content-encoding');
    const contentLength = headers.get('content-length');

    // Check if the response is a redirect (status 3xx).
    if (fetchResponse.status >= 300 && fetchResponse.status < 400) {
       return response.status(200).json({
         url: targetUrl,
         status: fetchResponse.status,
         isRedirect: true,
         redirectLocation: headers.get('location'), // The URL it redirects to
       });
    }
    
    // Prepare the final result object.
    const result = {
      url: targetUrl,
      status: fetchResponse.status,
      isCompressed: !!contentEncoding, // true if 'content-encoding' exists, false otherwise
      compressionType: contentEncoding || 'None', // e.g., 'gzip', 'br', or 'None'
      // Parse the size, or set to null if header is missing
      compressedSize: contentLength ? parseInt(contentLength, 10) : null,
      // Include all headers for detailed inspection on the frontend
      headers: Object.fromEntries(headers.entries()),
    };

    // Send the successful result back to the Blogspot page.
    response.status(200).json(result);

  } catch (error) {
    // Handle network errors like DNS failure, server offline, etc.
    console.error("Fetch Error:", error); // Log the error on the server for debugging
    response.status(500).json({ error: 'Failed to fetch the URL.', details: error.message });
  }
}
