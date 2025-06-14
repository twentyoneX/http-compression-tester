// /api/check.js

import zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
// Use the built-in zlib function for Brotli. It's the most stable option.
const brotliDecompress = promisify(zlib.brotliDecompress);

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

    const fetchResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      redirect: 'follow',
    });

    // CRITICAL ERROR HANDLING: Prevents crashes on 4xx/5xx errors.
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

    const bodyBuffer = Buffer.from(await fetchResponse.arrayBuffer());
    const compressedSize = bodyBuffer.byteLength;
    let uncompressedSize = null;

    if (contentEncoding && compressedSize > 0) {
      try {
        let decompressedBuffer;
        if (contentEncoding.includes('gzip')) {
          decompressedBuffer = await gunzip(bodyBuffer);
        } else if (contentEncoding.includes('br')) {
          decompressedBuffer = await brotliDecompress(bodyBuffer);
        } else if (contentEncoding.includes('deflate')) {
          decompressedBuffer = await inflate(bodyBuffer);
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
    // This outer catch handles low-level network errors.
    console.error("A critical network error occurred:", error.message);
    return response.status(500).json({ error: 'A critical network error occurred.', details: `Could not reach the server. This may be a DNS issue or the server is offline. (Original error: ${error.cause ? error.cause.code : error.message})` });
  }
}
