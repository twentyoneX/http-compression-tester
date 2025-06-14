// api/check.js

export default async function handler(request, response) {
  // Allow requests from any origin (CORS) so our Blogspot page can call this function
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle pre-flight CORS requests
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'URL parameter is required.' });
  }

  let targetUrl;
  try {
    // Ensure the URL has a protocol (http or https)
    targetUrl = new URL(url.startsWith('http') ? url : `http://${url}`).toString();
  } catch (e) {
    return response.status(400).json({ error: 'Invalid URL provided.' });
  }

  try {
    // Make the request to the target URL
    // We set 'Accept-Encoding' to let the server know we can handle compression
    const fetchResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'My-HTTP-Compression-Tester/1.0',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      // Important: Do not follow redirects automatically, so we can check the first response
      redirect: 'manual', 
    });

    const headers = fetchResponse.headers;
    const contentEncoding = headers.get('content-encoding');
    const contentLength = headers.get('content-length');

    // Check for redirects (status 301, 302, 307, 308)
    if (fetchResponse.status >= 300 && fetchResponse.status < 400) {
       return response.status(200).json({
         url: targetUrl,
         status: fetchResponse.status,
         redirectLocation: headers.get('location'),
         isRedirect: true
       });
    }
    
    // Prepare the result
    const result = {
      url: targetUrl,
      status: fetchResponse.status,
      isCompressed: !!contentEncoding,
      compressionType: contentEncoding || 'None',
      compressedSize: contentLength ? parseInt(contentLength, 10) : null,
      headers: Object.fromEntries(headers.entries()),
    };

    // Send the result back as JSON
    response.status(200).json(result);

  } catch (error) {
    // Handle network errors (e.g., DNS lookup failed)
    response.status(500).json({ error: 'Failed to fetch the URL.', details: error.message });
  }
}
