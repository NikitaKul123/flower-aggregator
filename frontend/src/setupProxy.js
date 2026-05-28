const { createProxyMiddleware } = require('http-proxy-middleware');

/** Если REACT_APP_API_URL пустой — проксируем /api и socket.io на backend */
module.exports = function setupProxy(app) {
    const target = process.env.REACT_APP_PROXY_TARGET || 'http://localhost:5000';

    app.use(
        '/api',
        createProxyMiddleware({
            target,
            changeOrigin: true
        })
    );

    app.use(
        '/socket.io',
        createProxyMiddleware({
            target,
            ws: true,
            changeOrigin: true
        })
    );
};
