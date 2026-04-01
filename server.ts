import express from "express";
import { createServer as createViteServer } from "vite";
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

  // Proxy endpoint - Robust path-based proxying with cookie handling
  app.all("/api/proxy/:targetUrl(*)", express.json(), express.urlencoded({ extended: true }), async (req, res) => {
    let targetUrl = req.params.targetUrl;
    
    // Handle query parameters
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const searchParams = urlObj.searchParams;
    const queryString = searchParams.toString();
    
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

      const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

      // Forward cookies from client to target
      const cookieHeader = Object.entries(req.cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');

      const axiosOptions: any = {
        method: req.method,
        url: targetUrl,
        headers: {
          "User-Agent": randomUA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": targetUrl,
          "Cookie": cookieHeader,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1"
        },
        data: req.method !== 'GET' ? req.body : undefined,
        validateStatus: () => true,
        maxRedirects: 0,
        responseType: 'arraybuffer'
      };

      if (req.method !== 'GET') {
        axiosOptions.headers['Origin'] = new URL(targetUrl).origin;
      }

      let response = await axios(axiosOptions);

      // Handle Redirects
      if (response.status >= 300 && response.status < 400 && response.headers.location) {
        let redirectUrl = response.headers.location;
        if (!redirectUrl.startsWith("http")) {
          const currentUrl = new URL(targetUrl);
          redirectUrl = new URL(redirectUrl, currentUrl.href).toString();
        }
        return res.redirect(`${proxyUrlBase}${redirectUrl}`);
      }

      const contentType = response.headers["content-type"] || "";
      
      // Copy headers and handle cookies from target back to client
      Object.entries(response.headers).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'set-cookie' && value) {
          const cookies = Array.isArray(value) ? value : [value];
          cookies.forEach(cookie => {
            // Forward cookies to client
            res.append('Set-Cookie', cookie);
          });
        } else if (![
          "content-security-policy",
          "content-security-policy-report-only",
          "x-frame-options",
          "x-content-type-options",
          "x-xss-protection",
          "strict-transport-security",
          "content-encoding",
          "content-length",
          "transfer-encoding",
          "report-to",
          "nel",
          "cross-origin-embedder-policy",
          "cross-origin-opener-policy",
          "cross-origin-resource-policy",
          "permissions-policy",
          "referrer-policy",
          "access-control-allow-origin",
          "access-control-allow-credentials",
          "access-control-allow-methods",
          "access-control-allow-headers",
          "access-control-expose-headers"
        ].includes(lowerKey)) {
          res.setHeader(key, value as string);
        }
      });

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

      // For HTML, use Cheerio for robust link rewriting
      if (contentType.includes("text/html")) {
        // Frame-busting protection
        let body = Buffer.from(response.data).toString('utf-8');
        body = body.replace(/if\s*\(window\.top\s*!==\s*window\.self\)/g, "if(false)");
        body = body.replace(/if\s*\(top\s*!==\s*self\)/g, "if(false)");
        body = body.replace(/window\.top\.location/g, "window.self.location");
        body = body.replace(/top\.location/g, "self.location");
        body = body.replace(/parent\.location/g, "self.location");
        body = body.replace(/window\.parent\.location/g, "window.self.location");
        body = body.replace(/document\.domain\s*=\s*['"][^'"]*['"]/g, "");
        body = body.replace(/window\.frameElement/g, "null");
        
        // Inject a script to further prevent frame busting
        const script = `
          <script>
            (function() {
              try {
                Object.defineProperty(window, 'top', { get: function() { return window.self; } });
                Object.defineProperty(window, 'parent', { get: function() { return window.self; } });
                Object.defineProperty(document, 'domain', { get: function() { return location.hostname; }, set: function() {} });
              } catch (e) {}
            })();
          </script>
        `;
        body = body.replace(/<head>/i, `<head>${script}`);
        
        const $ = cheerio.load(body);
        const currentUrl = new URL(targetUrl);
        const origin = currentUrl.origin;

        // Inject <base> tag
        $('head').prepend(`<base href="${origin}/">`);

        // Rewrite all links, scripts, forms, etc.
        const rewriteAttr = (selector: string, attr: string) => {
          $(selector).each((_, el) => {
            const val = $(el).attr(attr);
            if (val && !val.startsWith('data:') && !val.startsWith('javascript:') && !val.startsWith('#')) {
              try {
                const absoluteUrl = new URL(val, currentUrl.href).toString();
                $(el).attr(attr, `${proxyUrlBase}${absoluteUrl}`);
              } catch (e) {
                // Ignore invalid URLs
              }
            }
          });
        };

        rewriteAttr('a', 'href');
        rewriteAttr('link', 'href');
        rewriteAttr('script', 'src');
        rewriteAttr('img', 'src');
        rewriteAttr('img', 'data-src');
        rewriteAttr('form', 'action');
        rewriteAttr('iframe', 'src');
        rewriteAttr('source', 'src');
        rewriteAttr('embed', 'src');
        rewriteAttr('area', 'href');
        rewriteAttr('video', 'src');
        rewriteAttr('audio', 'src');

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

        // Frame-busting protection
        body = $.html();
        body = body.replace(/if\s*\(window\.top\s*!==\s*window\.self\)/g, "if(false)");
        body = body.replace(/if\s*\(top\s*!==\s*self\)/g, "if(false)");
        body = body.replace(/window\.top\.location/g, "window.self.location");
        body = body.replace(/top\.location/g, "self.location");
        body = body.replace(/parent\.location/g, "self.location");
        body = body.replace(/window\.parent\.location/g, "window.self.location");
        
        return res.send(body);
      }

      // For other content types, send as is
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
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
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
