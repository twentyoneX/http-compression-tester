// /api/check.js

// Import Node.js modules for decompression
import zlib from 'zlib';
import { promisify } from 'util';

// Create promise-based versions of the decompression functions
const unzip = promisify(zlib.unzip);
const brotliDecompress = promisify(zlib.brotliDecompress);

export default async function handler(request, response) {
  // --- CORS Headers ---
  // This allows your Blogspot page to make requests to this API
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle the browser's pre-flight "OPTIONS" request
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // --- URL Validation ---
  const { url } = request.query;
  if (!url) {
    return response.status(400).json({ error: 'URL parameter is required.' });
  }

  // Automatically add "http://" if the user forgets it
  let targetUrl;
  try {
    targetUrl = new URL(url.startsWith('http') ? url : `http://${url}`).toString();
  } catch (e) {
    return response.status(400).json({ error: 'Invalid URL provided.' });
  }

  // --- Fetch and Analyze ---
  try {
    const fetchResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Blogspot-HTTP-Compression-Tester/1.0',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      redirect: 'manual', // Important: We handle redirects ourselves
    });

    const headers = fetchResponse.headers;
    const contentEncoding = headers.get('content-encoding');
    const contentLength = headers.get('content-length');

    // --- Handle Redirects ---
    if (fetchResponse.status >= 300 && fetchResponse.status < 400) {
      return response.status(200).json({
        url: targetUrl,
        status: fetchResponse.status,
        isRedirect: true,
        redirectLocation: headers.get('location'),
      });
    }

    // --- Calculate Uncompressed Size ---
    let uncompressedSize = null;
    const compressedSize = contentLength ? parseInt(contentLength, 10) : 0;

    if (contentEncoding && compressedSize > 0) {
      // If the content is compressed, decompress it to find the original size
      const buffer = await fetchResponse.arrayBuffer();
      let decompressedBuffer;
      try {
        if (contentEncoding.includes('gzip') || contentEncoding.includes('deflate')) {
          decompressedBuffer = await unzip(Buffer.from(buffer));
        } else if (contentEncoding.includes('br')) {
          decompressedBuffer = await brotliDecompress(Buffer.from(buffer));
        }
        if (decompressedBuffer) {
          uncompressedSize = decompressedBuffer.byteLength;
        }
      } catch (decompressionError) {
        console.error("Decompression failed:", decompressionError.message);
        uncompressedSize = null; // Mark as unknown if decompression fails
      }
    } else if (compressedSize > 0) {
      // If not compressed, the original size is the same as the transferred size
      uncompressedSize = compressedSize;
    }

    // --- Prepare Final Result ---
    const result = {
      url: targetUrl,
      status: fetchResponse.status,
      isCompressed: !!contentEncoding,
      compressionType: contentEncoding || 'None',
      compressedSize: compressedSize,
      uncompressedSize: uncompressedSize,
      headers: Object.fromEntries(headers.entries()),
    };

    return response.status(200).json(result);

  } catch (error) {
    console.error("Fetch Error:", error);
    return response.status(500).json({ error: 'Failed to fetch the URL.', details: error.message });
  }
}
