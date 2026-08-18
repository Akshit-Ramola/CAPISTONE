import express from "express";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use(morgan("combined"));

app.get("/api/status/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/api/status/readyz", (req, res) => {
    res.status(200).json({ status: "ready" });
});


const proxies = {};
const agentProxies = {};


function getProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}:80`;

    if (!proxies[sandboxId]) {
        proxies[sandboxId] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,

            onError: (err, req, res) => {
                console.error(
                    `Preview proxy error for ${sandboxId}:`,
                    err.message
                );

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


function getAgentProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}:3000`;

    if (!agentProxies[sandboxId]) {
        agentProxies[sandboxId] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,

            onError: (err, req, res) => {
                console.error(
                    `Agent proxy error for ${sandboxId}:`,
                    err.message
                );

                if (!res.headersSent) {
                    res.status(502).json({
                        error: "Agent environment is starting or unavailable",
                        sandboxId
                    });
                }
            }
        });
    }

    return agentProxies[sandboxId];
}


app.use((req, res, next) => {
    const host = req.headers.host || "";

    // Remove port if present
    const hostname = host.split(":")[0];

    // Example:
    // sandbox-123.agent.localhost
    // sandbox-123.preview.localhost
    const parts = hostname.split(".");

    const firstSubdomain = parts[0];
    const environment = parts[1];

    const sandboxId = firstSubdomain.startsWith("sandbox-")
        ? firstSubdomain.substring(8)
        : null;

    if (!sandboxId) {
        return res.status(400).json({
            error: "Invalid sandbox host"
        });
    }

    if (environment === "agent") {
        console.log(
            `Routing agent request for sandbox: ${sandboxId}`
        );

        return getAgentProxy(sandboxId)(req, res, next);
    }

    if (environment === "preview") {
        console.log(
            `Routing preview request for sandbox: ${sandboxId}`
        );

        return getProxy(sandboxId)(req, res, next);
    }

    return res.status(400).json({
        error: "Unknown sandbox environment"
    });
});


export default app;