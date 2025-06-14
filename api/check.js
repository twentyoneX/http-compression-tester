// /api/check.js

import zlib from 'zlib';
import { promisify } from 'util';
import iltorb from 'iltorb';
import axios from 'axios';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);

export default async function handler(request, response) {
  // Set CORS Headers first, ensuring they are always sent
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle pre-flight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { url } = request.query;
  if (!url) {
    return response.status(400).json({ error: 'URL parameter is required.' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(url.startsWith('http') ? url : `http://${url}`).toString();
  } catch (e) {
    return response.status(4odules/axios/lib/core/Axios.js:46)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async handler (file:///var/task/api/check.js:40:25) {
  code: 'ECONNRESET',
  path: null,
  host: 'fashionmag.us',
  port: 443,
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [Function: httpAdapter],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 15000,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'Blogspot-HTTP-Compression-Tester/1.0',
      'Accept-Encoding': 'gzip, deflate, br'
    },
    method: 'get',
    url: 'https://fashionmag.us/',
    responseType: 'arraybuffer'
  }
}
[22:04:19.497] 
[22:04:19.497] Decompression failed for br:
[22:04:19.497]  Brotli decompress failed
[22:04:19.497] 
[22:04:19.497] Fetch Error:
[22:04:19.498]  Request failed with status code 403
[22:04:19.498] 
[22:04:19.499] Axios Error Response:
[22:04:19.499]  403
[22:04:19.500]  <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endif]-->
<!--[if IE 8]>    <html class="no-js ie8 oldie" lang="en-US"> <![endif]-->
<!--[if gt IE 8]><!--> <html class="no-js" lang="en-US"> <!--<![endif]-->
<head>
<title>Attention Required! | Cloudflare</title>
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=Edge" />
<meta name="robots" content="noindex, nofollow" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="stylesheet" id="cf_styles-css" href="/cdn-cgi/styles/cf.errors.css" />
<!--[if lt IE 9]><link rel="stylesheet" id='cf_styles-ie-css' href="/cdn-cgi/styles/cf.errors.ie.css" /><![endif]-->
<style>body{margin:0;padding:0}</style>


<!--[if gte IE 10]><!-->
<script>
  if (!navigator.cookieEnabled) {
    window.addEventListener('DOMContentLoaded', function () {
      var cookieEl = document.getElementById('cookie-alert');
      cookieEl.style.display = 'block';
    })
  }
</script>
<!--<![endif]-->

</head>
<body>
  <div id="cf-wrapper">
    <div id="cf-error-details" class="cf-error-details-wrapper">
      <div class="cf-section cf-header cf-wrapper">
        <div class="cf-columns two">
          <div class="cf-column">
            <h1 class="cf-text-error">Attention Required!</h1>
          </div>
        </div>
      </div><!-- .section -->

      <div class="cf-section cf-wrapper">
        <div class="cf-columns two">
          <div class="cf-column">
            <h2 data-translate="enable_javascript_and_cookies">Please enable cookies.</h2>
            <p data-translate="enable_javascript_and_cookies_desc">This website is using a security service to protect itself from online attacks.</p>
            <p data-translate="how_to_enable_javascript_and_cookies_desc">You need to enable cookies to view this website.</p>
          </div>
        </div>
      </div><!-- .section -->

      <div class="cf-error-footer cf-wrapper w-240 lg:w-full py-10 sm:py-4 sm:px-8 mx-auto text-center sm:text-left border-solid border-0 border-t border-gray-300">
  <p class="text-13">
    <span class="cf-footer-item sm:block sm:mb-1">Cloudflare Ray ID: <span class="font-semibold">893b8f13bb1b8e97</span></span>
    <span class="cf-footer-item sm:block sm:mb-1"><span>•</span></span>
    <span class="cf-footer-item sm:block sm:mb-1"><span>Your IP:</span> 2a02:c7c:270f:3000:a16b:1742:cc2e:65a6</span>
    <span class="cf-footer-item sm:block sm:mb-1"><span>•</span></span>
    <span class="cf-footer-item sm:block sm:mb-1"><span data-translate="performance_security_by">Performance & security by</span> <a data-orig-proto="https" data-orig-ref="www.cloudflare.com/5xx-error-landing" id="brand_link" href="https://www.cloudflare.com/5xx-error-landing" target="_blank">Cloudflare</a></span>
    
  </p>
</div><!-- .error-footer -->


    </div><!-- /#cf-error-details -->
  </div><!-- /#cf-wrapper -->

  <script>
    window._cf_translation = {};
    
    
  </script>

</body>
</html>
