// api/check.js

import zlib from 'zlib';
import { promisify } from 'util';
import axios from 'axios';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

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
  } catch {
    return response.status(400).json({ error: 'Invalid URL provided.' });
  }

  try {
    const axiosResponse = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
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
          decompressedBuffer = await brotliDecompress(bodyBuffer);
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
    if (error.response) {
      let msg = `The server responded with ${error.response.status}`;
      if (error.response.status === 403) {
        msg = 'Access Denied (403 Forbidden). This site may be protected.';
      }
      return response.status(400).json({ error: 'Failed to access the page.', details: msg });
    } else if (error.request) {
      return response.status(500).json({ error: 'Network Error', details: 'Could not reach the server.' });
    } else {
      return response.status(500).json({ error: 'Unexpected Error', details: error.message });
    }
  }
}
