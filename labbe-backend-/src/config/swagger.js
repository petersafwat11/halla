/**
 * Swagger Configuration
 * OpenAPI/Swagger documentation setup
 * @module config/swagger
 */

const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Halaa API Documentation',
      description: `
        Complete API documentation for the Halaa event management platform.
        
        ## Authentication
        This API uses JWT Bearer tokens for authentication. Include the token in the Authorization header:
        \`\`\`
        Authorization: Bearer <your-jwt-token>
        \`\`\`
        
        ## Base URLs
        - Development: http://localhost:5000
        - Production: https://api.halaa.sa
        
        ## API Versions
        - v1: /api/* (deprecated, backward compatibility)
        - v2: /api/v2/* (recommended)
        
        ## Rate Limiting
        Some endpoints have rate limiting applied:
        - Authentication: 5 requests per 15 minutes
        - OTP: 3 requests per 15 minutes, 10 per hour
        - Password reset: 3 requests per hour
      `,
      version: '2.0.0',
      contact: {
        name: 'API Support',
        email: 'support@halaa.sa',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: config.isDev ? 'http://localhost:5000/api/v2' : 'https://api.halaa.sa/api/v2',
        description: config.isDev ? 'Development server' : 'Production server',
      },
      {
        url: config.isDev ? 'http://localhost:5000/api' : 'https://api.halaa.sa/api',
        description: 'Legacy API (backward compatibility)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoints',
        },
      },
      schemas: {
        // Error Response
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'Error message description',
            },
            statusCode: {
              type: 'integer',
              example: 400,
            },
          },
        },
        
        // Success Response Wrapper
        SuccessResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            data: {
              type: 'object',
            },
          },
        },

        // User Models
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            phoneNumber: {
              type: 'string',
              example: '+966501234567',
            },
            role: {
              type: 'string',
              enum: ['host', 'vendor', 'moderator', 'admin', 'super_admin', 'whitelabel_admin'],
              example: 'host',
            },
            status: {
              type: 'string',
              enum: ['pending', 'active', 'suspended', 'rejected'],
              example: 'active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        HostProfile: {
          type: 'object',
          properties: {
            fullName: {
              type: 'string',
              example: 'John Doe',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female'],
            },
            nationalId: {
              type: 'string',
              example: '1234567890',
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
            },
            region: {
              type: 'string',
            },
            city: {
              type: 'string',
            },
            district: {
              type: 'string',
            },
          },
        },

        VendorProfile: {
          type: 'object',
          properties: {
            brandName: {
              type: 'string',
              example: 'Premium Events',
            },
            ownerFullName: {
              type: 'string',
              example: 'Ahmed Ali',
            },
            commercialRegistration: {
              type: 'string',
            },
            taxNumber: {
              type: 'string',
            },
            category: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
          },
        },

        // Event Models
        Event: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            title: {
              type: 'string',
              example: 'Wedding Celebration',
            },
            eventType: {
              type: 'string',
              enum: ['wedding', 'corporate', 'birthday', 'conference', 'other'],
            },
            date: {
              type: 'string',
              format: 'date',
            },
            time: {
              type: 'string',
              example: '18:00',
            },
            location: {
              type: 'object',
              properties: {
                venue: {
                  type: 'string',
                },
                address: {
                  type: 'string',
                },
                region: {
                  type: 'string',
                },
                city: {
                  type: 'string',
                },
                district: {
                  type: 'string',
                },
                latitude: {
                  type: 'number',
                },
                longitude: {
                  type: 'number',
                },
              },
            },
            host: {
              type: 'string',
              description: 'User ID reference',
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
            },
            guestList: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Guest',
              },
            },
            invitationSettings: {
              type: 'object',
              properties: {
                template: {
                  type: 'string',
                },
                customMessage: {
                  type: 'string',
                },
                includeQrCode: {
                  type: 'boolean',
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Guest Models
        Guest: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            name: {
              type: 'string',
              example: 'Guest Name',
            },
            phone: {
              type: 'string',
              example: '+966501234567',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            category: {
              type: 'string',
              example: 'Family',
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'declined', 'attended'],
              example: 'pending',
            },
            invitationCode: {
              type: 'string',
            },
            qrCode: {
              type: 'string',
            },
            rsvp: {
              type: 'object',
              properties: {
                respondedAt: {
                  type: 'string',
                  format: 'date-time',
                },
                message: {
                  type: 'string',
                },
              },
            },
          },
        },

        // Subscription Models
        Subscription: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            user: {
              type: 'string',
            },
            plan: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['active', 'expired', 'cancelled', 'pending'],
            },
            startDate: {
              type: 'string',
              format: 'date-time',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
            },
            features: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            limits: {
              type: 'object',
              properties: {
                eventsPerMonth: {
                  type: 'integer',
                },
                guestsPerEvent: {
                  type: 'integer',
                },
                messagesPerMonth: {
                  type: 'integer',
                },
                storageGB: {
                  type: 'integer',
                },
              },
            },
          },
        },

        Plan: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            code: {
              type: 'string',
              example: 'host_basic_monthly',
            },
            name: {
              type: 'object',
              properties: {
                en: {
                  type: 'string',
                },
                ar: {
                  type: 'string',
                },
              },
            },
            description: {
              type: 'object',
              properties: {
                en: {
                  type: 'string',
                },
                ar: {
                  type: 'string',
                },
              },
            },
            type: {
              type: 'string',
              enum: ['single_event', 'monthly', 'enterprise'],
            },
            price: {
              type: 'number',
            },
            currency: {
              type: 'string',
              example: 'SAR',
            },
            features: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            limits: {
              type: 'object',
              properties: {
                eventsPerMonth: {
                  type: 'integer',
                },
                guestsPerEvent: {
                  type: 'integer',
                },
                messagesPerMonth: {
                  type: 'integer',
                },
              },
            },
            isActive: {
              type: 'boolean',
            },
          },
        },

        // Ticket Models
        Ticket: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            category: {
              type: 'string',
              enum: ['technical', 'billing', 'feature_request', 'bug', 'general'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
            status: {
              type: 'string',
              enum: ['open', 'in_progress', 'resolved', 'closed'],
            },
            user: {
              type: 'string',
            },
            assignee: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Notification Models
        Notification: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            user: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['system', 'event', 'guest', 'message', 'ticket', 'subscription'],
            },
            title: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
            isRead: {
              type: 'boolean',
            },
            data: {
              type: 'object',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Message Models
        Message: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            event: {
              type: 'string',
            },
            guest: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['sms', 'whatsapp', 'email'],
            },
            status: {
              type: 'string',
              enum: ['pending', 'sent', 'delivered', 'failed'],
            },
            content: {
              type: 'string',
            },
            sentAt: {
              type: 'string',
              format: 'date-time',
            },
            deliveredAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Vendor Models
        Vendor: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            brandName: {
              type: 'string',
            },
            ownerFullName: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            phoneNumber: {
              type: 'string',
            },
            category: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            rating: {
              type: 'number',
              minimum: 0,
              maximum: 5,
            },
            status: {
              type: 'string',
              enum: ['pending', 'active', 'suspended', 'rejected'],
            },
            isVerified: {
              type: 'boolean',
            },
            services: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Service',
              },
            },
          },
        },

        Service: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            category: {
              type: 'string',
            },
            price: {
              type: 'number',
            },
            priceType: {
              type: 'string',
              enum: ['fixed', 'hourly', 'per_person'],
            },
            images: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            isActive: {
              type: 'boolean',
            },
          },
        },

        // Location Models
        Region: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            name: {
              type: 'object',
              properties: {
                en: {
                  type: 'string',
                },
                ar: {
                  type: 'string',
                },
              },
            },
            code: {
              type: 'string',
            },
          },
        },

        City: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            name: {
              type: 'object',
              properties: {
                en: {
                  type: 'string',
                },
                ar: {
                  type: 'string',
                },
              },
            },
            region: {
              type: 'string',
            },
          },
        },

        District: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            name: {
              type: 'object',
              properties: {
                en: {
                  type: 'string',
                },
                ar: {
                  type: 'string',
                },
              },
            },
            city: {
              type: 'string',
            },
          },
        },

        // Auth Request/Response Models
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'password123',
            },
          },
        },

        LoginResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
        },

        SignupHostRequest: {
          type: 'object',
          required: ['email', 'password', 'phoneNumber'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
            },
            phoneNumber: {
              type: 'string',
              example: '+966501234567',
            },
            fullName: {
              type: 'string',
            },
          },
        },

        SignupVendorRequest: {
          type: 'object',
          required: ['email', 'password', 'phoneNumber', 'brandName', 'ownerFullName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
            },
            phoneNumber: {
              type: 'string',
            },
            brandName: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
            },
            ownerFullName: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
            },
            category: {
              type: 'string',
            },
            commercialRegistration: {
              type: 'string',
            },
            taxNumber: {
              type: 'string',
            },
          },
        },

        OTPRequest: {
          type: 'object',
          required: ['phoneNumber'],
          properties: {
            phoneNumber: {
              type: 'string',
              example: '+966501234567',
            },
          },
        },

        OTPVerifyRequest: {
          type: 'object',
          required: ['phoneNumber', 'otp'],
          properties: {
            phoneNumber: {
              type: 'string',
            },
            otp: {
              type: 'string',
              example: '123456',
            },
          },
        },

        // Event Request Models
        CreateEventRequest: {
          type: 'object',
          required: ['title', 'eventType', 'date'],
          properties: {
            title: {
              type: 'string',
              example: 'Wedding Celebration',
            },
            eventType: {
              type: 'string',
              enum: ['wedding', 'corporate', 'birthday', 'conference', 'other'],
            },
            date: {
              type: 'string',
              format: 'date',
              example: '2026-03-15',
            },
            time: {
              type: 'string',
              example: '18:00',
            },
            location: {
              type: 'object',
              properties: {
                venue: {
                  type: 'string',
                },
                address: {
                  type: 'string',
                },
                region: {
                  type: 'string',
                },
                city: {
                  type: 'string',
                },
                district: {
                  type: 'string',
                },
                latitude: {
                  type: 'number',
                },
                longitude: {
                  type: 'number',
                },
              },
            },
            guestList: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                  },
                  phone: {
                    type: 'string',
                  },
                  email: {
                    type: 'string',
                  },
                  category: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },

        // Guest Request Models
        AddGuestRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              example: 'John Smith',
            },
            phone: {
              type: 'string',
              example: '+966501234567',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            category: {
              type: 'string',
              example: 'Family',
            },
          },
        },

        RSVPRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['confirmed', 'declined'],
            },
            message: {
              type: 'string',
            },
          },
        },

        // Ticket Request Models
        CreateTicketRequest: {
          type: 'object',
          required: ['title', 'description', 'category'],
          properties: {
            title: {
              type: 'string',
              example: 'Cannot access my account',
            },
            description: {
              type: 'string',
              example: 'I am unable to login with my credentials',
            },
            category: {
              type: 'string',
              enum: ['technical', 'billing', 'feature_request', 'bug', 'general'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              default: 'medium',
            },
          },
        },

        // Messaging Request Models
        SendMessageRequest: {
          type: 'object',
          required: ['guestId', 'message'],
          properties: {
            guestId: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['sms', 'whatsapp', 'email'],
              default: 'sms',
            },
          },
        },

        // ---- Addon Models ----
        AddonTier: {
          type: 'object',
          properties: {
            quantity: { type: 'integer', example: 10 },
            price: { type: 'number', example: 40 },
          },
        },
        AddonDesignTier: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['ready_made', 'custom_male', 'custom_themed', 'animated', '3d'],
            },
            nameAr: { type: 'string' },
            nameEn: { type: 'string' },
            price: { type: 'number' },
          },
        },
        AddonBusinessCustomization: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'business_customization' },
            nameAr: { type: 'string' },
            nameEn: { type: 'string' },
            price: { type: 'number', example: 2500 },
            descriptionAr: { type: 'string' },
            descriptionEn: { type: 'string' },
          },
        },
        AddonCatalog: {
          type: 'object',
          properties: {
            extra_invites: {
              type: 'array',
              items: { $ref: '#/components/schemas/AddonTier' },
            },
            extra_reminders: {
              type: 'array',
              items: { $ref: '#/components/schemas/AddonTier' },
            },
            design_template: {
              type: 'array',
              items: { $ref: '#/components/schemas/AddonDesignTier' },
            },
            business_customization: {
              $ref: '#/components/schemas/AddonBusinessCustomization',
            },
          },
        },
        Addon: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            addonType: {
              type: 'string',
              enum: [
                'extra_invites',
                'extra_reminders',
                'design_template',
                'business_customization',
              ],
            },
            quantity: { type: 'integer' },
            templateType: { type: 'string', nullable: true },
            price: { type: 'number' },
            currency: { type: 'string', example: 'SAR' },
            scope: { type: 'string', enum: ['event', 'pool', 'org'] },
            subscriptionId: { type: 'string', nullable: true },
            eventId: { type: 'string', nullable: true },
            status: {
              type: 'string',
              enum: [
                'pending',
                'active',
                'pending_provisioning',
                'failed_quota',
                'cancelled',
              ],
            },
            metadata: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AddonPurchaseRequest: {
          type: 'object',
          required: ['addonType'],
          properties: {
            addonType: {
              type: 'string',
              enum: [
                'extra_invites',
                'extra_reminders',
                'design_template',
                'business_customization',
              ],
            },
            quantity: {
              type: 'integer',
              description: 'Required for extra_invites and extra_reminders',
              minimum: 1,
              maximum: 50,
            },
            templateType: {
              type: 'string',
              enum: ['ready_made', 'custom_male', 'custom_themed', 'animated', '3d'],
              description: 'Required for design_template; forbidden otherwise',
            },
            scope: {
              type: 'string',
              enum: ['event', 'pool', 'org'],
              description: 'Defaults to pool/org per addon type',
            },
            eventId: {
              type: 'string',
              pattern: '^[0-9a-fA-F]{24}$',
              description: 'Required when scope is "event"',
            },
            subscriptionId: {
              type: 'string',
              pattern: '^[0-9a-fA-F]{24}$',
            },
            source: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['creditcard', 'creditcard_3ds_test', 'stcpay', 'applepay'],
                },
                name: { type: 'string' },
                number: { type: 'string' },
                month: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
                year: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
                cvc: { type: 'string' },
                mobile: { type: 'string' },
                token: { type: 'string', nullable: true },
              },
            },
          },
        },
        AddonPurchaseResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/Addon' },
          },
        },
        Addon3DSResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                requiresAction: { type: 'boolean', example: true },
                redirectUrl: { type: 'string', format: 'uri' },
                paymentId: { type: 'string' },
              },
            },
          },
        },
        AdminActivateRequest: {
          type: 'object',
          properties: {
            notes: { type: 'string', maxLength: 2000 },
          },
        },

        // Subscription Request Models
        SubscribeRequest: {
          type: 'object',
          required: ['planCode'],
          properties: {
            planCode: {
              type: 'string',
              example: 'host_basic_monthly',
            },
            paymentMethod: {
              type: 'string',
            },
          },
        },

        // Pagination
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 10,
            },
            total: {
              type: 'integer',
              example: 100,
            },
            totalPages: {
              type: 'integer',
              example: 10,
            },
            hasNext: {
              type: 'boolean',
            },
            hasPrev: {
              type: 'boolean',
            },
          },
        },

        // Health Check
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success',
            },
            message: {
              type: 'string',
              example: 'Server is healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            environment: {
              type: 'string',
              example: 'development',
            },
          },
        },
      },
      parameters: {
        PageParam: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            default: 1,
          },
          description: 'Page number for pagination',
        },
        LimitParam: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            default: 10,
            maximum: 100,
          },
          description: 'Number of items per page',
        },
        SortParam: {
          in: 'query',
          name: 'sort',
          schema: {
            type: 'string',
            default: '-createdAt',
          },
          description: 'Sort field (prefix with - for descending)',
        },
        IdParam: {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            pattern: '^[0-9a-fA-F]{24}$',
          },
          description: 'MongoDB ObjectId',
        },
        EventIdParam: {
          in: 'path',
          name: 'eventId',
          required: true,
          schema: {
            type: 'string',
            pattern: '^[0-9a-fA-F]{24}$',
          },
          description: 'Event ID (MongoDB ObjectId)',
        },
        GuestIdParam: {
          in: 'path',
          name: 'guestId',
          required: true,
          schema: {
            type: 'string',
            pattern: '^[0-9a-fA-F]{24}$',
          },
          description: 'Guest ID (MongoDB ObjectId)',
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Invalid input data',
                statusCode: 400,
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized - Missing or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Please log in to access this resource',
                statusCode: 401,
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'You do not have permission to perform this action',
                statusCode: 403,
              },
            },
          },
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Resource not found',
                statusCode: 404,
              },
            },
          },
        },
        Conflict: {
          description: 'Conflict - Resource already exists',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Email already registered',
                statusCode: 409,
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Too many requests, please try again later',
                statusCode: 429,
              },
            },
          },
        },
        InternalError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Something went wrong',
                statusCode: 500,
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // API files to scan for JSDoc comments
  apis: [
    './src/modules/**/*.routes.js',
    './src/modules/**/*.controller.js',
    './src/shared/errors/*.js',
  ],
};

// Generate swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Validate the spec
if (!swaggerSpec || Object.keys(swaggerSpec).length === 0) {
  console.warn('⚠️  Warning: Swagger specification is empty. Check your JSDoc comments.');
}

module.exports = swaggerSpec;
