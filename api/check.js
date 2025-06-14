// /api/check.js

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
    const axiosResponse = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Compression-Checker',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const contentEncoding = axiosResponse.headers['content-encoding'] || '';
    const compressedBuffer = axiosResponse.data;
    const compressedSize = compressedBuffer.byteLength;
    let uncompressedSize = null;

    let uncompressedBuffer;

    try {
      if (contentEncoding.includes('br')) {
        uncompressedBuffer = await brotliDecompress(compressedBuffer);
      } else if (contentEncoding.includes('gzip')) {
        uncompressedBuffer = await gunzip(compressedBuffer);
      } else if (contentEncoding.includes('deflate')) {
        uncompressedBuffer = await inflate(compressedBuffer);
      }
    } catch (e) {
      console.warn(`Failed to decompress: ${e.message}`);
    }

    if (uncompressedBuffer) {
      uncompressedSize = uncompressedBuffer.byteLength;
    } else {
      uncompressedSize = compressedSize;
    }

    const isCompressed = !!contentEncoding && compressedSize < uncompressedSize;

    return res.status(200).json({
      url: axiosResponse.request.res.responseUrl || targetUrl,
      status: axiosResponse.status,
      isCompressed,
      compressionType: contentEncoding || 'None',
      compressedSize,
      uncompressedSize,
      headers: axiosResponse.headers
    });
  } catch (err) {
    console.error('Request failed:', err.message);
    return res.status(500).json({ error: 'Failed to check compression', details: err.m
