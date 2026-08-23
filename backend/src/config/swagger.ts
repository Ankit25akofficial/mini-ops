import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Mini Operations ERP API Documentation',
    version: '1.0.0',
    description: 'API documentation for the Mini Operations ERP system featuring Inventory, Work Orders, Transfers, and Customer Orders.',
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token to authenticate',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          username: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'OPERATIONS', 'SALES'] },
        },
      },
      Item: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          sku: { type: 'string' },
          category_id: { type: 'integer' },
          price: { type: 'number' },
        },
      },
      Inventory: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          item_id: { type: 'integer' },
          location_id: { type: 'integer' },
          batch: { type: 'string' },
          physical_quantity: { type: 'integer' },
          reserved_quantity: { type: 'integer' },
          available_quantity: { type: 'integer', description: 'Calculated as physical - reserved' },
        },
      },
      WorkOrder: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          location_id: { type: 'integer' },
          item_id: { type: 'integer' },
          required_quantity: { type: 'integer' },
          assigned_user_id: { type: 'integer', nullable: true },
          status: { type: 'string', enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
        },
      },
      Transfer: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          source_location_id: { type: 'integer' },
          destination_location_id: { type: 'integer' },
          item_id: { type: 'integer' },
          quantity: { type: 'integer' },
          batch: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['REQUESTED', 'DISPATCHED', 'RECEIVED'] },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          customer_name: { type: 'string' },
          user_id: { type: 'integer', description: 'Sales user ID' },
          status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'CANCELLED'] },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'User Login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' },
                },
                required: ['username', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Successful login returning JWT token and user info' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register User (Admin only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string', enum: ['ADMIN', 'OPERATIONS', 'SALES'] },
                },
                required: ['username', 'email', 'password', 'role'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Registered user info' },
          403: { description: 'Access denied: insufficient permissions' },
        },
      },
    },
    '/users': {
      get: {
        summary: 'Get all users (Admin only)',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a user (Admin only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/items': {
      get: {
        summary: 'Get all items',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Item' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create an item (Admin / Operations only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Item' },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/inventory': {
      get: {
        summary: 'Get current stock levels',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Inventory' } },
              },
            },
          },
        },
      },
    },
    '/inventory/adjust': {
      post: {
        summary: 'Adjust inventory physical stock (Admin / Operations only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  item_id: { type: 'integer' },
                  location_id: { type: 'integer' },
                  batch: { type: 'string' },
                  quantity: { type: 'integer' },
                },
                required: ['item_id', 'location_id', 'batch', 'quantity'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated inventory record' },
          400: { description: 'Constraint violation (negative stock or reserved over-limit)' },
        },
      },
    },
    '/work-orders': {
      get: {
        summary: 'Get all work orders',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/WorkOrder' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create work order (Admin only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  location_id: { type: 'integer' },
                  item_id: { type: 'integer' },
                  required_quantity: { type: 'integer' },
                  assigned_user_id: { type: 'integer', nullable: true },
                },
                required: ['location_id', 'item_id', 'required_quantity'],
              },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/transfers': {
      get: {
        summary: 'List internal transfers',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Transfer' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Request transfer (Admin / Operations only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  source_location_id: { type: 'integer' },
                  destination_location_id: { type: 'integer' },
                  item_id: { type: 'integer' },
                  quantity: { type: 'integer' },
                },
                required: ['source_location_id', 'destination_location_id', 'item_id', 'quantity'],
              },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/transfers/{id}/dispatch': {
      post: {
        summary: 'Dispatch transfer (Admin / Operations only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  batch: { type: 'string' },
                },
                required: ['batch'],
              },
            },
          },
        },
        responses: { 200: { description: 'Dispatched successfully' } },
      },
    },
    '/transfers/{id}/receive': {
      post: {
        summary: 'Receive transfer (Admin / Operations only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 
          200: { description: 'Received successfully' },
          400: { description: 'Already received or invalid status' },
        },
      },
    },
    '/orders': {
      get: {
        summary: 'List customer orders',
        responses: { 200: { description: 'OK' } },
      },
      post: {
        summary: 'Create and reserve customer order (Sales / Admin only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  customer_name: { type: 'string' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        item_id: { type: 'integer' },
                        location_id: { type: 'integer' },
                        batch: { type: 'string' },
                        quantity: { type: 'integer' },
                      },
                    },
                  },
                },
                required: ['customer_name', 'items'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Created and reserved atomically' },
          400: { description: 'Insufficient stock or invalid input' },
        },
      },
    },
    '/orders/{id}/cancel': {
      post: {
        summary: 'Cancel order and release reserved stock (Sales / Admin only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Cancelled successfully' } },
      },
    },
  },
};

export const setupSwagger = (app: Express) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  console.log('Swagger API documentation configured at /api/docs');
};
