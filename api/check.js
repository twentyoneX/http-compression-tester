// /api/check.js

import zlib from 'zlib';
import { promisify } from 'util';
import iltorb from 'iltorb';
import axios from 'axios';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);

export default async function handler(request, response) {
  // Set CORS Headers first, ensuring they are always sent
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
    const axiosResponse = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Blogspot-HTTP-Compression-Tester/1.0',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      responseType: 'arraybuffer',
      // Add a generous timeout to prevent hangs
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
          decompressedBuffer = await iltorb.decompress(bodyBuffer);
        } else if (contentEncoding.includes('deflate')) {
          decompressedBuffer = await inflate(bodyBuffer);
        }
        if (decompressedBuffer) { uncompressedSize = decompressedBuffer.byteLength; }
      } catch (decompressionError) {
        console.error(`Decompression failed for ${contentEncoding}:`, decompressionError.message);
        uncompressedSize = null;
      }
    } else if (compressedSize > 0) {
      uncompressedSize = compressedSize;
    }

    const result = {
      url: finalUrl,
      status: axiosResponse.status,
      isCompressed: !!contentEncoding,
      compressionType: contentEncoding || 'None',
      compressedSize: compressedSize,
      uncompressedSize: uncompressedSize,
      headers: headers,
    };

    return response.status(200).json(result);

  } catch (error) {
    // ===================================================================
    // THE DEFINITIVE FIX: Robust error handling for blocked requests
    // ===================================================================
    if (error.response) {
      // The server responded with an error status (e.g., 403, 404, 500)
      console.error("Axios Error Response:", error.response.status);
      if (error.response.status === 403) {
         // Specifically handle "Forbidden" errors from security services
         return response.status(403).json({ 
           error: 'Access Denied (403 Forbidden)', 
           details: 'The website is protected by a security service (like Cloudflare) that is blocking automated tools. This is not an error with our tool.' 
         });
      }
      // Handle other server errors
      return response.status(error.response.status).json({ 
        error: `Server Error (${error.response.status})`, 
        details: 'The server responded with an error.'
      });
    } else if (error.request) {
      // The request was made but no response was received (e.g., timeout)
      console.error("Axios No Response Error:", error.message);
      return response.status(500).json({ 
        error: 'Network Error', 
        details: 'Could not connect to the server. The site may be offline or unreachable.' 
      });
    } else {
      // Something else went wrong
      console.error("General Error:", error.message);
      return response.status(500).json({ 
        error: 'An Unexpected Error Occurred', 
        details: error.message 
      });
    }
  }
}
