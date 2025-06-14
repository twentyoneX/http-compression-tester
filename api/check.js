// /api/check.js

// Using ONLY built-in Node.js modules for maximum stability.
import zlib from 'zlib';
import { promisify } from 'util';

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
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const fetchResponse = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
      let errorDetail = `The server responded with status: ${fetchResponse.status}.`;
      if (fetchResponse.status === 403) {
        errorDetail = 'Access Denied (403 Forbidden). The website may be protected by a firewall or CDN.';
      }
      return response.status(400).json({ error: 'Failed to access the page.', details: errorDetail });
    }

    const finalUrl = fetchResponse.url;
    const headers = fetchResponse.headers;
    const contentEncoding = headers.get('content-encoding') || '';
    const bodyBuffer = Buffer.from(await fetchResponse.arrayBuffer());
    const compressedSize = bodyBuffer.byteLength;

    let uncompressedSize = null;
    let savingsPercent = null;
    let decompressionNote = null;
    let decompressionSuccess = false;

    try {
      let decompressedBuffer;

      if (contentEncoding.includes('gzip')) {
        decompressedBuffer = await gunzip(bodyBuffer);
      } else if (contentEncoding.includes('br')) {
        decompressedBuffer = await brotliDecompress(bodyBuffer);
      } else if (contentEncoding.includes('deflate')) {
        decompressedBuffer = await inflate(bodyBuffer);
      }

      if (decompressedBuffer && decompressedBuffer.byteLength > 0) {
        uncompressedSize = decompressedBuffer.byteLength;
        decompressionSuccess = true;
        savingsPercent = Number(((1 - compressedSize / uncompressedSize) * 100).toFixed(2));
      } else {
        decompressionNote = 'Decompressed buffer is empty or undefined.';
      }

    } catch (err) {
      decompressionNote = `Failed to decompress using ${contentEncoding}: ${err.message}`;
    }

    if (!uncompressedSize) {
      uncompressedSize = compressedSize;
      savingsPercent = 0;
    }

    return response.status(200).json({
      url: finalUrl,
      status: fetchResponse.status,
      isCompressed: !!contentEncoding,
      compressionType: contentEncoding || 'None',
      compressedSize,
      uncompressedSize,
      savingsPercent,
      decompressionSuccess,
      decompressionNote,
      headers: Object.fromEntries(headers.entries()),
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      return response.status(500).json({
        error: 'Request Timeout',
        details: 'The server took too long to respond.',
      });
    }

    return response.status(500).json({
      error: 'A critical network error occurred.',
      details: `Could not reach the server. This may be a DNS issue or the server is offline. (Error: ${error.cause ? error.cause.code : error.message})`,
    });
  }
}
