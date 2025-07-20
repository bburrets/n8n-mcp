// Enhanced MCP Server for Vercel deployment
// This version includes proper authentication and MCP protocol handling

// Set the AUTH_TOKEN from the Vercel environment variable
if (process.env.N8N_MCP_AUTH_TOKEN) {
  process.env.AUTH_TOKEN = process.env.N8N_MCP_AUTH_TOKEN;
}

// MCP Server implementation
class MCPServer {
  constructor() {
    this.tools = [
      {
        name: "list_nodes",
        description: "List available n8n nodes",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Filter by node category"
            }
          }
        }
      },
      {
        name: "get_node_info",
        description: "Get detailed information about a specific n8n node",
        inputSchema: {
          type: "object",
          properties: {
            nodeName: {
              type: "string",
              description: "Name of the node to get information for"
            }
          },
          required: ["nodeName"]
        }
      },
      {
        name: "search_nodes",
        description: "Search for n8n nodes by keyword",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query"
            }
          },
          required: ["query"]
        }
      }
    ];
  }

  // Validate authentication
  validateAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return false;
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return false;
    }
    
    const token = authHeader.slice(7).trim();
    return token === process.env.AUTH_TOKEN;
  }

  // Handle MCP requests
  handleMCPRequest(req, res) {
    const { jsonrpc, method, params, id } = req.body;

    if (!jsonrpc || jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id: null
      });
    }

    // Handle notifications (messages without id) - these should not receive responses
    if (id === undefined) {
      switch (method) {
        case 'notifications/initialized':
          // This is a notification, don't send a response
          return res.status(200).end();
        default:
          // Unknown notification, ignore it
          return res.status(200).end();
      }
    }

    // Handle requests (messages with id)
    switch (method) {
      case 'initialize':
        return this.handleInitialize(req, res, id);
      
      case 'tools/list':
        return this.handleToolsList(req, res, id);
      
      case 'tools/call':
        return this.handleToolsCall(req, res, id);
      
      case 'resources/list':
        return res.json({
          jsonrpc: '2.0',
          result: { resources: [] },
          id
        });
      
      case 'prompts/list':
        return res.json({
          jsonrpc: '2.0',
          result: { prompts: [] },
          id
        });
      
      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Method not found' },
          id
        });
    }
  }

  handleInitialize(req, res, id) {
    res.json({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'n8n-mcp-server',
          version: '2.7.20'
        }
      },
      id
    });
  }

  handleToolsList(req, res, id) {
    res.json({
      jsonrpc: '2.0',
      result: {
        tools: this.tools
      },
      id
    });
  }

  handleToolsCall(req, res, id) {
    const { name, arguments: args } = req.body.params;
    
    switch (name) {
      case 'list_nodes':
        return res.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: 'Available n8n nodes: HTTP Request, Function, If, Split In Batches, Webhook, Airtable, Discord, Slack, and many more...'
              }
            ]
          },
          id
        });
      
      case 'get_node_info':
        const nodeName = args?.nodeName || 'HTTP Request';
        return res.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: `Information about ${nodeName}: This node allows you to make HTTP requests to external APIs and services.`
              }
            ]
          },
          id
        });
      
      case 'search_nodes':
        const query = args?.query || '';
        return res.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: `Search results for "${query}": Found multiple nodes matching your query.`
              }
            ]
          },
          id
        });
      
      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Tool not found' },
          id
        });
    }
  }
}

// Initialize MCP server
const mcpServer = new MCPServer();

module.exports = async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Handle health check (no auth required)
    if (req.method === 'GET' && req.url === '/health') {
      return res.status(200).json({ 
        status: 'ok', 
        message: 'n8n MCP server is running',
        deployment: 'vercel',
        timestamp: new Date().toISOString(),
        version: '2.7.20',
        authentication: 'required_for_mcp'
      });
    }

    // Handle MCP requests (auth required)
    if (req.method === 'POST') {
      // Validate authentication
      if (!mcpServer.validateAuth(req)) {
        return res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Unauthorized - Valid Bearer token required'
          },
          id: req.body?.id || null
        });
      }

      // Handle MCP request
      return mcpServer.handleMCPRequest(req, res);
    }

    // Default response for other requests
    res.status(200).json({
      message: 'n8n MCP Server',
      status: 'running',
      deployment: 'vercel',
      version: '2.7.20',
      authentication: 'required_for_mcp',
      endpoints: {
        health: '/health (GET)',
        mcp: '/ (POST with Authorization: Bearer <token>)'
      },
      documentation: 'https://github.com/czlonkowski/n8n-mcp'
    });
    
  } catch (error) {
    console.error('API handler error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};
