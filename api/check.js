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
        details: `HTTP ${fetchResponse.status}`,
      });
    }

    const finalUrl = fetchResponse.url;
    const headers = fetchResponse.headers;
    const encoding = headers.get('content-encoding') || '';
    const buffer = Buffer.from(await fetchResponse.arrayBuffer());
    const compressedSize = buffer.byteLength;

    let uncompressedSize = null;
    let savingsPercent = null;
    let decompressionNote = null;

    try {
      let decompressed;

      if (encoding.includes('gzip')) {
        decompressed = await gunzip(buffer);
      } else if (encoding.includes('br')) {
        decompressed = await brotliDecompress(buffer);
      } else if (encoding.includes('deflate')) {
        decompressed = await inflate(buffer);
      }

      if (decompressed) {
        uncompressedSize = decompressed.byteLength;
        savingsPercent = Number(((1 - compressedSize / uncompressedSize) * 100).toFixed(2));
      } else {
        decompressionNote = 'Content-Encoding provided but could not decompress.';
      }

    } catch (err) {
      console.warn(`Decompression error (${encoding}):`, err.message);
      decompressionNote = `Decompression failed (${encoding}): ${err.message}`;
    }

    if (!uncompressedSize) {
      uncompressedSize = compressedSize;
      savingsPercent = 0;
    }

    return response.status(200).json({
      url: finalUrl,
      status: fetchResponse.status,
      isCompressed: !!encoding,
      compressionType: encoding || 'None',
      compressedSize,
      uncompressedSize,
      savingsPercent,
      headers: Object.fromEntries(headers.entries()),
      decompressionNote,
    });

  } catch (err) {
    if (err.name === 'AbortError') {
      return response.status(500).json({ error: 'Request Timeout' });
    }
    return response.status(500).json({
      error: 'Network error',
      details: err.message,
    });
  }
}
