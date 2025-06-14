import axios from 'axios';
import { brotliDecompress, gunzip, inflate } from 'zlib/promises';

export default async function handler(req, res) {
  // ✅ Always set CORS headers FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(url.startsWith('http') ? url : `http://${url}`).toString();
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    const axiosResponse = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Compression-Checker/1.0',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: 10000,
      responseType: 'arraybuffer',
      maxRedirects: 5,
      validateStatus: null
    });

    const encoding = axiosResponse.headers['content-encoding'] || '';
    const compressedSize = axiosResponse.data.length;
    let uncompressedSize = null;

    try {
      let buffer;
      if (encoding.includes('br')) buffer = await brotliDecompress(axiosResponse.data);
      else if (encoding.includes('gzip')) buffer = await gunzip(axiosResponse.data);
      else if (encoding.includes('deflate')) buffer = await inflate(axiosResponse.data);
      if (buffer) uncompressedSize = buffer.length;
    } catch (err) {
      console.warn('Decompression failed:', err.message);
    }

    return res.status(200).json({
      url: axiosResponse.request.res.responseUrl || targetUrl,
      status: axiosResponse.status,
      isCompressed: !!encoding,
      compressionType: encoding || 'None',
      compressedSize,
      uncompressedSize,
      headers: axiosResponse.headers
    });

  } catch (err) {
    console.error('Request failed:', err.code || err.message);
    return res.status(500).json({
      error: 'Fetch failed',
      details: err.message || 'Unknown error',
    });
  }
}
