import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import axios from "axios";
import * as cheerio from "cheerio";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (AppleWebKit/537.36; Chrome/122.0.0.0; Safari/537.36; Edge/122.0.0.0)"
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cookieParser());

  // Leaked Request Recovery Middleware
  app.use((req, res, next) => {
    // Only skip internal API and Vite-specific paths
    if (req.path.startsWith('/api/proxy/') || req.path.startsWith('/@vite/client') || req.path.startsWith('/@react-refresh')) {
      return next();
    }

    const referer = req.headers.referer;
    if (referer && referer.includes('/api/proxy/')) {
      try {
        const parts = referer.split('/api/proxy/');
        const baseProxyUrl = parts[parts.length - 1];
        const baseUrl = new URL(baseProxyUrl);
        const targetUrl = new URL(req.url, baseUrl.origin).href;
        return res.redirect(`/api/proxy/${targetUrl}`);
      } catch (e) {}
    }
    next();
  });

  // Proxy endpoint - Robust path-based proxying with cookie handling
  app.all("/api/proxy/:targetUrl(*)", express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
    let targetUrl = req.params.targetUrl;
    
    // Handle query parameters
    const urlParts = req.url.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    
    if (queryString) {
      targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryString;
    }

    if (!targetUrl) {
      targetUrl = req.query.url as string;
    }

    if (!targetUrl) {
      return res.status(400).send("URL is required");
    }

    // Fix protocol if collapsed
    if (targetUrl.startsWith("http:/") && !targetUrl.startsWith("http://")) {
      targetUrl = targetUrl.replace("http:/", "http://");
    } else if (targetUrl.startsWith("https:/") && !targetUrl.startsWith("https://")) {
      targetUrl = targetUrl.replace("https:/", "https://");
    }

    // Default to DuckDuckGo search if not a URL
    if (!targetUrl.includes(".") || targetUrl.includes(" ")) {
      targetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(targetUrl)}`;
    } else if (!targetUrl.startsWith("http")) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      const host = req.get('host');
      const protocol = req.protocol;
      const appUrl = process.env.APP_URL || `${protocol}://${host}`;
      const proxyUrlBase = `${appUrl}/api/proxy/`;
      const targetUrlObj = new URL(targetUrl);

      const headers: Record<string, any> = {
        "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        "Accept": req.headers["accept"] || "*/*",
        "Accept-Language": req.headers["accept-language"] || "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Host": targetUrlObj.host,
      };

      // Forward cookies from the client
      if (req.headers.cookie) {
        headers["Cookie"] = req.headers.cookie;
      }

      // Handle Referer and Origin
      const clientReferer = req.headers['referer'];
      if (clientReferer && clientReferer.includes('/api/proxy/')) {
        try {
          const parts = clientReferer.split('/api/proxy/');
          const refererUrl = parts[parts.length - 1];
          headers['Referer'] = refererUrl;
          if (!req.headers['origin']) {
            const refObj = new URL(refererUrl);
            headers['Origin'] = refObj.origin;
          }
        } catch (e) {}
      }

      if (req.headers['origin']) {
        headers['Origin'] = req.headers['origin'];
      }

      // Forward other relevant headers
      const forwardHeaders = ['content-type', 'authorization', 'x-requested-with'];
      forwardHeaders.forEach(h => {
        if (req.headers[h]) headers[h] = req.headers[h];
      });

      const axiosOptions: any = {
        method: req.method,
        url: targetUrl,
        headers: headers,
        data: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
        validateStatus: () => true,
        maxRedirects: 0, // Handle redirects manually
        responseType: 'arraybuffer',
        decompress: true,
        timeout: 30000
      };

      let response = await axios(axiosOptions);

      if (response.status >= 300 && response.status < 400 && response.headers.location) {
        let redirectUrl = response.headers.location;
        if (!redirectUrl.startsWith("http")) {
          redirectUrl = new URL(redirectUrl, targetUrl).toString();
        }
        return res.redirect(`${proxyUrlBase}${redirectUrl}`);
      }

      const contentType = response.headers["content-type"] || "";
      
      Object.entries(response.headers).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'set-cookie' && value) {
          const cookies = Array.isArray(value) ? value : [value];
          cookies.forEach(cookie => res.append('Set-Cookie', cookie));
        } else if (![
          "content-security-policy", "content-security-policy-report-only",
          "x-frame-options", "x-content-type-options", "x-xss-protection",
          "strict-transport-security", "content-encoding", "content-length",
          "transfer-encoding", "report-to", "nel", "permissions-policy",
          "referrer-policy", "access-control-allow-origin"
        ].includes(lowerKey)) {
          res.setHeader(key, value as string);
        }
      });

      res.setHeader("Access-Control-Allow-Origin", "*");

      if (contentType.includes("text/html")) {
        let html = Buffer.from(response.data).toString('utf-8');
        const $ = cheerio.load(html);
        const currentUrl = new URL(response.config.url || targetUrl);

        // Strip security meta tags, SRI, and existing base tags
        $('meta[http-equiv="content-security-policy"]').remove();
        $('meta[http-equiv="x-frame-options"]').remove();
        $('base').remove();
        $('[integrity]').removeAttr('integrity');
        $('[crossorigin]').removeAttr('crossorigin');

        // Inject proxy script
        const injectedScript = `
        (function() {
          const PROXY_BASE = "${proxyUrlBase}";
          const TARGET_ORIGIN = "${currentUrl.origin}";
          const TARGET_URL = "${currentUrl.href}";

          const proxyUrl = (url) => {
            if (!url || typeof url !== 'string') return url;
            if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:') || url.startsWith('#')) return url;
            if (url.startsWith(PROXY_BASE)) return url;
            try {
              const absolute = new URL(url, document.baseURI || TARGET_URL).href;
              return PROXY_BASE + absolute;
            } catch(e) { return url; }
          };

          // Environment Spoofing
          const originalLocation = window.location;
          const locationProxy = new Proxy({}, {
            get: (target, prop) => {
              if (prop === 'href') return TARGET_URL;
              if (prop === 'origin') return TARGET_ORIGIN;
              if (prop === 'host') return new URL(TARGET_ORIGIN).host;
              if (prop === 'hostname') return new URL(TARGET_ORIGIN).hostname;
              if (prop === 'pathname') return new URL(TARGET_URL).pathname;
              if (prop === 'search') return new URL(TARGET_URL).search;
              if (prop === 'hash') return new URL(TARGET_URL).hash;
              if (prop === 'assign' || prop === 'replace' || prop === 'reload') {
                return (...args) => {
                  if (prop === 'reload') return originalLocation.reload();
                  const newUrl = proxyUrl(args[0]);
                  return originalLocation[prop](newUrl);
                };
              }
              const val = originalLocation[prop];
              return typeof val === 'function' ? val.bind(originalLocation) : val;
            },
            set: (target, prop, value) => {
              if (prop === 'href') {
                originalLocation.href = proxyUrl(value);
                return true;
              }
              return false;
            }
          });

          Object.defineProperty(window, 'location', { get: () => locationProxy, configurable: true });
          Object.defineProperty(document, 'location', { get: () => locationProxy, configurable: true });
          Object.defineProperty(window, 'top', { get: () => window.self });
          Object.defineProperty(window, 'parent', { get: () => window.self });
          Object.defineProperty(document, 'domain', { get: () => new URL(TARGET_ORIGIN).hostname, set: () => {} });
          
          // Intercept Network
          const originalFetch = window.fetch;
          window.fetch = (input, init) => {
            if (typeof input === 'string') input = proxyUrl(input);
            else if (input instanceof Request) {
              Object.defineProperty(input, 'url', { value: proxyUrl(input.url) });
            }
            return originalFetch(input, init);
          };

          const originalXHR = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function(method, url) {
            return originalXHR.apply(this, [method, proxyUrl(url), ...Array.from(arguments).slice(2)]);
          };

          if (navigator.sendBeacon) {
            const originalBeacon = navigator.sendBeacon;
            navigator.sendBeacon = (url, data) => originalBeacon.call(navigator, proxyUrl(url), data);
          }

          // Mock Service Worker
          if (navigator.serviceWorker) {
            Object.defineProperty(navigator, 'serviceWorker', {
              get: () => ({
                register: () => Promise.reject(new Error('Service Workers disabled')),
                getRegistration: () => Promise.resolve(undefined),
                getRegistrations: () => Promise.resolve([]),
                addEventListener: () => {},
                removeEventListener: () => {},
              }),
              configurable: true
            });
          }

          // History API
          const wrapHistory = (type) => {
            const original = history[type];
            return function() {
              const args = Array.from(arguments);
              if (args[2]) args[2] = proxyUrl(args[2]);
              return original.apply(this, args);
            };
          };
          history.pushState = wrapHistory('pushState');
          history.replaceState = wrapHistory('replaceState');

          // Intercept window.open
          const originalOpen = window.open;
          window.open = (url, name, specs) => originalOpen(proxyUrl(url), name, specs);

          // MutationObserver to rewrite dynamic content
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                  const el = node;
                  if (el.tagName === 'A' || el.tagName === 'FORM') {
                    if (el.href) el.href = proxyUrl(el.href);
                    if (el.action) el.action = proxyUrl(el.action);
                  }
                  el.querySelectorAll('a, form, img, script, iframe, source, video, audio').forEach((child) => {
                    if (child.href) child.href = proxyUrl(child.href);
                    if (child.src) child.src = proxyUrl(child.src);
                    if (child.action) child.action = proxyUrl(child.action);
                    if (child.srcset) child.srcset = child.srcset.split(',').map(s => {
                      const [u, d] = s.trim().split(' ');
                      return proxyUrl(u) + (d ? ' ' + d : '');
                    }).join(', ');
                  });
                }
              });
            });
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
        })();
        `;

        $('head').prepend(`<script>${injectedScript}</script>`);
        $('head').prepend(`<base href="${proxyUrlBase}${currentUrl.origin}/">`);

        const rewriteAttr = (selector: string, attr: string) => {
          $(selector).each((_, el) => {
            const val = $(el).attr(attr);
            if (val && !val.startsWith('data:') && !val.startsWith('javascript:') && !val.startsWith('#')) {
              try {
                const absoluteUrl = new URL(val, currentUrl.href).toString();
                $(el).attr(attr, `${proxyUrlBase}${absoluteUrl}`);
              } catch (e) {}
            }
          });
        };

        ['a', 'area'].forEach(t => rewriteAttr(t, 'href'));
        ['script', 'img', 'video', 'audio', 'source', 'embed', 'iframe'].forEach(t => rewriteAttr(t, 'src'));
        rewriteAttr('link', 'href');
        rewriteAttr('form', 'action');
        rewriteAttr('img', 'data-src');
        rewriteAttr('video', 'poster');

        const rewriteSrcset = (selector: string) => {
          $(selector).each((_, el) => {
            const val = $(el).attr('srcset');
            if (val) {
              const parts = val.split(',').map(part => {
                const trimmed = part.trim();
                if (!trimmed) return part;
                const spaceIndex = trimmed.indexOf(' ');
                const url = spaceIndex === -1 ? trimmed : trimmed.substring(0, spaceIndex);
                const size = spaceIndex === -1 ? '' : trimmed.substring(spaceIndex);
                if (url && !url.startsWith('data:') && !url.startsWith('javascript:')) {
                  try {
                    const absoluteUrl = new URL(url, currentUrl.href).toString();
                    return `${proxyUrlBase}${absoluteUrl}${size}`;
                  } catch (e) {}
                }
                return part;
              });
              $(el).attr('srcset', parts.join(', '));
            }
          });
        };

        rewriteSrcset('img');
        rewriteSrcset('source');

        // Rewrite CSS in style tags
        $('style').each((_, el) => {
          let css = $(el).text();
          css = css.replace(/url\(['"]?([^'")]*)['"]?\)/gi, (match, url) => {
            if (url.startsWith('data:') || url.startsWith('http')) return match;
            try {
              return `url("${proxyUrlBase}${new URL(url, currentUrl.href).toString()}")`;
            } catch(e) { return match; }
          });
          $(el).text(css);
        });

        return res.send($.html());
      } else if (contentType.includes("text/css")) {
        let css = Buffer.from(response.data).toString('utf-8');
        css = css.replace(/url\(['"]?([^'")]*)['"]?\)/gi, (match, url) => {
          if (url.startsWith('data:') || url.startsWith('http')) return match;
          try {
            return `url("${proxyUrlBase}${new URL(url, targetUrl).toString()}")`;
          } catch(e) { return match; }
        });
        return res.send(css);
      }

      return res.send(response.data);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send(`Proxy Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Legacy endpoint
  app.get("/api/proxy", (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("URL is required");
    res.redirect(`/api/proxy/${targetUrl}`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      // Only serve index.html for HTML requests to avoid breaking proxied assets
      if (req.headers.accept && !req.headers.accept.includes("text/html")) {
        return next();
      }
      
      const url = req.originalUrl;
      try {
        let template = await fs.readFile(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // Only serve index.html for HTML requests to avoid breaking proxied assets
      if (req.headers.accept && !req.headers.accept.includes("text/html")) {
        return res.status(404).send("Not Found");
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
