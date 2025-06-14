// api/check.js
import axios from 'axios';
import { brotliDecompress, gunzip, inflate } from 'zlib/promises';

export default async function handler(req, res) {
  console.log('📥 Function invoked');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const urlParam = req.query.url;
  console.log('URL param:', urlParam);
  if (!urlParam) {
    console.log('❌ No URL parameter');
    return res.status(400).json({ error: 'URL is required' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(urlParam.startsWith('http') ? urlParam : `http://${urlParam}`).toString();
    console.log('Resolved target URL:', targetUrl);
  } catch (e) {
    console.error('❌ Invalid URL', e.message);
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: { 'Accept-Encoding': 'gzip, deflate, br', 'User-Agent': 'Compression-Checker' },
      responseType: 'arraybuffer',
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: null
    });
    console.log('✅ Axios fetch successful, status:', response.status);

    // Decompression logic
    const encoding = response.headers['content-encoding'] || '';
    const compressedSize = response.data.byteLength;
    console.log('Content-Encoding:', encoding, 'Compressed size:', compressedSize);

    let uncompressedSize = null;
    try {
      let buffer;
      if (encoding.includes('br')) buffer = await brotliDecompress(response.data);
      else if (encoding.includes('gzip')) buffer = await gunzip(response.data);
      else if (encoding.includes('deflate')) buffer = await inflate(response.data);
      if (buffer) uncompressedSize = buffer.byteLength;
      console.log('Uncompressed size:', uncompressedSize);
    } catch (e) {
      console.error('⚠️ Decompression error:', e.message);
    }

    return res.status(200).json({
      url: response.request.res.responseUrl,
      status: response.status,
      isCompressed: !!encoding,
      compressionType: encoding || 'None',
      compressedSize,
      uncompressedSize,
      headers: response.headers
    });

  } catch (err) {
    console.error('🔥 Top-level error:', err.code || err.message);
    const code = err.code === 'ECONNABORTED' ? 408 : 500;
    return res.status(code).json({ error: 'Fetch failed', details: err.message });
  }
}
