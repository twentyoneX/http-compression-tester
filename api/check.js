// api/check.js
import zlib from 'zlib';
import { promisify } from 'util';
import axios from 'axios';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL parameter is required.' });

  let targetUrl;
  try {
    targetUrl = new URL(url.startsWith('http') ? url : `http://${url}`).toString();
  } catch {
    return res.status(400).json({ error: 'Invalid URL provided.' });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Encoding': 'br, gzip, deflate',
      },
      responseType: 'arraybuffer',
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: null,
    });

    const headers = response.headers;
    const contentEncoding = headers['content-encoding'] || '';
    const compressedSize = response.data.byteLength;

    let uncompressedBuffer;
    try {
      if (contentEncoding.includes('br')) {
        uncompressedBuffer = await brotliDecompress(response.data);
      } else if (contentEncoding.includes('gzip')) {
        uncompressedBuffer = await gunzip(response.data);
      } else if (contentEncoding.includes('deflate')) {
        uncompressedBuffer = await inflate(response.data);
      }
    } catch (e) {
      // Ignore decompression errors for now
      console.warn("Decompression error:", e.message);
    }

    const uncompressedSize = uncompressedBuffer ? uncompressedBuffer.byteLength : compressedSize;

    const isCompressed = !!contentEncoding && compressedSize < uncompressedSize;

    return res.status(200).json({
      url: response.request.res.responseUrl || targetUrl,
      status: response.status,
      isCompressed,
      compressionType: contentEncoding || 'None',
      compressedSize,
      uncompressedSize,
      headers,
    });
  } catch (err) {
    console.error("Fetch error:", err.message);
    return res.status(500).json({ error: 'Failed to fetch and analyze content.', details: err.message });
  }
}
