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
        email: 'support@halaa.net',
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

        // Staff schemas
        StaffVerifyResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                verified: { type: 'boolean', example: true },
                staff: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string', nullable: true },
                    name: { type: 'string' },
                    phone: { type: 'string' },
                    role: { type: 'string', example: 'staff' },
                  },
                },
                event: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    title: { type: 'string' },
                    date: { type: 'string' },
                    time: { type: 'string' },
                    location: { type: 'object' },
                    status: { type: 'string' },
                  },
                },
                sessionToken: { type: 'string' },
              },
            },
          },
        },
        StaffGoneResponse: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              enum: ['staff_revoked', 'staff_expired'],
            },
            message: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
            revokedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        StaffGuestStats: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            confirmed: { type: 'integer' },
            checkedIn: { type: 'integer' },
            declined: { type: 'integer' },
            pending: { type: 'integer' },
            lastCheckIn: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        StaffGuestListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                guests: {
                  type: 'array',
                  items: { type: 'object' },
                },
                stats: { $ref: '#/components/schemas/StaffGuestStats' },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    pages: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        StaffCheckInResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status: { type: 'string', example: 'success' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                guest: { type: 'object' },
                alreadyCheckedIn: { type: 'boolean' },
                checkedInAt: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true,
                },
                checkedInBy: { type: 'string', nullable: true },
                message: { type: 'string' },
              },
            },
          },
        },
        StaffTokenItem: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            phone: { type: 'string' },
            staffName: { type: 'string' },
            isRevoked: { type: 'boolean' },
            revokedAt: { type: 'string', format: 'date-time', nullable: true },
            revokedBy: { type: 'string', nullable: true },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
            isExpired: { type: 'boolean' },
            lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
            useCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        StaffTokensListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                tokens: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/StaffTokenItem' },
                },
              },
            },
          },
        },
        StaffRevokeResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status: { type: 'string', example: 'success' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                revoked: { type: 'boolean' },
                affected: { type: 'integer' },
                wasAlreadyRevoked: { type: 'boolean' },
              },
            },
          },
        },

        // Dashboard schemas
        StatsCard: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'hosts' },
            icon: { type: 'string', example: 'users' },
            titleKey: { type: 'string', example: 'stats.hosts.title' },
            value: { type: 'integer', example: 42 },
            subtitle: {
              type: 'object',
              properties: {
                count: { type: 'integer', example: 30 },
                labelKey: { type: 'string', example: 'stats.hosts.subtitle' },
              },
            },
            highlight: {
              type: 'object',
              nullable: true,
              properties: {
                count: { type: 'integer', example: 5 },
                labelKey: { type: 'string', example: 'stats.hosts.highlight' },
              },
            },
          },
        },
        AdminDashboardStats: {
          type: 'object',
          properties: {
            statsCards: {
              type: 'array',
              items: { $ref: '#/components/schemas/StatsCard' },
            },
            charts: {
              type: 'object',
              properties: {
                subscriptionsByPlan: {
                  type: 'object',
                  additionalProperties: { type: 'integer' },
                },
                period: { type: 'string', example: 'month' },
              },
            },
            recentActivity: {
              type: 'object',
              properties: {
                hosts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      status: { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      date: { type: 'string', format: 'date-time' },
                      status: { type: 'string' },
                      host: { type: 'string' },
                    },
                  },
                },
              },
            },
            bestVendors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  numberOfClicks: { type: 'integer' },
                },
              },
            },
            analytics: {
              type: 'object',
              nullable: true,
              description: 'Whitelabel-tenant-only analytics block',
              properties: {
                monthlyEvents: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      month: { type: 'string' },
                      year: { type: 'integer' },
                      count: { type: 'integer' },
                    },
                  },
                },
                eventsByStatus: {
                  type: 'object',
                  properties: {
                    pending_scheduling: { type: 'integer' },
                    scheduled: { type: 'integer' },
                    live: { type: 'integer' },
                    completed: { type: 'integer' },
                  },
                },
                totalGuests: { type: 'integer' },
                activeEvents: { type: 'integer' },
              },
            },
            period: { type: 'string', example: 'month' },
          },
        },
        HostDashboardStats: {
          type: 'object',
          properties: {
            stats: {
              type: 'object',
              properties: {
                totalEvents: { type: 'integer' },
                activeEvents: { type: 'integer' },
                pendingSchedulingEvents: { type: 'integer' },
                endedEvents: { type: 'integer' },
              },
            },
            lastEvent: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                date: { type: 'string', format: 'date-time' },
                time: { type: 'string' },
                location: { type: 'string' },
                locationName: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                guestCount: { type: 'integer' },
                responseRate: { type: 'string', example: '67%' },
                stats: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    confirmed: { type: 'integer' },
                    declined: { type: 'integer' },
                    invited: { type: 'integer' },
                    checkedIn: { type: 'integer' },
                  },
                },
                quota: {
                  type: 'object',
                  properties: {
                    remainingGuests: { type: 'integer', nullable: true, description: 'null = unlimited' },
                    compensationMessages: { type: 'integer' },
                  },
                },
                testMessageSent: { type: 'boolean' },
                launchSettings: { type: 'object', nullable: true },
                visualTemplate: { type: 'object', nullable: true },
                taqnyatTemplate: { type: 'object', nullable: true },
              },
            },
            subscription: {
              type: 'object',
              nullable: true,
              properties: {
                planName: { type: 'string' },
                status: { type: 'string' },
                expiresAt: { type: 'string', format: 'date-time' },
                eventsUsed: { type: 'integer' },
                eventsLimit: { type: 'integer' },
                guestsUsed: { type: 'integer' },
                guestsLimit: { type: 'integer', nullable: true, description: 'null = unlimited' },
              },
            },
            hasEvents: { type: 'boolean' },
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

        UpdateProfileInput: {
          type: 'object',
          description:
            'Body for `PATCH /users/profile`. Multipart accepts `avatar` and `businessLogo` files plus a JSON-stringified `profile` field. Unknown fields are rejected.',
          properties: {
            username: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            preferredLanguage: { type: 'string', enum: ['ar', 'en'] },
            profile: {
              type: 'object',
              description:
                'Role-keyed profile data. The server only applies the section matching the caller role (e.g. `hostData` for hosts).',
              additionalProperties: true,
            },
            avatar: {
              type: 'string',
              format: 'binary',
              description: 'Multipart file upload only.',
            },
            businessLogo: {
              type: 'string',
              format: 'binary',
              description: 'Multipart file upload only.',
            },
          },
        },

        UpdateProfileSectionInput: {
          type: 'object',
          description:
            'Body for `PATCH /users/profile/{section}`. Section-specific fields. Multipart fields `serviceCategories`, `serviceLocation`, `socialLinks`, `pricePackages`, `portfolioImages` may be JSON-stringified.',
          additionalProperties: true,
        },

        UpdatePasswordInput: {
          type: 'object',
          required: ['currentPassword', 'newPassword', 'passwordConfirm'],
          properties: {
            currentPassword: { type: 'string', minLength: 1 },
            newPassword: { type: 'string', minLength: 8 },
            passwordConfirm: {
              type: 'string',
              minLength: 1,
              description: 'Must equal `newPassword`.',
            },
          },
        },

        NotificationPreferencesUpdateInput: {
          type: 'object',
          description:
            'Body for `PATCH /users/notification-preferences`. Each map keys boolean toggles (e.g. `eventUpdates: true`). Unknown top-level keys are rejected.',
          properties: {
            appNotifications: {
              type: 'object',
              additionalProperties: { type: 'boolean' },
            },
            emailNotifications: {
              type: 'object',
              additionalProperties: { type: 'boolean' },
            },
            smsNotifications: {
              type: 'object',
              additionalProperties: { type: 'boolean' },
            },
          },
        },

        NotificationPreferencesEnvelope: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                preferences: {
                  type: 'object',
                  properties: {
                    appNotifications: {
                      type: 'object',
                      additionalProperties: { type: 'boolean' },
                    },
                    emailNotifications: {
                      type: 'object',
                      additionalProperties: { type: 'boolean' },
                    },
                    smsNotifications: {
                      type: 'object',
                      additionalProperties: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },

        UserProfileEnvelope: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
              },
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
              enum: ['pending_scheduling', 'active', 'paused', 'completed', 'cancelled'],
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
              type: 'object',
              description: 'Delegated to populated plan; only `whatsAppTemplates` after rev. 2 cleanup.',
              properties: {
                whatsAppTemplates: { type: 'integer' },
              },
            },
            limits: {
              type: 'object',
              properties: {
                maxEvents: { type: 'integer' },
                maxInvitesPerEvent: { type: 'integer', nullable: true },
                invitePool: { type: 'integer', nullable: true },
                durationDays: { type: 'integer' },
                maxHosts: { type: 'integer', nullable: true },
              },
            },
          },
        },

        Plan: {
          type: 'object',
          description:
            'Subscription plan as returned by `_formatPlan` in plans.service.js. ' +
            '`pricing.oneTime` is in SAR major units (e.g. 29 = 29.00 SAR).',
          properties: {
            id: { type: 'string' },
            code: { type: 'string', example: 'host_basic_monthly' },
            planType: {
              type: 'string',
              enum: [
                'trial',
                'basic_event', 'basic_monthly',
                'premium_event', 'premium_monthly',
                'business_event', 'business_quarterly', 'business_annual',
                'unlimited',
              ],
            },
            planFamily: {
              type: 'string',
              nullable: true,
              enum: ['basic', 'premium', 'business', null],
            },
            billingType: {
              type: 'string',
              nullable: true,
              enum: ['event', 'monthly', 'quarterly', 'annual', null],
            },
            availableFor: {
              type: 'string',
              enum: ['host', 'whitelabel', 'platform_admin'],
            },
            name: {
              type: 'object',
              properties: {
                ar: { type: 'string' },
                en: { type: 'string' },
              },
            },
            nameAr: { type: 'string' },
            nameEn: { type: 'string' },
            description: {
              type: 'object',
              properties: {
                ar: { type: 'string' },
                en: { type: 'string' },
              },
            },
            descriptionAr: { type: 'string' },
            descriptionEn: { type: 'string' },
            pricing: {
              type: 'object',
              properties: {
                oneTime: {
                  type: 'number',
                  description:
                    'Price in SAR major units (Saudi Riyals). E.g. 29 = 29.00 SAR. ' +
                    'Max 2 decimal places. Conversion to halalas happens inside the payment provider.',
                  example: 29,
                },
              },
            },
            price: {
              type: 'number',
              description: 'Convenience alias for `pricing.oneTime` (SAR major units).',
            },
            currency: {
              type: 'string',
              enum: ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'BHD', 'QAR', 'OMR'],
              example: 'SAR',
            },
            limits: {
              type: 'object',
              properties: {
                maxEvents: { type: 'integer', description: '-1 = unlimited' },
                maxInvitesPerEvent: { type: 'integer', nullable: true },
                invitePool: { type: 'integer', nullable: true },
                durationDays: { type: 'integer' },
                maxHosts: { type: 'integer', nullable: true },
              },
            },
            invites: {
              type: 'integer',
              nullable: true,
              description: 'Per-event invite ceiling (null for pool plans).',
            },
            invitePool: {
              type: 'integer',
              nullable: true,
              description: 'Total pool size for pool plans (null for per-event plans).',
            },
            compensationPool: {
              type: 'integer',
              nullable: true,
              description: 'Compensation invites granted (pool plans only); = floor(invitePool * COMPENSATION_PERCENTAGE / 100). Constant is 15.',
            },
            features: {
              type: 'object',
              description: 'Feature numerics (only `whatsAppTemplates` after rev. 2 cleanup).',
              properties: {
                whatsAppTemplates: {
                  type: 'integer',
                  description: 'Number of custom WhatsApp templates (Business plans: 1 / 3 / 5).',
                },
              },
            },
            setupFeeAmount: {
              type: 'number',
              description: 'One-time setup fee in SAR major units. Non-zero only for business event plans (1,200 SAR); 0 for quarterly/annual (bundled).',
            },
            featureBullets: {
              type: 'object',
              description: 'Localized bullet copy rendered verbatim by <PlanDescription>.',
              properties: {
                ar: { type: 'array', items: { type: 'string' } },
                en: { type: 'array', items: { type: 'string' } },
              },
            },
            isActive: { type: 'boolean' },
            sortOrder: { type: 'integer' },
          },
        },

        PlanCreate: {
          type: 'object',
          description: 'Body for `POST /plans/admin`. See `plans.schemas.js`.',
          required: [
            'code', 'planType', 'nameAr', 'nameEn',
            'pricing', 'limits', 'features',
          ],
          properties: {
            code: {
              type: 'string',
              description: 'Lowercase snake_case unique identifier.',
              example: 'host_basic_monthly',
            },
            planType: {
              type: 'string',
              enum: [
                'trial',
                'basic_event', 'basic_monthly',
                'premium_event', 'premium_monthly',
                'business_event', 'business_quarterly', 'business_annual',
                'unlimited',
              ],
            },
            nameAr: { type: 'string' },
            nameEn: { type: 'string' },
            descriptionAr: { type: 'string' },
            descriptionEn: { type: 'string' },
            pricing: {
              type: 'object',
              required: ['oneTime'],
              properties: {
                oneTime: {
                  type: 'number',
                  description: 'SAR major units, max 2 decimals.',
                  example: 99,
                },
              },
            },
            currency: {
              type: 'string',
              enum: ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'BHD', 'QAR', 'OMR'],
            },
            availableFor: {
              type: 'string',
              enum: ['host', 'whitelabel', 'platform_admin'],
            },
            planFamily: {
              type: 'string',
              nullable: true,
              enum: ['basic', 'premium', 'business', null],
            },
            billingType: {
              type: 'string',
              nullable: true,
              enum: ['event', 'monthly', 'quarterly', 'annual', null],
            },
            limits: {
              type: 'object',
              required: ['maxEvents'],
              properties: {
                maxEvents: { type: 'integer', description: '≥ 1 or -1 = unlimited' },
                maxInvitesPerEvent: { type: 'integer', nullable: true },
                invitePool: { type: 'integer', nullable: true },
                durationDays: { type: 'integer' },
                maxHosts: { type: 'integer', nullable: true },
              },
            },
            features: {
              type: 'object',
              properties: {
                whatsAppTemplates: { type: 'integer', minimum: 0, maximum: 100 },
              },
            },
            setupFeeAmount: {
              type: 'number',
              minimum: 0,
              description: 'One-time setup fee in SAR major units.',
            },
            featureBullets: {
              type: 'object',
              properties: {
                ar: { type: 'array', items: { type: 'string' } },
                en: { type: 'array', items: { type: 'string' } },
              },
            },
            sortOrder: { type: 'integer' },
            isPopular: { type: 'boolean' },
            isActive: { type: 'boolean' },
            isPublic: { type: 'boolean' },
          },
        },

        PlanUpdate: {
          type: 'object',
          description:
            'Body for `PATCH /plans/admin/:code`. All fields optional; ' +
            '`code` and `planType` are immutable and rejected if present.',
          properties: {
            nameAr: { type: 'string' },
            nameEn: { type: 'string' },
            descriptionAr: { type: 'string' },
            descriptionEn: { type: 'string' },
            pricing: {
              type: 'object',
              properties: {
                oneTime: { type: 'number', example: 99 },
              },
            },
            currency: {
              type: 'string',
              enum: ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'BHD', 'QAR', 'OMR'],
            },
            availableFor: {
              type: 'string',
              enum: ['host', 'whitelabel', 'platform_admin'],
            },
            planFamily: {
              type: 'string',
              nullable: true,
              enum: ['basic', 'premium', 'business', null],
            },
            billingType: {
              type: 'string',
              nullable: true,
              enum: ['event', 'monthly', 'quarterly', 'annual', null],
            },
            limits: {
              type: 'object',
              properties: {
                maxEvents: { type: 'integer' },
                maxInvitesPerEvent: { type: 'integer', nullable: true },
                invitePool: { type: 'integer', nullable: true },
                durationDays: { type: 'integer' },
                maxHosts: { type: 'integer', nullable: true },
              },
            },
            features: {
              type: 'object',
              properties: {
                whatsAppTemplates: { type: 'integer', minimum: 0, maximum: 100 },
              },
            },
            setupFeeAmount: { type: 'number', minimum: 0 },
            featureBullets: {
              type: 'object',
              properties: {
                ar: { type: 'array', items: { type: 'string' } },
                en: { type: 'array', items: { type: 'string' } },
              },
            },
            sortOrder: { type: 'integer' },
            isPopular: { type: 'boolean' },
            isActive: { type: 'boolean' },
            isPublic: { type: 'boolean' },
          },
        },

        BusinessPlansResponse: {
          type: 'object',
          description:
            'Shape returned by `GET /plans/business`. Each Plan carries its own ' +
            '`setupFeeAmount` (1,200 for event tiers, 0 for quarterly/annual).',
          properties: {
            event: {
              type: 'array',
              items: { $ref: '#/components/schemas/Plan' },
            },
            quarterly: {
              type: 'array',
              items: { $ref: '#/components/schemas/Plan' },
            },
            annual: {
              type: 'array',
              items: { $ref: '#/components/schemas/Plan' },
            },
          },
        },

        HostPlansResponse: {
          type: 'object',
          description: 'Shape returned by `GET /plans/host`.',
          properties: {
            basic: {
              type: 'object',
              properties: {
                event: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Plan' },
                },
                monthly: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Plan' },
                },
              },
            },
            premium: {
              type: 'object',
              properties: {
                event: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Plan' },
                },
                monthly: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Plan' },
                },
              },
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
        VendorCategoriesResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                categories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      key: { type: 'string', example: 'eventPlanning' },
                      nameEn: { type: 'string', example: 'Event Planning' },
                      nameAr: { type: 'string', example: 'تخطيط الفعاليات' },
                    },
                  },
                },
              },
            },
          },
        },

        Service: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            nameAr: { type: 'string' },
            description: { type: 'string' },
            descriptionAr: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            priceUnit: { type: 'string' },
            currency: { type: 'string' },
            image: { type: 'string', nullable: true },
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
            status: { type: 'string', enum: ['active', 'disabled'] },
            isPublic: { type: 'boolean' },
            rating: { type: 'number' },
            reviewsCount: { type: 'integer' },
            viewCount: { type: 'integer' },
            serviceLocation: {
              type: 'object',
              nullable: true,
            },
            vendor: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                brandName: { type: 'string' },
                logo: { type: 'string', nullable: true },
                avatar: { type: 'string', nullable: true },
                email: { type: 'string', nullable: true },
                phone: { type: 'string', nullable: true },
                website: { type: 'string', nullable: true },
                rating: { type: 'number', nullable: true },
                numberOfRatings: { type: 'integer' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },

        // Location Models
        Region: {
          type: 'object',
          properties: {
            region_id: { type: 'integer', example: 1 },
            capital_city_id: { type: 'integer', example: 3 },
            code: { type: 'string', example: 'RD' },
            name_ar: { type: 'string', example: 'منطقة الرياض' },
            name_en: { type: 'string', example: 'Riyadh' },
            population: { type: 'integer', example: 6777146 },
          },
        },

        City: {
          type: 'object',
          properties: {
            city_id: { type: 'integer', example: 1 },
            region_id: { type: 'integer', example: 7 },
            name_ar: { type: 'string', example: 'تبوك' },
            name_en: { type: 'string', example: 'Tabuk' },
          },
        },

        District: {
          type: 'object',
          properties: {
            district_id: { type: 'integer', example: 10100003001 },
            city_id: { type: 'integer', example: 3 },
            region_id: { type: 'integer', example: 1 },
            name_ar: { type: 'string', example: 'حي العمل' },
            name_en: { type: 'string', example: 'Al Amal Dist.' },
          },
        },

        LocationsAllResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                locations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      region_id: { type: 'integer' },
                      capital_city_id: { type: 'integer' },
                      code: { type: 'string' },
                      name_ar: { type: 'string' },
                      name_en: { type: 'string' },
                      population: { type: 'integer' },
                      cities: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            city_id: { type: 'integer' },
                            region_id: { type: 'integer' },
                            name_ar: { type: 'string' },
                            name_en: { type: 'string' },
                            districts: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/District' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        LocationsSearchResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                regions: { type: 'array', items: { $ref: '#/components/schemas/Region' } },
                cities: { type: 'array', items: { $ref: '#/components/schemas/City' } },
                districts: { type: 'array', items: { $ref: '#/components/schemas/District' } },
              },
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
          required: ['name', 'phone'],
          properties: {
            name: { type: 'string', example: 'John Smith' },
            phone: { type: 'string', example: '501234567' },
            email: { type: 'string', format: 'email' },
          },
        },

        UpdateGuestRequest: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            status: {
              type: 'string',
              enum: ['invited', 'confirmed', 'declined', 'checked_in', 'no_show', 'maybe'],
            },
          },
        },

        GuestRotateQrResponse: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                qrUrl: { type: 'string' },
                expiresAt: { type: 'string', format: 'date-time' },
                delivery: {
                  type: 'object',
                  properties: {
                    attempted: { type: 'boolean' },
                    channel: { type: 'string' },
                    success: { type: 'boolean' },
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
        },

        GuestRevokeAccessResponse: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                revoked: { type: 'boolean' },
                affected: { type: 'integer' },
                wasAlreadyRevoked: { type: 'boolean' },
              },
            },
          },
        },

        AddStaffRequest: {
          type: 'object',
          required: ['name', 'phone'],
          properties: {
            name: { type: 'string' },
            phone: { type: 'string', example: '501234567' },
            status: { type: 'string', enum: ['active', 'inactive'] },
          },
        },

        UpdateStaffRequest: {
          type: 'object',
          minProperties: 1,
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive'] },
          },
        },

        EventUpdateRequest: {
          type: 'object',
          minProperties: 1,
          description: 'Partial update of event details. At least one field is required.',
          properties: {
            title: { type: 'string' },
            type: { type: 'string' },
            date: { type: 'string', format: 'date' },
            time: { type: 'string' },
            location: {
              type: 'object',
              properties: {
                address: { type: 'string' },
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                city: { type: 'string' },
                country: { type: 'string' },
              },
            },
            description: { type: 'string' },
          },
        },

        Step2Request: {
          type: 'object',
          required: ['guestList'],
          description: 'Replaces guestList AND staffList atomically. staffList or supervisorsList must be present.',
          properties: {
            guestList: {
              type: 'array',
              items: { $ref: '#/components/schemas/Guest' },
            },
            staffList: { type: 'array', items: { type: 'object' } },
            supervisorsList: { type: 'array', items: { type: 'object' } },
          },
        },

        LaunchSettingsRequest: {
          type: 'object',
          minProperties: 1,
          properties: {
            scheduledDate: { type: 'string', format: 'date-time' },
            scheduledTime: { type: 'string' },
            launchChannel: { type: 'string' },
          },
        },

        InvitationSettingsRequest: {
          type: 'object',
          description: 'multipart/form-data — text fields can be JSON-encoded objects (eventDetails, visualTemplate, fieldValues, guestReplies); image goes on the `templateImage` file field.',
          properties: {
            visualTemplate: { type: 'object' },
            selectedTemplate: { type: 'object' },
            fieldValues: { type: 'object' },
            guestReplies: { type: 'object' },
            attendanceAutoReply: { type: 'string' },
            absenceAutoReply: { type: 'string' },
            expectedAttendanceAutoReply: { type: 'string' },
            templateImage: { type: 'string', format: 'binary' },
          },
        },

        SendTestMessageRequest: {
          type: 'object',
          required: ['phoneNumber'],
          properties: {
            phoneNumber: { type: 'string', example: '501234567' },
            channel: { type: 'string', enum: ['sms', 'whatsapp'], default: 'whatsapp' },
          },
        },

        BulkDeleteRequest: {
          type: 'object',
          required: ['eventIds'],
          properties: {
            eventIds: {
              type: 'array',
              items: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
              minItems: 1,
              maxItems: 100,
            },
          },
        },

        AdminUpdateStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: [
                'pending_scheduling', 'pending_review', 'scheduled', 'live',
                'published', 'cancelled', 'completed', 'archived',
                'failed', 'deleted',
              ],
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
          required: ['guestId', 'eventId'],
          properties: {
            guestId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            eventId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            channel: {
              type: 'string',
              enum: ['sms', 'whatsapp'],
              default: 'sms',
            },
          },
        },
        SendBulkRequest: {
          type: 'object',
          required: ['guestIds', 'eventId'],
          properties: {
            guestIds: {
              type: 'array',
              items: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
              minItems: 1,
              maxItems: 5000,
            },
            eventId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            channel: {
              type: 'string',
              enum: ['sms', 'whatsapp'],
              default: 'sms',
            },
          },
        },
        RetryMessageRequest: {
          type: 'object',
          required: ['eventId'],
          properties: {
            eventId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            channel: {
              type: 'string',
              enum: ['sms', 'whatsapp'],
              default: 'sms',
            },
          },
        },
        SendReminderRequest: {
          type: 'object',
          required: ['eventId'],
          properties: {
            eventId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            guestIds: {
              type: 'array',
              items: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            },
            channel: {
              type: 'string',
              enum: ['sms', 'whatsapp'],
              default: 'sms',
            },
            customMessage: { type: 'string', maxLength: 1000 },
            reminderTemplateName: {
              type: 'string',
              pattern: '^[a-z0-9_]{1,80}$',
            },
          },
        },
        ScheduleSendRequest: {
          type: 'object',
          required: ['eventId', 'scheduledDate', 'scheduledTime'],
          properties: {
            eventId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            scheduledDate: {
              type: 'string',
              format: 'date-time',
              description: 'ISO 8601 date or date-time, must be in the future',
            },
            scheduledTime: {
              type: 'string',
              pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
              description: 'HH:mm 24-hour wall-clock time (Asia/Riyadh)',
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
                'design_template',
                'business_customization',
              ],
            },
            quantity: {
              type: 'integer',
              description: 'Required for extra_invites',
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
                  enum: ['creditcard', 'stcpay', 'applepay'],
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

        // ---- Checkout (bundled plan + addons) ----
        CheckoutAddonItem: {
          type: 'object',
          required: ['addonType'],
          properties: {
            addonType: {
              type: 'string',
              enum: [
                'extra_invites',
                'design_template',
                'business_customization',
              ],
            },
            quantity: { type: 'integer', minimum: 1, maximum: 50 },
            templateType: {
              type: 'string',
              enum: ['ready_made', 'custom_male', 'custom_themed', 'animated', '3d'],
            },
            scope: {
              type: 'string',
              enum: ['pool', 'org'],
              description: 'Event scope is forbidden in checkout (no event yet at subscription time)',
            },
          },
        },
        CheckoutRequest: {
          type: 'object',
          required: ['planCode'],
          properties: {
            planCode: { type: 'string', example: 'host_basic_monthly' },
            addons: {
              type: 'array',
              maxItems: 20,
              items: { $ref: '#/components/schemas/CheckoutAddonItem' },
            },
            discountCode: { type: 'string' },
            source: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['creditcard', 'stcpay', 'applepay'],
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
            callbackUrl: { type: 'string', format: 'uri' },
          },
        },
        CheckoutTotals: {
          type: 'object',
          properties: {
            planPrice: { type: 'number' },
            addonsTotal: { type: 'number' },
            discountAmount: { type: 'number' },
            total: { type: 'number' },
          },
        },
        CheckoutResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                subscription: { $ref: '#/components/schemas/Subscription' },
                addons: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Addon' },
                },
                failedAddons: {
                  type: 'array',
                  description: 'Per-line refund tickets for addons that could not be activated',
                  items: {
                    type: 'object',
                    properties: {
                      addonType: { type: 'string' },
                      quantity: { type: 'integer' },
                      price: { type: 'number' },
                      reason: { type: 'string' },
                    },
                  },
                },
                paymentId: { type: 'string', nullable: true },
                totals: { $ref: '#/components/schemas/CheckoutTotals' },
              },
            },
          },
        },
        Checkout3DSResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                requiresAction: { type: 'boolean', example: true },
                redirectUrl: { type: 'string', format: 'uri' },
                paymentId: { type: 'string' },
                totals: { $ref: '#/components/schemas/CheckoutTotals' },
              },
            },
          },
        },

        // ---- Payment Models ----
        PaymentMethod: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'creditcard' },
            last4: { type: 'string', example: '4242' },
            brand: { type: 'string', example: 'visa' },
          },
        },
        PaymentRefund: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            reason: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string', nullable: true },
            moyasarRefundResponseStatus: { type: 'string' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            whitelabelId: { type: 'string', nullable: true },
            subscriptionId: { type: 'string', nullable: true },
            addonId: { type: 'string', nullable: true },
            amount: { type: 'number' },
            currency: { type: 'string', example: 'SAR' },
            status: {
              type: 'string',
              enum: [
                'pending', 'pending_3ds', 'authorized', 'paid', 'captured',
                'failed', 'voided', 'refunded', 'partially_refunded',
              ],
            },
            providerStatus: { type: 'string' },
            paymentMethod: { $ref: '#/components/schemas/PaymentMethod' },
            moyasarPaymentId: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            refundedAmount: { type: 'number' },
            refunds: {
              type: 'array',
              items: { $ref: '#/components/schemas/PaymentRefund' },
            },
            capturedAmount: { type: 'number', nullable: true },
            capturedAt: { type: 'string', format: 'date-time', nullable: true },
            authorizedAt: { type: 'string', format: 'date-time', nullable: true },
            paidAt: { type: 'string', format: 'date-time', nullable: true },
            voidedAt: { type: 'string', format: 'date-time', nullable: true },
            refundedAt: { type: 'string', format: 'date-time', nullable: true },
            initiatedAt: { type: 'string', format: 'date-time' },
            metadata: { type: 'object', additionalProperties: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PaymentResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            status: { type: 'string', example: 'success' },
            data: { $ref: '#/components/schemas/Payment' },
          },
        },
        MoyasarWebhookPayload: {
          type: 'object',
          required: ['type', 'data'],
          properties: {
            id: { type: 'string', description: 'Moyasar event UUID' },
            type: {
              type: 'string',
              enum: [
                'payment_paid', 'payment_failed', 'payment_refunded',
                'payment_captured', 'payment_authorized', 'payment_voided',
                'payment_updated', 'invoice_paid', 'invoice_failed',
              ],
            },
            account_name: { type: 'string' },
            live: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            secret_token: {
              type: 'string',
              description: 'Constant per-webhook secret; alternatively sent as X-Moyasar-Auth header',
            },
            data: {
              type: 'object',
              description: 'Provider Payment object — same shape as GET /payments/:id',
              additionalProperties: true,
            },
          },
        },

        // ---- Discount Models ----
        Discount: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            code: { type: 'string', example: 'WELCOME10' },
            descriptionEn: { type: 'string' },
            descriptionAr: { type: 'string' },
            discountType: { type: 'string', enum: ['percentage', 'fixed'] },
            value: { type: 'number', example: 10 },
            maxUses: { type: 'integer', description: '0 = unlimited' },
            usedCount: { type: 'integer' },
            validFrom: { type: 'string', format: 'date-time' },
            validUntil: { type: 'string', format: 'date-time', nullable: true },
            isActive: { type: 'boolean' },
            applicablePlanTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'trial', 'basic_event', 'basic_monthly',
                  'premium_event', 'premium_monthly',
                  'business_event', 'business_quarterly', 'business_annual',
                  'unlimited',
                ],
              },
              description: 'Empty = applies to all plan types',
            },
            minimumAmount: { type: 'number' },
            createdBy: { type: 'object', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        DiscountInput: {
          type: 'object',
          required: ['code', 'discountType', 'value'],
          properties: {
            code: {
              type: 'string',
              pattern: '^[A-Z0-9_-]{3,30}$',
              example: 'WELCOME10',
            },
            descriptionEn: { type: 'string', maxLength: 200 },
            descriptionAr: { type: 'string', maxLength: 200 },
            discountType: { type: 'string', enum: ['percentage', 'fixed'] },
            value: {
              type: 'number',
              minimum: 0,
              description: 'Percentage discounts must be <= 100',
            },
            maxUses: { type: 'integer', minimum: 0 },
            validFrom: { type: 'string', format: 'date-time' },
            validUntil: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean' },
            applicablePlanTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'trial', 'basic_event', 'basic_monthly',
                  'premium_event', 'premium_monthly',
                  'business_event', 'business_quarterly', 'business_annual',
                  'unlimited',
                ],
              },
            },
            minimumAmount: { type: 'number', minimum: 0 },
          },
        },
        DiscountValidateRequest: {
          type: 'object',
          required: ['code', 'amount'],
          properties: {
            code: { type: 'string', pattern: '^[A-Z0-9_-]{3,30}$' },
            amount: { type: 'number', minimum: 0 },
            planType: {
              type: 'string',
              nullable: true,
              enum: [
                'trial', 'basic_event', 'basic_monthly',
                'premium_event', 'premium_monthly',
                'business_event', 'business_quarterly', 'business_annual',
                'unlimited',
              ],
            },
          },
        },
        DiscountValidateResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    valid: { type: 'boolean', example: false },
                    reason: { type: 'string' },
                  },
                },
                {
                  type: 'object',
                  properties: {
                    valid: { type: 'boolean', example: true },
                    code: { type: 'string' },
                    discountType: { type: 'string', enum: ['percentage', 'fixed'] },
                    value: { type: 'number' },
                    discountAmount: { type: 'number' },
                    finalAmount: { type: 'number' },
                    descriptionEn: { type: 'string' },
                    descriptionAr: { type: 'string' },
                  },
                },
              ],
            },
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

        // Templates module
        TemplateFieldDef: {
          type: 'object',
          required: ['key', 'type', 'labelEn', 'labelAr'],
          properties: {
            key: { type: 'string' },
            type: {
              type: 'string',
              enum: ['text', 'textarea', 'date', 'time', 'color', 'font', 'number', 'email', 'password'],
            },
            labelEn: { type: 'string' },
            labelAr: { type: 'string' },
            placeholderEn: { type: 'string' },
            placeholderAr: { type: 'string' },
            required: { type: 'boolean' },
            minLength: { type: 'integer' },
            maxLength: { type: 'integer' },
            defaultValue: {},
            rows: { type: 'integer' },
            inputMode: { type: 'string', enum: ['text', 'numeric', 'decimal', 'tel', 'email', 'url'] },
            autoCapitalize: { type: 'string', enum: ['none', 'sentences', 'words', 'characters'] },
            dir: { type: 'string', enum: ['auto', 'ltr', 'rtl'] },
            min: { type: 'number' },
            max: { type: 'number' },
            step: { type: 'number' },
          },
        },
        TemplateOverlay: {
          type: 'object',
          required: ['fieldKey', 'topPct', 'leftPct'],
          properties: {
            fieldKey: { type: 'string' },
            topPct: { type: 'number' },
            leftPct: { type: 'number' },
            widthPct: { type: 'number' },
            fontSizeVh: { type: 'number' },
            fontWeight: { type: 'string' },
            textAlign: { type: 'string', enum: ['left', 'center', 'right'] },
            colorBinding: { type: 'string', enum: ['primary', 'custom'] },
            color: { type: 'string' },
            fontFamily: { type: 'string' },
            zIndex: { type: 'integer' },
          },
        },
        TemplateDecoration: {
          type: 'object',
          required: ['type', 'source', 'topPct', 'leftPct', 'widthPct'],
          properties: {
            type: { type: 'string', enum: ['icon', 'image'] },
            source: { type: 'string' },
            color: { type: 'string' },
            topPct: { type: 'number' },
            leftPct: { type: 'number' },
            widthPct: { type: 'number' },
            iconSizeVh: { type: 'number' },
            zIndex: { type: 'integer' },
          },
        },
        Template: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            nameEn: { type: 'string' },
            nameAr: { type: 'string' },
            categories: { type: 'array', items: { type: 'string' } },
            imageUrl: { type: 'string' },
            imageS3Key: { type: 'string' },
            thumbnailUrl: { type: 'string', nullable: true },
            thumbnailS3Key: { type: 'string', nullable: true },
            naturalWidth: { type: 'number' },
            naturalHeight: { type: 'number' },
            fields: { type: 'array', items: { $ref: '#/components/schemas/TemplateFieldDef' } },
            overlays: { type: 'array', items: { $ref: '#/components/schemas/TemplateOverlay' } },
            decorations: { type: 'array', items: { $ref: '#/components/schemas/TemplateDecoration' } },
            sortOrder: { type: 'integer' },
            active: { type: 'boolean' },
            deletedAt: { type: 'string', format: 'date-time', nullable: true },
            version: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TemplateEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: { template: { $ref: '#/components/schemas/Template' } },
            },
          },
        },
        TemplateListEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                templates: { type: 'array', items: { $ref: '#/components/schemas/Template' } },
              },
            },
          },
        },
        TemplateCreateInput: {
          type: 'object',
          required: ['nameEn', 'nameAr', 'categories', 's3Key', 'naturalWidth', 'naturalHeight'],
          properties: {
            nameEn: { type: 'string' },
            nameAr: { type: 'string' },
            categories: { type: 'array', items: { type: 'string' }, minItems: 1 },
            s3Key: { type: 'string' },
            naturalWidth: { type: 'number' },
            naturalHeight: { type: 'number' },
            fields: { type: 'array', items: { $ref: '#/components/schemas/TemplateFieldDef' } },
            overlays: { type: 'array', items: { $ref: '#/components/schemas/TemplateOverlay' } },
            decorations: { type: 'array', items: { $ref: '#/components/schemas/TemplateDecoration' } },
            sortOrder: { type: 'integer' },
            active: { type: 'boolean' },
          },
        },
        TemplateUpdateInput: {
          type: 'object',
          required: ['expectedVersion'],
          properties: {
            nameEn: { type: 'string' },
            nameAr: { type: 'string' },
            categories: { type: 'array', items: { type: 'string' } },
            s3Key: { type: 'string' },
            naturalWidth: { type: 'number' },
            naturalHeight: { type: 'number' },
            fields: { type: 'array', items: { $ref: '#/components/schemas/TemplateFieldDef' } },
            overlays: { type: 'array', items: { $ref: '#/components/schemas/TemplateOverlay' } },
            decorations: { type: 'array', items: { $ref: '#/components/schemas/TemplateDecoration' } },
            sortOrder: { type: 'integer' },
            active: { type: 'boolean' },
            expectedVersion: { type: 'integer' },
          },
        },
        VarMappingEntry: {
          type: 'object',
          required: ['placeholder', 'sourceKey'],
          properties: {
            placeholder: { type: 'string', example: '{{1}}' },
            sourceKey: { type: 'string', example: 'guest.name' },
            fallback: { type: 'string', example: '' },
          },
        },
        TaqnyatTemplate: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            taqnyatId: { type: 'string' },
            templateName: { type: 'string' },
            language: { type: 'string', example: 'ar' },
            status: { type: 'string', enum: ['APPROVED', 'PENDING', 'REJECTED'] },
            metaCategory: { type: 'string', nullable: true },
            category: { type: 'string', nullable: true },
            bodyText: { type: 'string' },
            hasImageHeader: { type: 'boolean' },
            varMapping: {
              type: 'array',
              items: { $ref: '#/components/schemas/VarMappingEntry' },
            },
            active: { type: 'boolean' },
            removedFromMeta: { type: 'boolean' },
            lastSyncedAt: { type: 'string', format: 'date-time', nullable: true },
            sortOrder: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TaqnyatTemplateCreateRequest: {
          type: 'object',
          required: ['name', 'category', 'bodyText'],
          properties: {
            name: { type: 'string', pattern: '^[a-z][a-z0-9_]{0,511}$' },
            category: { type: 'string', enum: ['UTILITY', 'MARKETING', 'AUTHENTICATION'] },
            language: { type: 'string', enum: ['ar', 'en'], default: 'ar' },
            headerText: { type: 'string', maxLength: 60 },
            bodyText: { type: 'string', maxLength: 1024 },
            bodyExamples: { type: 'array', items: { type: 'string', maxLength: 60 } },
            footerText: { type: 'string', maxLength: 60 },
          },
        },
        TaqnyatTemplateAssignRequest: {
          type: 'object',
          properties: {
            category: { type: 'string', nullable: true },
            varMapping: {
              type: 'array',
              items: { $ref: '#/components/schemas/VarMappingEntry' },
            },
            active: { type: 'boolean' },
            sortOrder: { type: 'integer', minimum: 0 },
          },
        },
        TemplateUploadImageEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: { s3Key: { type: 'string' } },
            },
          },
        },
        TemplateCategory: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            code: { type: 'string' },
            nameEn: { type: 'string' },
            nameAr: { type: 'string' },
            sortOrder: { type: 'integer' },
            active: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TemplateCategoryEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: { category: { $ref: '#/components/schemas/TemplateCategory' } },
            },
          },
        },
        TemplateCategoryListEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                categories: { type: 'array', items: { $ref: '#/components/schemas/TemplateCategory' } },
              },
            },
          },
        },
        TemplateCategoryCreateInput: {
          type: 'object',
          required: ['code', 'nameEn', 'nameAr'],
          properties: {
            code: { type: 'string', pattern: '^[a-z0-9_]+$' },
            nameEn: { type: 'string' },
            nameAr: { type: 'string' },
            sortOrder: { type: 'integer' },
            active: { type: 'boolean' },
          },
        },
        TemplateCategoryUpdateInput: {
          type: 'object',
          properties: {
            nameEn: { type: 'string' },
            nameAr: { type: 'string' },
            sortOrder: { type: 'integer' },
            active: { type: 'boolean' },
          },
        },
        TemplateFontEntry: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            webFamily: { type: 'string' },
            mobileFamily: { type: 'string' },
            supportsArabic: { type: 'boolean' },
            weights: { type: 'array', items: { type: 'string' } },
          },
        },
        TemplateFontListEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                fonts: { type: 'array', items: { $ref: '#/components/schemas/TemplateFontEntry' } },
              },
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
        EventEditLockedError: {
          description: 'Event launch settings are locked within the 24h pre-launch window',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                status: 'error',
                code: 'EVENT_EDIT_LOCKED',
                message: 'Cannot edit launch settings within 24h of scheduled time',
                statusCode: 400,
              },
            },
          },
        },
        GuestListBelowConfirmedError: {
          description: 'Guest list cannot drop below the count of already-confirmed guests',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                status: 'error',
                code: 'GUEST_LIST_BELOW_CONFIRMED',
                message: 'Cannot reduce guest list below confirmed guests',
                statusCode: 400,
              },
            },
          },
        },
        EventNotRetryableError: {
          description: 'Event is not in a retryable state (failed/scheduled)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                status: 'error',
                code: 'EVENT_NOT_RETRYABLE',
                message: 'Event is not in a retryable state',
                statusCode: 409,
              },
            },
          },
        },
        GuestLimitExceededError: {
          description: 'Plan/event guest cap exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                status: 'error',
                code: 'PACKAGE_LIMIT',
                message: 'Guest limit exceeded',
                statusCode: 400,
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
