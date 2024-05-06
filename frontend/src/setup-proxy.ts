import { createProxyMiddleware } from 'http-proxy-middleware';

module.exports = function(app: any) {
  app.use(
    '/api',  // Adjust this if your API endpoint has a different prefix
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL,
      changeOrigin: true,
    })
  );
};
