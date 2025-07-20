// Import the compiled MCP server
const { createServer } = require('../build/index.js');

module.exports = async (req, res) => {
  // For Vercel serverless functions, we need to handle this differently
  // This is a workaround for MCP servers in serverless environments
  
  if (req.method === 'GET' && req.url === '/health') {
    return res.status(200).json({ status: 'ok', message: 'n8n MCP server is running' });
  }
  
  // For now, return a basic response
  // Full MCP implementation may need WebSocket support
  res.status(200).json({ 
    message: 'n8n MCP Server', 
    note: 'This is a serverless deployment - full MCP functionality may be limited'
  });
};
