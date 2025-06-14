// /api/check.js

import { gunzip, brotliDecompress, inflate } from 'zlib/promises';
import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required.' });
    }

    const targetUrl = new URL(url.startsWith('http') ? url : `http://${url}`).toString();

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: 10000,
      responseType: 'arraybuffer',
      maxRedirects: 5,
      validateStatus: null,
    });

    const headers = response.headers;
    const contentEncoding = headers['content-encoding'];
    const compressedSize = response.data.byteLength;
    let uncompressedSize = null;

    try {
      let decompressed;
      if (contentEncoding?.includes('br')) {
        decompressed = await brotliDecompress(response.data);
      } else if (contentEncoding?.includes('gzip')) {
        decompressed = await gunzip(response.data);
      } else if (contentEncoding?.includes('deflate')) {
        decompressed = await inflate(response.data);
      }
      if (decompressed) uncompressedSize = decompressed.length;
    } catch (e) {
      console.error('Decompression failed:', e.message);
    }

    res.status(200).json({
      url: response.request.res.responseUrl || response.config.url,
      status: response.status,
      isCompressed: !!contentEncoding,
      compressionType: contentEncoding || 'None',
      compressedSize,
      uncompressedSize: uncompressedSize ?? null,
      headers,
    });

  } catch (err) {
    console.error('Fetch error:', err.message);
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Timeout', details: 'Request took too long.' });
    } else if (err.response) {
      return res.status(400).json({ error: 'HTTP Error', details: err.response.statusText });
    } else {
      return res.status(500).json({ error: 'Unknown Error', details: err.message });
    }
  }
}
