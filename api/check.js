// /api/check.js

import zlib from 'zlib';
import { promisify } from 'util';
import iltorb from 'iltorb';
import axios from 'axios';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);

export default async function handler(request, response) {
  // Always set CORS headers first to guarantee they are always sent.
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
        'User-Agent': 'Blogspot-HTTP-Compression-Tester/1.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
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
    // This bulletproof error handling prevents the function from crashing.
    if (error.response) {
      console.error("Axios Error Response:", error.response.status);
      let errorDetail = `The server responded with an error: ${error.response.status}.`;
      if (error.response.status === 403) {
         errorDetail = 'Access Denied (403 Forbidden). The website is likely protected by a security service (like Cloudflare) that is blocking our tool.';
      }
      return response.status(400).json({ error: 'Failed to access the page.', details: errorDetail });
    } else if (error.request) {
      console.error("Axios No Response Error:", error.message);
      return response.status(500).json({ error: 'Network Error', details: 'Could not connect to the server. The site may be offline or unreachable.' });
    } else {
      console.error("General Error:", error.message);
      return response.status(500).json({ error: 'An Unexpected Error Occurred', details: error.message });
    }
  }
}
