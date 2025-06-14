// /api/check.js

import zlib from 'zlib';
import { promisify } from 'util';
// Import the new, more robust Brotli library
import { decompress } from 'brotli';

const unzip = promisify(zlib.unzip);
// We no longer need the built-in brotliDecompress

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

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

  try {
    const fetchResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Blogspot-HTTP-Compression-Tester/1.0',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      redirect: 'follow', // Automatically follows redirects
    });

    const finalUrl = fetchResponse.url;
    const headers = fetchResponse.headers;
    const contentEncoding = headers.get('content-encoding');

    const bodyBuffer = Buffer.from(await fetchResponse.arrayBuffer());
    const compressedSize = bodyBuffer.byteLength;
    let uncompressedSize = null;

    if (contentEncoding && compressedSize > 0) {
      try {
        let decompressedBuffer;
        if (contentEncoding.includes('gzip') || contentEncoding.includes('deflate')) {
          decompressedBuffer = await unzip(bodyBuffer);
        } else if (contentEncoding.includes('br')) {
          // ===================================================================
          // THE FINAL FIX: Using the new, better library for Brotli
          // ===================================================================
          decompressedBuffer = decompress(bodyBuffer);
        }
        if (decompressedBuffer) {
          uncompressedSize = decompressedBuffer.byteLength;
        }
      } catch (decompressionError) {
        console.error("Decompression failed:", decompressionError.message);
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
    console.error("Fetch Error:", error);
    return response.status(500).json({ error: 'Failed to fetch the URL.', details: error.message });
  }
}
