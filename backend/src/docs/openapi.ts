const jsonContent = (schema: object) => ({ 'application/json': { schema } });

const errorResponses = {
  '400': {
    description: 'Request validation failed.',
    content: jsonContent({ $ref: '#/components/schemas/ErrorResponse' }),
  },
  '401': {
    description: 'Authentication failed or is required.',
    content: jsonContent({ $ref: '#/components/schemas/ErrorResponse' }),
  },
  '403': {
    description: 'CSRF validation or authorization failed.',
    content: jsonContent({ $ref: '#/components/schemas/ErrorResponse' }),
  },
};

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'ShopSphere API',
    version: '0.5.0',
    description: 'REST API for the ShopSphere e-commerce application.',
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [
    { name: 'Health' },
    { name: 'Authentication' },
    { name: 'Users' },
    { name: 'Products' },
    { name: 'Categories' },
    { name: 'Cart' },
    { name: 'Orders' },
    { name: 'Admin' },
  ],
  paths: {
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Process liveness',
        responses: { '200': { description: 'The application process is alive.' } },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Dependency readiness',
        responses: {
          '200': { description: 'Required dependencies are available.' },
          '503': { description: 'At least one required dependency is unavailable.' },
        },
      },
    },
    '/api/v1/auth/csrf': {
      get: {
        tags: ['Authentication'],
        summary: 'Issue or rotate a CSRF token',
        responses: {
          '200': {
            description: 'CSRF token issued and matching cookie set.',
            content: jsonContent({
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: { csrfToken: { type: 'string' } },
                  required: ['csrfToken'],
                },
              },
              required: ['data'],
            }),
          },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a customer',
        parameters: [{ $ref: '#/components/parameters/CsrfHeader' }],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/RegisterRequest' }),
        },
        responses: {
          '201': {
            description: 'Customer registered and signed in.',
            content: jsonContent({ $ref: '#/components/schemas/AuthResponse' }),
          },
          ...errorResponses,
          '409': {
            description: 'Email already exists.',
            content: jsonContent({ $ref: '#/components/schemas/ErrorResponse' }),
          },
          '429': { description: 'Authentication rate limit exceeded.' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in',
        parameters: [{ $ref: '#/components/parameters/CsrfHeader' }],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/LoginRequest' }),
        },
        responses: {
          '200': {
            description: 'Credentials verified and session created.',
            content: jsonContent({ $ref: '#/components/schemas/AuthResponse' }),
          },
          ...errorResponses,
          '429': { description: 'Authentication rate limit exceeded.' },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke the current session',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfHeader' }],
        responses: { '200': { description: 'Session revoked.' }, ...errorResponses },
      },
    },
    '/api/v1/auth/session': {
      get: {
        tags: ['Authentication'],
        summary: 'Read the authenticated session',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Current authenticated user.',
            content: jsonContent({ $ref: '#/components/schemas/UserResponse' }),
          },
          '401': errorResponses['401'],
        },
      },
    },
    '/api/v1/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Read customer profile',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Current profile.',
            content: jsonContent({ $ref: '#/components/schemas/UserResponse' }),
          },
          '401': errorResponses['401'],
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update customer profile',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfHeader' }],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/UpdateProfileRequest' }),
        },
        responses: {
          '200': {
            description: 'Updated profile.',
            content: jsonContent({ $ref: '#/components/schemas/UserResponse' }),
          },
          ...errorResponses,
        },
      },
    },
    '/api/v1/admin/session': {
      get: {
        tags: ['Admin'],
        summary: 'Verify an administrator session',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Authenticated administrator.',
            content: jsonContent({ $ref: '#/components/schemas/UserResponse' }),
          },
          '401': errorResponses['401'],
          '403': errorResponses['403'],
        },
      },
    },
    '/api/v1/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List active categories',
        responses: { '200': { description: 'Active categories.' } },
      },
    },
    '/api/v1/products': {
      get: {
        tags: ['Products'],
        summary: 'Search and filter active products',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          {
            name: 'minPrice',
            in: 'query',
            schema: { type: 'string', pattern: '^\\d+(?:\\.\\d{1,2})?$' },
          },
          {
            name: 'maxPrice',
            in: 'query',
            schema: { type: 'string', pattern: '^\\d+(?:\\.\\d{1,2})?$' },
          },
          { name: 'inStock', in: 'query', schema: { type: 'boolean' } },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', enum: ['newest', 'price_asc', 'price_desc'] },
          },
        ],
        responses: {
          '200': { description: 'Paginated product catalogue.' },
          '400': errorResponses['400'],
        },
      },
    },
    '/api/v1/products/{productId}': {
      get: {
        tags: ['Products'],
        summary: 'Get an active product',
        parameters: [{ $ref: '#/components/parameters/ProductId' }],
        responses: {
          '200': {
            description: 'Product detail.',
            content: jsonContent({ $ref: '#/components/schemas/ProductResponse' }),
          },
          '404': { description: 'Product not found.' },
        },
      },
    },
    '/api/v1/admin/categories': {
      get: {
        tags: ['Admin'],
        summary: 'List all categories',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Active and inactive categories.' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a category',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfHeader' }],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/CreateCategoryRequest' }),
        },
        responses: { '201': { description: 'Category created.' }, ...errorResponses },
      },
    },
    '/api/v1/admin/categories/{categoryId}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update or deactivate a category',
        security: [{ cookieAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/CategoryId' },
          { $ref: '#/components/parameters/CsrfHeader' },
        ],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/UpdateCategoryRequest' }),
        },
        responses: { '200': { description: 'Category updated.' }, ...errorResponses },
      },
    },
    '/api/v1/admin/products': {
      get: {
        tags: ['Admin'],
        summary: 'List active and inactive products',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Paginated admin product list.' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a product',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfHeader' }],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/CreateProductRequest' }),
        },
        responses: {
          '201': { description: 'Product created.' },
          ...errorResponses,
          '409': { description: 'SKU already exists.' },
        },
      },
    },
    '/api/v1/admin/products/{productId}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update a product',
        security: [{ cookieAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/ProductId' },
          { $ref: '#/components/parameters/CsrfHeader' },
        ],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/UpdateProductRequest' }),
        },
        responses: { '200': { description: 'Product updated.' }, ...errorResponses },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Deactivate a product',
        security: [{ cookieAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/ProductId' },
          { $ref: '#/components/parameters/CsrfHeader' },
        ],
        responses: { '200': { description: 'Product deactivated.' }, ...errorResponses },
      },
    },
    '/api/v1/admin/products/{productId}/inventory': {
      patch: {
        tags: ['Admin'],
        summary: 'Set product stock quantity',
        security: [{ cookieAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/ProductId' },
          { $ref: '#/components/parameters/CsrfHeader' },
        ],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/InventoryRequest' }),
        },
        responses: { '200': { description: 'Inventory updated.' }, ...errorResponses },
      },
    },
    '/api/v1/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Read administrator dashboard metrics',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Customer, product, inventory, order, and revenue totals.' },
          '401': errorResponses['401'],
          '403': errorResponses['403'],
        },
      },
    },
    '/api/v1/admin/orders': {
      get: {
        tags: ['Admin'],
        summary: 'Search and filter all orders',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/OrderStatus' } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 } },
        ],
        responses: { '200': { description: 'Paginated global order list.' }, ...errorResponses },
      },
    },
    '/api/v1/admin/orders/{orderId}': {
      get: {
        tags: ['Admin'],
        summary: 'Read any order',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/OrderId' }],
        responses: {
          '200': { description: 'Order detail.' },
          ...errorResponses,
          '404': { description: 'Order not found.' },
        },
      },
    },
    '/api/v1/admin/orders/{orderId}/status': {
      patch: {
        tags: ['Admin'],
        summary: 'Advance or cancel an order',
        security: [{ cookieAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/OrderId' },
          { $ref: '#/components/parameters/CsrfHeader' },
        ],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/UpdateOrderStatusRequest' }),
        },
        responses: {
          '200': { description: 'Order status updated.' },
          ...errorResponses,
          '409': { description: 'Invalid status transition.' },
        },
      },
    },
    '/api/v1/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get the authenticated customer cart',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Cart and calculated totals.' },
          '401': errorResponses['401'],
        },
      },
    },
    '/api/v1/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add a product to the cart',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfHeader' }],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/AddCartItemRequest' }),
        },
        responses: {
          '201': { description: 'Product added and cart returned.' },
          ...errorResponses,
          '409': { description: 'Product unavailable or insufficient stock.' },
        },
      },
    },
    '/api/v1/cart/items/{itemId}': {
      patch: {
        tags: ['Cart'],
        summary: 'Set a cart item quantity',
        security: [{ cookieAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/CartItemId' },
          { $ref: '#/components/parameters/CsrfHeader' },
        ],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/UpdateCartItemRequest' }),
        },
        responses: { '200': { description: 'Cart updated.' }, ...errorResponses },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove a cart item',
        security: [{ cookieAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/CartItemId' },
          { $ref: '#/components/parameters/CsrfHeader' },
        ],
        responses: { '200': { description: 'Item removed and cart returned.' }, ...errorResponses },
      },
    },
    '/api/v1/orders/checkout': {
      post: {
        tags: ['Orders'],
        summary: 'Checkout using the simulated payment flow',
        description:
          'SUCCEEDED confirms the order, decrements stock, and clears the cart. FAILED records a cancelled order and failed payment without changing stock or clearing the cart.',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CsrfHeader' }],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/CheckoutRequest' }),
        },
        responses: {
          '201': { description: 'Confirmed order created.' },
          '402': { description: 'Simulated payment failed; failure order details are returned.' },
          ...errorResponses,
          '409': { description: 'Cart empty, product unavailable, or insufficient stock.' },
        },
      },
    },
    '/api/v1/orders': {
      get: {
        tags: ['Orders'],
        summary: 'List the authenticated customer order history',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': { description: 'Paginated order history.' },
          '401': errorResponses['401'],
        },
      },
    },
    '/api/v1/orders/{orderId}': {
      get: {
        tags: ['Orders'],
        summary: 'Get an owned order',
        security: [{ cookieAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/OrderId' }],
        responses: {
          '200': { description: 'Order detail.' },
          '404': { description: 'Order not found.' },
        },
      },
    },
    '/api/v1/orders/{orderId}/cancel': {
      post: {
        tags: ['Orders'],
        summary: 'Cancel an eligible order',
        security: [{ cookieAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/OrderId' },
          { $ref: '#/components/parameters/CsrfHeader' },
        ],
        responses: {
          '200': { description: 'Order cancelled, inventory restored, and payment refunded.' },
          ...errorResponses,
          '409': { description: 'Order is not cancellable in its current status.' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'shopsphere_session' },
    },
    parameters: {
      CsrfHeader: {
        name: 'x-csrf-token',
        in: 'header',
        required: true,
        schema: { type: 'string' },
        description: 'Must match the shopsphere_csrf cookie and authenticated session.',
      },
      ProductId: {
        name: 'productId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      CategoryId: {
        name: 'categoryId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      CartItemId: {
        name: 'itemId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
      OrderId: {
        name: 'orderId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
    },
    schemas: {
      OrderStatus: {
        type: 'string',
        enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
      },
      UpdateOrderStatusRequest: {
        type: 'object',
        additionalProperties: false,
        properties: { status: { $ref: '#/components/schemas/OrderStatus' } },
        required: ['status'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: ['string', 'null'] },
          role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: [
          'id',
          'email',
          'firstName',
          'lastName',
          'phone',
          'role',
          'createdAt',
          'updatedAt',
        ],
      },
      UserResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: { user: { $ref: '#/components/schemas/User' } },
            required: ['user'],
          },
        },
        required: ['data'],
      },
      AuthResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              csrfToken: { type: 'string' },
            },
            required: ['user', 'csrfToken'],
          },
        },
        required: ['data'],
      },
      RegisterRequest: {
        type: 'object',
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', maxLength: 320 },
          password: { type: 'string', format: 'password', minLength: 12, maxLength: 128 },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          phone: { type: 'string', minLength: 5, maxLength: 30 },
        },
        required: ['email', 'password', 'firstName', 'lastName'],
      },
      LoginRequest: {
        type: 'object',
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
        required: ['email', 'password'],
      },
      UpdateProfileRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          phone: { type: ['string', 'null'] },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: ['string', 'null'] },
          isActive: { type: 'boolean' },
        },
        required: ['id', 'name', 'slug', 'description', 'isActive'],
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          sku: { type: 'string' },
          price: { type: 'string', pattern: '^\\d+\\.\\d{2}$' },
          stockQuantity: { type: 'integer', minimum: 0 },
          availability: { type: 'string', enum: ['IN_STOCK', 'OUT_OF_STOCK'] },
          imageUrl: { type: ['string', 'null'], format: 'uri' },
          isActive: { type: 'boolean' },
          category: { $ref: '#/components/schemas/Category' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: [
          'id',
          'name',
          'description',
          'sku',
          'price',
          'stockQuantity',
          'availability',
          'imageUrl',
          'isActive',
          'category',
          'createdAt',
          'updatedAt',
        ],
      },
      ProductResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: { product: { $ref: '#/components/schemas/Product' } },
            required: ['product'],
          },
        },
        required: ['data'],
      },
      CreateCategoryRequest: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120 },
          slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
          description: { type: ['string', 'null'] },
        },
        required: ['name', 'slug'],
      },
      UpdateCategoryRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120 },
          slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
          description: { type: ['string', 'null'] },
          isActive: { type: 'boolean' },
        },
      },
      CreateProductRequest: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', minLength: 1, maxLength: 10000 },
          sku: { type: 'string', maxLength: 80 },
          price: { type: 'string' },
          stockQuantity: { type: 'integer', minimum: 0 },
          imageUrl: { type: ['string', 'null'], format: 'uri' },
          categoryId: { type: 'string', format: 'uuid' },
        },
        required: ['name', 'description', 'sku', 'price', 'stockQuantity', 'categoryId'],
      },
      UpdateProductRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          sku: { type: 'string' },
          price: { type: 'string' },
          imageUrl: { type: ['string', 'null'], format: 'uri' },
          categoryId: { type: 'string', format: 'uuid' },
          isActive: { type: 'boolean' },
        },
      },
      InventoryRequest: {
        type: 'object',
        additionalProperties: false,
        properties: { stockQuantity: { type: 'integer', minimum: 0 } },
        required: ['stockQuantity'],
      },
      AddCartItemRequest: {
        type: 'object',
        additionalProperties: false,
        properties: {
          productId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', minimum: 1, maximum: 1000 },
        },
        required: ['productId', 'quantity'],
      },
      UpdateCartItemRequest: {
        type: 'object',
        additionalProperties: false,
        properties: { quantity: { type: 'integer', minimum: 1, maximum: 1000 } },
        required: ['quantity'],
      },
      CheckoutRequest: {
        type: 'object',
        additionalProperties: false,
        properties: {
          shipping: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              addressLine1: { type: 'string' },
              addressLine2: { type: ['string', 'null'] },
              city: { type: 'string' },
              state: { type: 'string' },
              postalCode: { type: 'string' },
              country: { type: 'string', minLength: 2, maxLength: 2 },
            },
            required: ['name', 'addressLine1', 'city', 'state', 'postalCode', 'country'],
          },
          payment: {
            type: 'object',
            additionalProperties: false,
            properties: {
              method: { type: 'string', const: 'SIMULATED' },
              outcome: { type: 'string', enum: ['SUCCEEDED', 'FAILED'] },
            },
            required: ['method', 'outcome'],
          },
        },
        required: ['shipping', 'payment'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              requestId: { type: 'string' },
            },
            required: ['code', 'message', 'requestId'],
          },
        },
        required: ['error'],
      },
    },
  },
} as const;
