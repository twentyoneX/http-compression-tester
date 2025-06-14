import axios from 'axios';
import { brotliDecompress, gunzip, inflate } from 'zlib/promises';

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const urlParam = req.query.url;
  if (!urlParam) return res.status(400).json({ error: 'URL is required' });

  let targetUrl;
  try {
    targetUrl = new URL(urlParam.startsWith('http') ? urlParam : `http://${urlParam}`).toString();
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Compression-Checker'
      },
      responseType: 'arraybuffer',
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: null
    });

    const encoding = response.headers['content-encoding'] || '';
    const compressedSize = response.data.byteLength;
    let uncompressedSize = null;

    try {
      let buffer;
      if (encoding.includes('br')) {
        buffer = await brotliDecompress(response.data);
      } else if (encoding.includes('gzip')) {
        buffer = await gunzip(response.data);
      } else if (encoding.includes('deflate')) {
        buffer = await inflate(response.data);
      }
      if (buffer) uncompressedSize = buffer.byteLength;
    } catch (err) {
      console.warn('Decompression error:', err.message);
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

  } catch (error) {
    console.error('Fetch error:', error.message);
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Timeout', details: 'Server took too long' });
    }
    return res.status(500).json({ error: 'Fetch failed', details: error.message });
  }
}
