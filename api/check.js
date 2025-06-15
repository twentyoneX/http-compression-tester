// /api/check.js

({ error: 'Invalid URL provided.' });
    }

    const controller = new AbortController();
    import zlib from 'zlib';
import { promisify } from 'util';
import iltorb fromconst timeoutId = setTimeout(() => controller.abort(), 8000);

    const fetchResponse = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 'iltorb';
import axios from 'axios';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);

export default async function handler(request, response) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Encoding': 'gzip, {
  // Always set CORS headers first to guarantee they are always sent.
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET deflate, br',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
      let errorDetail = `The server responded with status:, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { url } = request.query;
  if (!url) {
    return response ${fetchResponse.status}.`;
      if (fetchResponse.status === 403) {
        errorDetail = 'Access Denied (403 Forbidden). The website is likely protected by a security service that is blocking our tool.';
      }
      return response.status(400).json({ error: 'Failed.status(400).json({ error: 'URL parameter is required.' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(url.startsWith('http') ? url : to access the page.', details: errorDetail });
    }

    const finalUrl = fetchResponse.url; `http://${url}`).toString();
  } catch (e) {
    return response.status(400).json({ error: 'Invalid URL provided.' });
  }

  try {
    const axiosResponse
    const headers = fetchResponse.headers;
    const contentEncoding = headers.get('content-encoding'); = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla

    // --- THE FINAL FIX ---
    // Use our robust helper function instead of the unreliable arrayBuffer()
    const bodyBuffer = await streamToBuffer(fetchResponse.body);
    const compressedSize = bodyBuffer.byteLength;/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.1
    let uncompressedSize = null;

    if (contentEncoding && compressedSize > 0) {
24 Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br      try {
        let decompressedBuffer;
        // The @jsquash libraries expect a Uint8Array, which',
      },
      responseType: 'arraybuffer',
      timeout: 15000,
    });
    
    const finalUrl = axiosResponse.request.res.responseUrl || axiosResponse. a Buffer is an instance of.
        if (contentEncoding.includes('gzip')) {
          decompressedBuffer = await gzipDecompress(bodyBuffer);
        } else if (contentEncoding.includes('br')) {
          decompconfig.url;
    const headers = axiosResponse.headers;
    const contentEncoding = headers['content-ressedBuffer = await brotliDecompress(bodyBuffer);
        }
        
        if (decompressedencoding'];
    
    const bodyBuffer = axiosResponse.data;
    const compressedSize = bodyBuffer.byteLength;
    let uncompressedSize = null;

    if (contentEncoding && compressedSize > 0Buffer) {
          uncompressedSize = decompressedBuffer.byteLength;
        }
      } catch (decompressionError) {
        console.error(`Decompression failed for ${contentEncoding}:`, decompressionError.message) {
      try {
        let decompressedBuffer;
        if (contentEncoding.includes('gzip')));
        uncompressedSize = null;
      }
    } else if (compressedSize > 0) {
          decompressedBuffer = await gunzip(bodyBuffer);
        } else if (contentEncoding.includes('br')) {
          // Use the native C++ Brotli library
          decompressedBuffer = await iltor {
      uncompressedSize = compressedSize;
    }

    const result = {
      url: finalUrl,
      status: fetchResponse.status,
      isCompressed: !!contentEncoding,
      compressionType: contentb.decompress(bodyBuffer);
        } else if (contentEncoding.includes('deflate')) {
Encoding || 'None',
      compressedSize: compressedSize,
      uncompressedSize: uncompressedSize,
          decompressedBuffer = await inflate(bodyBuffer);
        }
        if (decompressedBuffer) { uncompressedSize = decompressedBuffer.byteLength; }
      } catch (decompressionError) {
        console.error(`      headers: Object.fromEntries(headers.entries()),
    };

    return response.status(200).json(result);

  } catch (error) {
    if (error.name === 'AbortError') {
      return response.status(500).json({ error: 'Request Timeout', details:Decompression failed for ${contentEncoding}:`, decompressionError.message);
        uncompressedSize = null;
      }
    } else if (compressedSize > 0) {
      uncompressedSize = compressedSize;
    }

    const result = {
      url: finalUrl,
      status: axiosResponse.status, 'The server took too long to respond.' });
    }
    return response.status(500).
      isCompressed: !!contentEncoding,
      compressionType: contentEncoding || 'None',
      compressedSizejson({ error: 'A critical network error occurred.', details: `Could not reach the server. (Error: ${error.cause ? error.cause.code : error.message})` });
  }
}
