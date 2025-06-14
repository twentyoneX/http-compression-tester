// /api/check.js

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
    } catch {
      return response.status(400).json({ error: 'Invalid URL provided.' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const fetchResponse = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
      return response.status(400).json({
        error: 'Failed to access the page.',
        details: `The server responded with status: ${fetchResponse.status}.`,
      });
    }

    const headers = fetchResponse.headers;
    const contentEncoding = headers.get('content-encoding');
    const contentLengthHeader = headers.get('content-length');
    const finalUrl = fetchResponse.url;

    const bodyBuffer = Buffer.from(await fetchResponse.arrayBuffer());
    let compressedSize = bodyBuffer.byteLength;
    if (contentLengthHeader && !isNaN(contentLengthHeader)) {
      const parsedLength = parseInt(contentLengthHeader, 10);
      if (parsedLength > 0 && parsedLength < compressedSize) {
        compressedSize = parsedLength;
      }
    }

    let uncompressedSize = null;
    let decompressionSuccess = false;

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
          decompressionSuccess = true;
        }
      } catch (err) {
        console.error(`Decompression failed (${contentEncoding}):`, err.message);
        uncompressedSize = compressedSize;
      }
    } else {
      uncompressedSize = compressedSize;
    }

    const savingsPercent =
      uncompressedSize && uncompressedSize > compressedSize
        ? Number(((1 - compressedSize / uncompressedSize) * 100).toFixed(1))
        : 0.0;

    const result = {
      url: finalUrl,
      status: fetchResponse.status,
      isCompressed: !!contentEncoding,
      compressionType: contentEncoding || 'None',
      compressedSize,
      uncompressedSize,
      savingsPercent,
      decompressionSuccess,
      headers: Object.fromEntries(headers.entries()),
    };

    return response.status(200).json(result);
  } catch (error) {
    if (error.name === 'AbortError') {
      return response.status(500).json({ error: 'Request Timeout', details: 'The server took too long to respond.' });
    }

    return response.status(500).json({
      error: 'A critical network error occurred.',
      details: `Could not reach the server. (Error: ${error.cause?.code || error.message})`,
    });
  }
}
