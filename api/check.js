// /api/check.js

// Use the robust, WebAssembly-based libraries for decompression
// with the CORRECT package names and CORRECT 'default export' import syntax.
import brotliDecompress from '@jsquash/brotli-decode';
import gzipDecompress from '@jsquash/gzip-decompress';

export default async function handler(request, response) {
  // Always set CORS headers first to guarantee they are always sent.
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Wrap the entire logic in a try/catch to handle any unexpected crashes.
  try {
    const { url } = request.query;
    if (!url) {
      return response.status(400).json({ error: 'URL parameter is required.' });
    }

    let targetUrl;
    try {
      targetUrl = new URL(url.startsWith('http') ? url : `http://${url}`).toString();
    } catch (e) {
      return response.status(400).json({ error: 'Invalid URL provided.' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    const fetchResponse = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
      let errorDetail = `The server responded with status: ${fetchResponse.status}.`;
      if (fetchResponse.status === 403) {
        errorDetail = 'Access Denied (403 Forbidden). The website is likely protected by a security service that is blocking our tool.';
      }
      return response.status(400).json({ error: 'Failed to access the page.', details: errorDetail });
    }

    const finalUrl = fetchResponse.url;
    const headers = fetchResponse.headers;
    const contentEncoding = headers.get('content-encoding');

    const bodyBuffer = await fetchResponse.arrayBuffer();
    const compressedSize = bodyBuffer.byteLength;
    let uncompressedSize = null;

    if (contentEncoding && compressedSize > 0) {
      try {
        let decompressedBuffer;
        const bodyUint8Array = new Uint8Array(bodyBuffer);

        if (contentEncoding.includes('gzip')) {
          decompressedBuffer = await gzipDecompress(bodyUint8Array);
        } else if (contentEncoding.includes('br')) {
          decompressedBuffer = await brotliDecompress(bodyUint8Array);
        }
        
        if (decompressedBuffer) {
          uncompressedSize = decompressedBuffer.byteLength;
        }
      } catch (decompressionError) {
        console.error(`Decompression failed for ${contentEncoding}:`, decompressionError.message);
        uncompressedSize = null;
      }
    } else if (compressedSize > 0) {
      uncompressedSize = compressedSize;
    }

    const result = {
      url: finalUrl,
      status: fetchResponse.status,
      isCompressed: !!contentEncoding,
      compressionType: contentEncoding || 'None',
      compressedSize: compressedSize,
      uncompressedSize: uncompressedSize,
      headers: Object.fromEntries(headers.entries()),
    };

    return response.status(200).json(result);

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("Request timed out.");
      return response.status(500).json({ error: 'Request Timeout', details: 'The server took too long to respond.' });
    }
    
    console.error("A critical network error occurred:", error.message);
    return response.status(500).json({ error: 'A critical network error occurred.', details: `Could not reach the server. This may be a DNS issue or the server is offline. (Error: ${error.cause ? error.cause.code : error.message})` });
  }
}
