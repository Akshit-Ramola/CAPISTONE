import express from "express";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
app.use(morgan('combined'));

app.get('/api/status/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' })
})

app.get('/api/status/readyz', (req, res) => {
    res.status(200).json({ status: 'ready' })
})

const proxies = {}

function getProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}`;
    if (!proxies[sandboxId]) {
        proxies[sandboxId] = createProxyMiddleware({
            target,
            changeOrigin: false,
            ws: true,
            onError: (err, req, res) => {
                console.error(`Proxy error for ${sandboxId}:`, err.message);
                if (!res.headersSent) {
                    res.status(502).json({
                        error: "Sandbox environment is starting or unavailable",
                        sandboxId
                    });
                }
            }
        });
    }
    return proxies[sandboxId];
}

app.use((req, res, next) => {
    const host = req.headers.host || '';
    const hostname = host.split(':')[0];
    const firstSubdomain = hostname.split('.')[0];

    const sandboxId = firstSubdomain.startsWith('sandbox-')
        ? firstSubdomain.substring(8)
        : firstSubdomain;

    if (!sandboxId) {
        return res.status(400).json({ error: "Invalid sandbox host" });
    }

    return getProxy(sandboxId)(req, res, next);
});

export default app;