// /api/check.js

import zlib from 'zlib';
import { promisify } from 'util';
import axios from 'axios';
// Import the robust, native C++ Brotli library
import iltorb from 'iltorb';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
// We no longer need the built-in brotliDecompress

export default async function handler(request, response) {
  // Your CORS headers are perfect.
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
  } catch (e) { // Added 'e' to the catch for clarity
    return response.status(400).json({ error: 'Invalid URL provided.' });
  }

  try {
    const axiosResponse = await axios.get(targetUrl, {
      headers: {
        // Using a more common User-Agent to avoid basic bot detection
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      responseType: 'arraybuffer',
      timeout: 15000,
    });

    const finalUrl = axiosResponse.request.res.responseUrl || axiosResponse.config.url;
    const headers = axiosResponse.headers;
    const contentEncoding = headers['content-encoding'];
    const bodyBuffer = axiosResponse.data;
    const compressedSize = bodyBuffer.byteLength;

    let uncompressedSize = null;

    if (contentEncoding && compressedSize > 0) {
      try {
        let decompressedBuffer;
        if (contentEncoding.includes('gzip')) {
          decompressedBuffer = await gunzip(bodyBuffer);
        } else if (contentEncoding.includes('br')) {
          // --- THE FINAL CRITICAL FIX ---
          // Use the robust 'iltorb' library instead of the built-in one
          decompressedBuffer = await iltorb.decompress(bodyBuffer);
        } else if (contentEncoding.includes('deflate')) {
          decompressedBuffer = await inflate(bodyBuffer);
        }
        if (decompressedBuffer) {
          uncompressedSize = decompressedBuffer.byteLength;
        }
      } catch (e) {
        console.error(`Decompression failed:`, e.message);
        uncompressedSize = null;
      }
    } else if (compressedSize > 0) {
      uncompressedSize = compressedSize;
    }

    return response.status(200).json({
      url: finalUrl,
      status: axiosResponse.status,
      isCompressed: !!contentEncoding,
      compressionType: contentEncoding || 'None',
      compressedSize,
      uncompressedSize,
      headers,
    });
  } catch (error) {
    // Your error handling here is excellent and will prevent crashes.
    if (error.response) {
      let msg = `The server responded with ${error.response.status}.`;
      if (error.response.status === 403) {
        msg = 'Access Denied (403 Forbidden). This site may be protected by a security service.';
      }
      return response.status(400).json({ error: 'Failed to access the page.', details: msg });
    } else if (error.request) {
      return response.status(500).json({ error: 'Network Error', details: 'Could not reach the server.' });
    } else {
      return response.status(500).json({ error: 'Unexpected Error', details: error.message });
    }
  }
}
