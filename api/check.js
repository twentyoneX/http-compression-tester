// /api/check.js

import zlib from 'zlib';
import { promisify } from 'util';
// ===================================================================
// THE CORRECTED IMPORT STATEMENT
// ===================================================================
import { decompress as brotliDecompress } from '@jsquash/brotli-decode';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);

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
      redirect: 'follow',
    });

    const finalUrl = fetchResponse.url;
    const headers = fetchResponse.headers;
    const contentEncoding = headers.get('content-encoding');

    const bodyBuffer = await fetchResponse.arrayBuffer();
    const compressedSize = bodyBuffer.byteLength;
    let uncompressedSize = null;

    if (contentEncoding && compressedSize > 0) {
      try {
        let decompressedBuffer;
        if (contentEncoding.includes('gzip')) {
          decompressedBuffer = await gunzip(Buffer.from(bodyBuffer));
        } else if (contentEncoding.includes('br')) {
          decompressedBuffer = await brotliDecompress(new Uint8Array(bodyBuffer));
        } else if (contentEncoding.includes('deflate')) {
          decompressedBuffer = await inflate(Buffer.from(bodyBuffer));
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
    console.error("Fetch Error:", error);
    return response.status(500).json({ error: 'Failed to fetch the URL.', details: error.message });
  }
}
