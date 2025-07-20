#!/usr/bin/env node

/**
 * n8n MCP Server - Standalone binary for Claude Desktop
 * 
 * This server provides n8n node information and tools to Claude Desktop
 * through the Model Context Protocol (MCP).
 */

const readline = require('readline');

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
      },
      {
        name: "get_node_documentation",
        description: "Get detailed documentation for a specific n8n node",
        inputSchema: {
          type: "object",
          properties: {
            nodeName: {
              type: "string",
              description: "Name of the node to get documentation for"
            }
          },
          required: ["nodeName"]
        }
      },
      {
        name: "list_node_categories",
        description: "List all available n8n node categories",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "create_test_workflow",
        description: "Create a test workflow for validation and testing",
        inputSchema: {
          type: "object",
          properties: {
            workflowType: {
              type: "string",
              description: "Type of test workflow to create",
              enum: ["webhook_to_slack", "manual_to_http", "schedule_to_email", "ai_agent", "data_processing"]
            },
            customName: {
              type: "string",
              description: "Custom name for the workflow"
            }
          },
          required: ["workflowType"]
        }
      },
      {
        name: "validate_workflow",
        description: "Validate a workflow structure and configuration",
        inputSchema: {
          type: "object",
          properties: {
            workflow: {
              type: "object",
              description: "Workflow object to validate"
            }
          },
          required: ["workflow"]
        }
      },
      {
        name: "get_workflow_template",
        description: "Get a pre-built workflow template",
        inputSchema: {
          type: "object",
          properties: {
            templateName: {
              type: "string",
              description: "Name of the template to get",
              enum: ["webhook_slack", "email_processor", "data_sync", "ai_chatbot", "file_processor"]
            }
          },
          required: ["templateName"]
        }
      }
    ];
  }

  // Send MCP message
  sendMessage(message) {
    console.log(JSON.stringify(message));
  }

  // Handle MCP requests
  handleRequest(request) {
    const { jsonrpc, method, params, id } = request;

    if (!jsonrpc || jsonrpc !== '2.0') {
      return this.sendMessage({
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
          return;
        default:
          // Unknown notification, ignore it
          return;
      }
    }

    // Handle requests (messages with id)
    switch (method) {
      case 'initialize':
        return this.handleInitialize(id);
      
      case 'tools/list':
        return this.handleToolsList(id);
      
      case 'tools/call':
        return this.handleToolsCall(params, id);
      
      case 'resources/list':
        return this.handleResourcesList(id);
      
      case 'prompts/list':
        return this.handlePromptsList(id);
      
      default:
        return this.sendMessage({
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Method not found' },
          id
        });
    }
  }

  handleInitialize(id) {
    this.sendMessage({
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

  handleToolsList(id) {
    this.sendMessage({
      jsonrpc: '2.0',
      result: {
        tools: this.tools
      },
      id
    });
  }

  handleToolsCall(params, id) {
    const { name, arguments: args } = params;
    
    switch (name) {
      case 'list_nodes':
        return this.handleListNodes(args, id);
      
      case 'get_node_info':
        return this.handleGetNodeInfo(args, id);
      
      case 'search_nodes':
        return this.handleSearchNodes(args, id);
      
      case 'get_node_documentation':
        return this.handleGetNodeDocumentation(args, id);
      
      case 'list_node_categories':
        return this.handleListNodeCategories(id);
      
      case 'create_test_workflow':
        return this.handleCreateTestWorkflow(args, id);
      
      case 'validate_workflow':
        return this.handleValidateWorkflow(args, id);
      
      case 'get_workflow_template':
        return this.handleGetWorkflowTemplate(args, id);
      
      default:
        return this.sendMessage({
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Tool not found' },
          id
        });
    }
  }

  handleListNodes(args, id) {
    const category = args?.category;
    let nodes = [
      'HTTP Request', 'Function', 'If', 'Split In Batches', 'Webhook',
      'Airtable', 'Discord', 'Slack', 'Email', 'Cron', 'Manual Trigger',
      'Code', 'Set', 'Merge', 'Filter', 'Switch', 'Wait', 'Error Trigger',
      'Google Sheets', 'Notion', 'Zapier', 'Pipedrive', 'HubSpot',
      'Shopify', 'Stripe', 'GitHub', 'GitLab', 'Jira', 'Trello',
      'Asana', 'Monday.com', 'ClickUp', 'Linear', 'Figma', 'Canva'
    ];

    if (category) {
      nodes = nodes.filter(node => 
        node.toLowerCase().includes(category.toLowerCase())
      );
    }

    this.sendMessage({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: `Available n8n nodes${category ? ` in category "${category}"` : ''}:\n\n${nodes.join(', ')}\n\nTotal: ${nodes.length} nodes`
          }
        ]
      },
      id
    });
  }

  handleGetNodeInfo(args, id) {
    const nodeName = args?.nodeName || 'HTTP Request';
    
    const nodeInfo = {
      'HTTP Request': {
        description: 'Make HTTP requests to external APIs and services',
        category: 'Core',
        properties: ['URL', 'Method', 'Headers', 'Body', 'Authentication'],
        examples: ['GET API data', 'POST form data', 'PUT update resource']
      },
      'Function': {
        description: 'Execute custom JavaScript code to transform data',
        category: 'Core',
        properties: ['Code', 'Input Data', 'Output Format'],
        examples: ['Data transformation', 'Custom logic', 'Data validation']
      },
      'If': {
        description: 'Conditionally route workflow execution based on conditions',
        category: 'Flow Control',
        properties: ['Conditions', 'True Path', 'False Path'],
        examples: ['Data filtering', 'Error handling', 'Branching logic']
      }
    };

    const info = nodeInfo[nodeName] || {
      description: 'A powerful n8n node for workflow automation',
      category: 'General',
      properties: ['Various configuration options'],
      examples: ['Workflow automation', 'Data processing', 'Integration']
    };

    this.sendMessage({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: `**${nodeName} Node**\n\n**Description:** ${info.description}\n**Category:** ${info.category}\n**Key Properties:** ${info.properties.join(', ')}\n**Common Use Cases:** ${info.examples.join(', ')}`
          }
        ]
      },
      id
    });
  }

  handleSearchNodes(args, id) {
    const query = args?.query || '';
    
    const allNodes = [
      'HTTP Request', 'Function', 'If', 'Split In Batches', 'Webhook',
      'Airtable', 'Discord', 'Slack', 'Email', 'Cron', 'Manual Trigger',
      'Code', 'Set', 'Merge', 'Filter', 'Switch', 'Wait', 'Error Trigger',
      'Google Sheets', 'Notion', 'Zapier', 'Pipedrive', 'HubSpot',
      'Shopify', 'Stripe', 'GitHub', 'GitLab', 'Jira', 'Trello',
      'Asana', 'Monday.com', 'ClickUp', 'Linear', 'Figma', 'Canva'
    ];

    const matchingNodes = allNodes.filter(node => 
      node.toLowerCase().includes(query.toLowerCase())
    );

    this.sendMessage({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: `Search results for "${query}":\n\n${matchingNodes.length > 0 ? matchingNodes.join(', ') : 'No nodes found'}\n\nFound ${matchingNodes.length} matching nodes.`
          }
        ]
      },
      id
    });
  }

  handleGetNodeDocumentation(args, id) {
    const nodeName = args?.nodeName || 'HTTP Request';
    
    const documentation = {
      'HTTP Request': {
        title: 'HTTP Request Node Documentation',
        description: 'The HTTP Request node allows you to make HTTP requests to external APIs and services.',
        parameters: [
          'URL: The endpoint URL to send the request to',
          'Method: HTTP method (GET, POST, PUT, DELETE, etc.)',
          'Headers: Custom headers to include in the request',
          'Body: Request body for POST/PUT requests',
          'Authentication: API keys, OAuth, or basic auth'
        ],
        examples: [
          'GET: Fetch data from a REST API',
          'POST: Send data to create a new resource',
          'PUT: Update an existing resource',
          'DELETE: Remove a resource'
        ]
      }
    };

    const doc = documentation[nodeName] || {
      title: `${nodeName} Node Documentation`,
      description: 'Comprehensive documentation for this n8n node.',
      parameters: ['Various configuration parameters available'],
      examples: ['Multiple use cases and examples available']
    };

    this.sendMessage({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: `# ${doc.title}\n\n${doc.description}\n\n## Parameters\n${doc.parameters.map(p => `- ${p}`).join('\n')}\n\n## Examples\n${doc.examples.map(e => `- ${e}`).join('\n')}`
          }
        ]
      },
      id
    });
  }

  handleListNodeCategories(id) {
    const categories = [
      'Core', 'Flow Control', 'Communication', 'Data', 'Files',
      'CRM', 'Marketing', 'E-commerce', 'Development', 'Productivity',
      'Social Media', 'Analytics', 'Finance', 'Design', 'Project Management'
    ];

    this.sendMessage({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: `Available n8n node categories:\n\n${categories.join(', ')}\n\nTotal: ${categories.length} categories`
          }
        ]
      },
      id
    });
  }

  handleResourcesList(id) {
    // Return empty resources list (n8n MCP doesn't provide resources)
    this.sendMessage({
      jsonrpc: '2.0',
      result: {
        resources: []
      },
      id
    });
  }

  handlePromptsList(id) {
    // Return empty prompts list (n8n MCP doesn't provide prompts)
    this.sendMessage({
      jsonrpc: '2.0',
      result: {
        prompts: []
      },
      id
    });
  }

  handleCreateTestWorkflow(args, id) {
    const workflowType = args?.workflowType || 'webhook_to_slack';
    const customName = args?.customName || `Test Workflow - ${workflowType}`;

    const workflows = {
      webhook_to_slack: {
        name: customName,
        nodes: [
          {
            id: 'webhook_1',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [250, 300],
            parameters: {
              httpMethod: 'POST',
              path: 'test-webhook',
              responseMode: 'responseNode'
            }
          },
          {
            id: 'slack_1',
            name: 'Slack',
            type: 'n8n-nodes-base.slack',
            typeVersion: 1,
            position: [450, 300],
            parameters: {
              resource: 'message',
              operation: 'post',
              channel: '#general',
              text: '=Test message from n8n workflow: {{$json.message || "Hello from webhook!"}}'
            }
          },
          {
            id: 'respond_1',
            name: 'Respond to Webhook',
            type: 'n8n-nodes-base.respondToWebhook',
            typeVersion: 1,
            position: [650, 300],
            parameters: {
              responseCode: 200,
              responseData: 'json',
              responseBody: '={"status": "success", "message": "Workflow executed successfully"}'
            }
          }
        ],
        connections: {
          'Webhook': {
            main: [[{ node: 'Slack', type: 'main', index: 0 }]]
          },
          'Slack': {
            main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]]
          }
        }
      },
      manual_to_http: {
        name: customName,
        nodes: [
          {
            id: 'manual_1',
            name: 'Manual Trigger',
            type: 'n8n-nodes-base.manualTrigger',
            typeVersion: 1,
            position: [250, 300],
            parameters: {}
          },
          {
            id: 'http_1',
            name: 'HTTP Request',
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.2,
            position: [450, 300],
            parameters: {
              method: 'GET',
              url: 'https://httpbin.org/json',
              responseFormat: 'json'
            }
          },
          {
            id: 'set_1',
            name: 'Set',
            type: 'n8n-nodes-base.set',
            typeVersion: 3.4,
            position: [650, 300],
            parameters: {
              values: {
                string: [
                  {
                    name: 'processed_at',
                    value: '={{ new Date().toISOString() }}'
                  },
                  {
                    name: 'status',
                    value: 'completed'
                  }
                ]
              }
            }
          }
        ],
        connections: {
          'Manual Trigger': {
            main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]]
          },
          'HTTP Request': {
            main: [[{ node: 'Set', type: 'main', index: 0 }]]
          }
        }
      },
      schedule_to_email: {
        name: customName,
        nodes: [
          {
            id: 'schedule_1',
            name: 'Schedule Trigger',
            type: 'n8n-nodes-base.scheduleTrigger',
            typeVersion: 1,
            position: [250, 300],
            parameters: {
              rule: {
                interval: [
                  {
                    field: 'minute',
                    value: 30
                  }
                ]
              }
            }
          },
          {
            id: 'email_1',
            name: 'Email',
            type: 'n8n-nodes-base.emailSend',
            typeVersion: 2,
            position: [450, 300],
            parameters: {
              toEmail: 'test@example.com',
              subject: 'Scheduled Test Email',
              message: 'This is a test email sent by n8n workflow at {{ new Date().toISOString() }}'
            }
          }
        ],
        connections: {
          'Schedule Trigger': {
            main: [[{ node: 'Email', type: 'main', index: 0 }]]
          }
        }
      },
      ai_agent: {
        name: customName,
        nodes: [
          {
            id: 'webhook_1',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [250, 300],
            parameters: {
              httpMethod: 'POST',
              path: 'ai-chat',
              responseMode: 'responseNode'
            }
          },
          {
            id: 'ai_1',
            name: 'AI Agent',
            type: '@n8n/n8n-nodes-langchain.agent',
            typeVersion: 1,
            position: [450, 300],
            parameters: {
              text: '={{ $json.query }}',
              systemMessage: 'You are a helpful AI assistant. Answer questions clearly and concisely.'
            }
          },
          {
            id: 'respond_1',
            name: 'Respond to Webhook',
            type: 'n8n-nodes-base.respondToWebhook',
            typeVersion: 1,
            position: [650, 300],
            parameters: {
              responseCode: 200,
              responseData: 'json',
              responseBody: '={"response": "{{ $json.text }}"}'
            }
          }
        ],
        connections: {
          'Webhook': {
            main: [[{ node: 'AI Agent', type: 'main', index: 0 }]]
          },
          'AI Agent': {
            main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]]
          }
        }
      },
      data_processing: {
        name: customName,
        nodes: [
          {
            id: 'manual_1',
            name: 'Manual Trigger',
            type: 'n8n-nodes-base.manualTrigger',
            typeVersion: 1,
            position: [250, 300],
            parameters: {}
          },
          {
            id: 'code_1',
            name: 'Code',
            type: 'n8n-nodes-base.code',
            typeVersion: 2,
            position: [450, 300],
            parameters: {
                            jsCode: `// Generate sample data
const data = [];
for (let i = 0; i < 5; i++) {
  data.push({
    id: i + 1,
    name: 'Item ' + (i + 1),
    value: Math.random() * 100,
    timestamp: new Date().toISOString()
  });
}
return data;`
            }
          },
          {
            id: 'filter_1',
            name: 'Filter',
            type: 'n8n-nodes-base.if',
            typeVersion: 2,
            position: [650, 300],
            parameters: {
              conditions: {
                number: [
                  {
                    value1: '={{ $json.value }}',
                    operation: 'larger',
                    value2: 50
                  }
                ]
              }
            }
          },
          {
            id: 'set_1',
            name: 'Set',
            type: 'n8n-nodes-base.set',
            typeVersion: 3.4,
            position: [850, 300],
            parameters: {
              values: {
                string: [
                  {
                    name: 'processed',
                    value: 'true'
                  },
                  {
                    name: 'filtered_count',
                    value: '={{ $json.length }}'
                  }
                ]
              }
            }
          }
        ],
        connections: {
          'Manual Trigger': {
            main: [[{ node: 'Code', type: 'main', index: 0 }]]
          },
          'Code': {
            main: [[{ node: 'Filter', type: 'main', index: 0 }]]
          },
          'Filter': {
            main: [[{ node: 'Set', type: 'main', index: 0 }]]
          }
        }
      }
    };

    const workflow = workflows[workflowType];
    if (!workflow) {
      return this.sendMessage({
        jsonrpc: '2.0',
        error: { code: -32602, message: `Unknown workflow type: ${workflowType}` },
        id
      });
    }

    this.sendMessage({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: '✅ Created test workflow: "' + workflow.name + '"\n\n**Workflow Type:** ' + workflowType + '\n**Nodes:** ' + workflow.nodes.length + '\n**Connections:** ' + Object.keys(workflow.connections).length + '\n\n**Workflow JSON:**\n```json\n' + JSON.stringify(workflow, null, 2) + '\n```\n\n**Testing Instructions:**\n1. Copy the JSON above\n2. Use validate_workflow to check for issues\n3. Import into n8n instance\n4. Test execution'
          }
        ]
      },
      id
    });
  }

  handleValidateWorkflow(args, id) {
    const workflow = args?.workflow;
    
    if (!workflow) {
      return this.sendMessage({
        jsonrpc: '2.0',
        error: { code: -32602, message: 'Workflow object is required' },
        id
      });
    }

    const errors = [];
    const warnings = [];

    // Basic structure validation
    if (!workflow.name) {
      errors.push('Missing workflow name');
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push('Missing or invalid nodes array');
    }

    if (!workflow.connections || typeof workflow.connections !== 'object') {
      errors.push('Missing or invalid connections object');
    }

    // Node validation
    if (workflow.nodes) {
      workflow.nodes.forEach((node, index) => {
        if (!node.id) {
          errors.push(`Node ${index}: Missing ID`);
        }
        if (!node.name) {
          errors.push(`Node ${index}: Missing name`);
        }
        if (!node.type) {
          errors.push(`Node ${index}: Missing type`);
        }
        if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
          errors.push(`Node ${index}: Invalid position (should be [x, y])`);
        }
        if (!node.typeVersion) {
          warnings.push(`Node ${index}: Missing typeVersion (recommended)`);
        }
      });
    }

    // Connection validation
    if (workflow.connections) {
      Object.keys(workflow.connections).forEach(sourceNode => {
        const connections = workflow.connections[sourceNode];
        if (typeof connections !== 'object') {
          errors.push(`Invalid connections for node: ${sourceNode}`);
        }
      });
    }

    const status = errors.length === 0 ? 'VALID' : 'INVALID';
    const summary = {
      status,
      errors: errors.length,
      warnings: warnings.length,
      nodes: workflow.nodes?.length || 0,
      connections: Object.keys(workflow.connections || {}).length
    };

    this.sendMessage({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: '## Workflow Validation Results\n\n**Status:** ' + status + '\n**Summary:** ' + JSON.stringify(summary, null, 2) + '\n\n' + (errors.length > 0 ? '**Errors:**\n' + errors.map(e => '- ' + e).join('\n') + '\n\n' : '') + (warnings.length > 0 ? '**Warnings:**\n' + warnings.map(w => '- ' + w).join('\n') + '\n\n' : '') + '**Recommendations:**\n' + (errors.length === 0 ? '- ✅ Workflow structure is valid\n- 🧪 Ready for testing in n8n\n- 📝 Consider adding error handling nodes' : '- ❌ Fix errors before testing\n- 🔧 Review node configurations\n- 📚 Check n8n documentation for node types')
          }
        ]
      },
      id
    });
  }

  handleGetWorkflowTemplate(args, id) {
    const templateName = args?.templateName || 'webhook_slack';

    const templates = {
      webhook_slack: {
        name: 'Webhook to Slack Notification',
        description: 'Simple webhook that sends notifications to Slack',
        category: 'Communication',
        difficulty: 'Beginner',
        nodes: 3,
        workflow: {
          name: 'Webhook to Slack',
          nodes: [
            {
              id: 'webhook_1',
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              typeVersion: 1,
              position: [250, 300],
              parameters: {
                httpMethod: 'POST',
                path: 'slack-notify',
                responseMode: 'responseNode'
              }
            },
            {
              id: 'slack_1',
              name: 'Slack',
              type: 'n8n-nodes-base.slack',
              typeVersion: 1,
              position: [450, 300],
              parameters: {
                resource: 'message',
                operation: 'post',
                channel: '#general',
                text: '=New notification: {{$json.message || "Hello from webhook!"}}'
              }
            },
            {
              id: 'respond_1',
              name: 'Respond to Webhook',
              type: 'n8n-nodes-base.respondToWebhook',
              typeVersion: 1,
              position: [650, 300],
              parameters: {
                responseCode: 200,
                responseData: 'json',
                responseBody: '={"status": "sent"}'
              }
            }
          ],
          connections: {
            'Webhook': {
              main: [[{ node: 'Slack', type: 'main', index: 0 }]]
            },
            'Slack': {
              main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]]
            }
          }
        }
      },
      email_processor: {
        name: 'Email Processing Workflow',
        description: 'Process incoming emails and extract data',
        category: 'Data Processing',
        difficulty: 'Intermediate',
        nodes: 4,
        workflow: {
          name: 'Email Processor',
          nodes: [
            {
              id: 'email_1',
              name: 'Email Read IMAP',
              type: 'n8n-nodes-base.emailReadImap',
              typeVersion: 1,
              position: [250, 300],
              parameters: {
                mailbox: 'INBOX',
                readToEnd: true
              }
            },
            {
              id: 'filter_1',
              name: 'Filter',
              type: 'n8n-nodes-base.if',
              typeVersion: 2,
              position: [450, 300],
              parameters: {
                conditions: {
                  string: [
                    {
                      value1: '={{ $json.subject }}',
                      operation: 'contains',
                      value2: 'important'
                    }
                  ]
                }
              }
            },
            {
              id: 'set_1',
              name: 'Set',
              type: 'n8n-nodes-base.set',
              typeVersion: 3.4,
              position: [650, 300],
              parameters: {
                values: {
                  string: [
                    {
                      name: 'processed_at',
                      value: '={{ new Date().toISOString() }}'
                    },
                    {
                      name: 'priority',
                      value: 'high'
                    }
                  ]
                }
              }
            },
            {
              id: 'slack_1',
              name: 'Slack',
              type: 'n8n-nodes-base.slack',
              typeVersion: 1,
              position: [850, 300],
              parameters: {
                resource: 'message',
                operation: 'post',
                channel: '#alerts',
                text: '=Important email received: {{$json.subject}}'
              }
            }
          ],
          connections: {
            'Email Read IMAP': {
              main: [[{ node: 'Filter', type: 'main', index: 0 }]]
            },
            'Filter': {
              main: [[{ node: 'Set', type: 'main', index: 0 }]]
            },
            'Set': {
              main: [[{ node: 'Slack', type: 'main', index: 0 }]]
            }
          }
        }
      }
    };

    const template = templates[templateName];
    if (!template) {
      return this.sendMessage({
        jsonrpc: '2.0',
        error: { code: -32602, message: `Unknown template: ${templateName}` },
        id
      });
    }

    this.sendMessage({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: '## Workflow Template: ' + template.name + '\n\n**Description:** ' + template.description + '\n**Category:** ' + template.category + '\n**Difficulty:** ' + template.difficulty + '\n**Nodes:** ' + template.nodes + '\n\n**Workflow JSON:**\n```json\n' + JSON.stringify(template.workflow, null, 2) + '\n```\n\n**Usage:**\n1. Copy the JSON above\n2. Import into n8n\n3. Configure credentials\n4. Test execution'
          }
        ]
      },
      id
    });
  }
}

// Main server logic
async function main() {
  const server = new MCPServer();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    try {
      const request = JSON.parse(line);
      server.handleRequest(request);
    } catch (error) {
      console.error('Error parsing request:', error.message);
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Start the server
if (require.main === module) {
  main().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
  });
} 