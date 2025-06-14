// /api/check.js

import axios from 'axios';
import { brotliDecompress, gunzip, inflate } from 'zlib/promises';

export default async function handler(req, res) {
  console.log('▶️ Handler started');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const urlParam = req.query.url;
  console.log('URL param:', urlParam);
  if (!urlParam) {
    return res.status(400).json({ error: 'URL parameter is required.' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(urlParam.startsWith('http') ? urlParam : `http://${urlParam}`).toString();
    console.log('Resolved URL:', targetUrl);
  } catch (err) {
    console.error('Invalid URL:', err.message);
    return res.status(400).json({ error: 'Invalid URL provided.' });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Compression-Checker'
      },
      timeout: 10000,
      responseType: 'arraybuffer',
      maxRedirects: 5,
      validateStatus: null
    });
    console.log('Fetched, status:', response.status);

    const encoding = response.headers['content-encoding'] || '';
    const compressedSize = response.data.byteLength;
    let uncompressedSize = null;

    try {
      let buffer;
      if (encoding.includes('br')) buffer = await brotliDecompress(response.data);
      else if (encoding.includes('gzip')) buffer = await gunzip(response.data);
      else if (encoding.includes('deflate')) buffer = await inflate(response.data);

      if (buffer) uncompressedSize = buffer.byteLength;
      console.log('Decompressed size:', uncompressedSize);
    } catch (e) {
      console.warn('Decompression failed:', e.message);
    }

    return res.status(200).json({
      url: response.request.res.responseUrl || targetUrl,
      status: response.status,
      isCompressed: !!encoding,
      compressionType: encoding || 'None',
      compressedSize,
      uncompressedSize,
      headers: response.headers
    });

  } catch (err) {
    console.error('Error during fetch:', err.code || err.message);
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Timeout', details: 'Server took too long to respond.' });
    }
    return res.status(500).json({ error: 'Fetch failed', details: err.message });
  }
}
