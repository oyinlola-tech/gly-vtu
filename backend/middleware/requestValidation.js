import Joi from 'joi';
import { logger } from '../utils/logger.js';

/**
 * Centralized validation schemas for all API endpoints
 * Prevents inconsistent validation across routes
 */

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export const registrationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required'
    }),

  fullName: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Full name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'Full name is required'
    }),

  phone: Joi.string()
    .pattern(/^(\+234|0)[789][0-9]{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Nigerian phone number. Format: +2347012345678 or 07012345678',
      'any.required': 'Phone number is required'
    }),

  dateOfBirth: Joi.date()
    .max('now')
    .required()
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),

  agreedToTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must agree to the terms and conditions'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required(),

  password: Joi.string()
    .required(),

  totp: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .optional()
    .messages({
      'string.length': 'TOTP code must be 6 digits'
    }),
  backupCode: Joi.string()
    .min(6)
    .max(12)
    .optional()
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters'
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match'
    })
});

// ============================================================================
// FINANCIAL TRANSACTION SCHEMAS
// ============================================================================

export const billPaymentSchema = Joi.object({
  serviceId: Joi.string()
    .required()
    .pattern(/^[a-z0-9-]+$/i)
    .max(50)
    .messages({
      'string.pattern.base': 'Invalid service ID format',
      'any.required': 'Service ID is required'
    }),

  amount: Joi.number()
    .required()
    .min(100)                              // Minimum ₦100
    .max(1_000_000)                        // Maximum ₦1,000,000
    .integer()
    .messages({
      'number.min': 'Amount must be at least ₦100',
      'number.max': 'Amount cannot exceed ₦1,000,000',
      'number.base': 'Amount must be a number'
    }),

  pin: Joi.string()
    .required()
    .length(6)
    .pattern(/^\d+$/)
    .messages({
      'string.length': 'PIN must be 6 digits',
      'string.pattern.base': 'PIN must contain only digits'
    }),

  phone: Joi.string()
    .required()
    .pattern(/^(\+234|0)[789][0-9]{9}$/)
    .messages({
      'string.pattern.base': 'Invalid Nigerian phone number'
    }),

  metadata: Joi.object()
    .optional()
    .keys({
      reference: Joi.string().max(100),
      customerId: Joi.string().uuid()
    })
});

export const walletTransferSchema = Joi.object({
  recipientId: Joi.string()
    .required()
    .uuid()
    .messages({
      'string.guid': 'Invalid recipient ID',
      'any.required': 'Recipient ID is required'
    }),

  amount: Joi.number()
    .required()
    .min(100)
    .max(10_000_000)
    .integer()
    .messages({
      'number.min': 'Amount must be at least ₦100',
      'number.max': 'Amount cannot exceed ₦10,000,000'
    }),

  pin: Joi.string()
    .required()
    .length(6)
    .pattern(/^\d+$/)
    .messages({
      'string.length': 'PIN must be 6 digits'
    }),

  description: Joi.string()
    .max(500)
    .optional()
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).pattern(/^\d+$/).required(),
  newPassword: Joi.string().min(10).max(128).required(),
});

export const verifyDeviceSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).pattern(/^\d+$/).optional(),
  securityAnswer: Joi.string().min(2).max(200).optional(),
  deviceId: Joi.string().guid({ version: 'uuidv4' }).optional(),
  label: Joi.string().max(120).optional(),
  totp: Joi.string().length(6).pattern(/^\d+$/).optional(),
  backupCode: Joi.string().min(6).max(12).optional(),
}).or('code', 'securityAnswer');

export const securityQuestionSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const walletSendSchema = Joi.object({
  amount: Joi.number()
    .required()
    .min(100)
    .max(10_000_000)
    .integer()
    .messages({
      'number.min': 'Amount must be at least ₦100',
      'number.max': 'Amount cannot exceed ₦10,000,000',
    }),
  pin: Joi.string()
    .required()
    .length(6)
    .pattern(/^\d+$/)
    .messages({
      'string.length': 'PIN must be 6 digits',
    }),
  to: Joi.string()
    .max(120)
    .optional(),
  channel: Joi.string()
    .valid('bank', 'internal')
    .optional(),
  accountNumber: Joi.string()
    .pattern(/^\d{6,20}$/)
    .optional(),
  bankCode: Joi.string()
    .pattern(/^\d{3,10}$/)
    .optional(),
  accountName: Joi.string()
    .min(2)
    .max(120)
    .optional(),
})
  .with('accountNumber', ['bankCode', 'accountName'])
  .with('bankCode', ['accountNumber', 'accountName'])
  .with('accountName', ['accountNumber', 'bankCode'])
  .xor('to', 'accountNumber');

export const walletReceiveSchema = Joi.object({
  amount: Joi.number()
    .required()
    .min(100)
    .max(10_000_000)
    .integer(),
  note: Joi.string()
    .max(500)
    .optional(),
});

export const recipientLookupSchema = Joi.object({
  recipient: Joi.string()
    .trim()
    .max(254)
    .required()
    .messages({
      'any.required': 'Recipient is required',
      'string.max': 'Recipient is too long'
    }),
});

// ============================================================================
// ADMIN AUTH SCHEMAS
// ============================================================================

export const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  totp: Joi.string().length(6).pattern(/^\d+$/).optional(),
  backupCode: Joi.string().min(6).max(12).optional(),
  deviceId: Joi.string().guid({ version: 'uuidv4' }).optional(),
});

export const adminForgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const adminResetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).pattern(/^\d+$/).required(),
  newPassword: Joi.string().min(10).max(128).required(),
});

export const adminTotpEnableSchema = Joi.object({
  token: Joi.string().length(6).pattern(/^\d+$/).required(),
});

export const adminTotpDisableSchema = Joi.object({
  token: Joi.string().length(6).pattern(/^\d+$/).optional(),
  backupCode: Joi.string().min(6).max(12).optional(),
}).or('token', 'backupCode');

// ============================================================================
// TRANSACTIONS SCHEMAS
// ============================================================================

export const transactionIdParamSchema = Joi.object({
  id: Joi.string().guid({ version: 'uuidv4' }).required(),
});

export const statementSchema = Joi.object({
  startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
});

export const cardAdditionSchema = Joi.object({
  cardNumber: Joi.string()
    .required()
    .pattern(/^\d{13,19}$/)
    .messages({
      'string.pattern.base': 'Invalid card number'
    }),

  expiryMonth: Joi.number()
    .min(1)
    .max(12)
    .required(),

  expiryYear: Joi.number()
    .min(new Date().getFullYear())
    .required(),

  cvv: Joi.string()
    .required()
    .pattern(/^\d{3,4}$/)
    .messages({
      'string.pattern.base': 'CVV must be 3 or 4 digits'
    }),

  holderName: Joi.string()
    .required()
    .pattern(/^[a-zA-Z\s]*$/)
    .messages({
      'string.pattern.base': 'Cardholder name should only contain letters'
    })
});

// ============================================================================
// KYC/VERIFICATION SCHEMAS
// ============================================================================

export const kycSchema = Joi.object({
  bvn: Joi.string()
    .required()
    .length(11)
    .pattern(/^\d+$/)
    .messages({
      'string.length': 'BVN must be exactly 11 digits',
      'string.pattern.base': 'BVN must contain only digits'
    }),

  nin: Joi.string()
    .optional()
    .length(11)
    .pattern(/^\d+$/)
    .messages({
      'string.length': 'NIN must be exactly 11 digits'
    }),

  fullName: Joi.string()
    .required()
    .min(5)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .messages({
      'string.pattern.base': 'Full name format invalid'
    }),

  dateOfBirth: Joi.date()
    .required()
    .max('now')
    .min('1930-01-01')
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),

  gender: Joi.string()
    .required()
    .valid('M', 'F', 'Other')
    .messages({
      'any.only': 'Gender must be M, F, or Other'
    }),

  address: Joi.string()
    .required()
    .min(10)
    .max(500)
    .messages({
      'string.min': 'Address must be at least 10 characters'
    }),

  city: Joi.string()
    .required()
    .min(2)
    .max(50),

  state: Joi.string()
    .required()
    .min(2)
    .max(50),

  idType: Joi.string()
    .required()
    .valid('passport', 'drivers_license', 'national_id', 'voter_card')
    .messages({
      'any.only': 'Invalid ID type'
    }),

  idNumber: Joi.string()
    .required()
    .min(5)
    .max(50),

  idExpiryDate: Joi.date()
    .required()
    .min(Joi.ref('now'))
    .messages({
      'date.min': 'ID document must not be expired'
    }),

  phone: Joi.string()
    .required()
    .pattern(/^(\+234|0)[789][0-9]{9}$/),

  email: Joi.string()
    .required()
    .email()
});

export const kycPayloadSchema = Joi.object({
  bvn: Joi.string()
    .length(11)
    .pattern(/^\d+$/)
    .optional(),
  nin: Joi.string()
    .length(11)
    .pattern(/^\d+$/)
    .optional(),
  dob: Joi.date()
    .max('now')
    .min('1930-01-01')
    .optional(),
  address: Joi.string()
    .min(10)
    .max(500)
    .optional(),
  phone: Joi.string()
    .pattern(/^(\+234|0)[789][0-9]{9}$/)
    .optional(),
}).unknown(false);

export const kycSubmissionSchema = Joi.object({
  level: Joi.number().valid(2, 3).required(),
  payload: kycPayloadSchema.required(),
});

export const billsQuoteSchema = Joi.object({
  providerCode: Joi.string().required().max(60),
  amount: Joi.number().min(50).max(5_000_000).optional(),
  variationCode: Joi.string().max(100).optional(),
});

export const billsPaySchema = Joi.object({
  providerCode: Joi.string().required().max(60),
  amount: Joi.number().min(50).max(5_000_000).optional(),
  account: Joi.string().required().max(50),
  pin: Joi.string().required().length(6).pattern(/^\d+$/),
  variationCode: Joi.string().max(100).optional(),
  phone: Joi.string()
    .pattern(/^(\+234|0)[789][0-9]{9}$/)
    .optional(),
  subscriptionType: Joi.string().max(30).optional(),
});

export const billsPayCardSchema = Joi.object({
  providerCode: Joi.string().required().max(60),
  amount: Joi.number().min(50).max(5_000_000).optional(),
  account: Joi.string().required().max(50),
  variationCode: Joi.string().max(100).optional(),
});

export const billsProvidersQuerySchema = Joi.object({
  category: Joi.string().max(60).required(),
});

export const billsVariationsQuerySchema = Joi.object({
  serviceID: Joi.string().max(60).required(),
});

// ============================================================================
// CARDS SCHEMAS
// ============================================================================

export const cardIdParamSchema = Joi.object({
  cardId: Joi.string().max(80).required(),
});

export const cardSettingsSchema = Joi.object({
  dailyLimit: Joi.number().min(100).max(100_000_000).optional(),
  monthlyLimit: Joi.number().min(100).max(1_000_000_000).optional(),
  merchantLocks: Joi.string().max(500).allow('').optional(),
  autoFreeze: Joi.boolean().optional(),
});

export const cardAuthorizeSchema = Joi.object({
  amount: Joi.number().min(1).max(1_000_000_000).required(),
  merchant: Joi.string().min(2).max(120).required(),
});

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const securityEventsQuerySchema = Joi.object({
  export: Joi.string().valid('csv', 'json').optional(),
  limit: Joi.number().min(1).max(200).optional(),
  offset: Joi.number().min(0).max(10_000).optional(),
});

export const deviceIdParamSchema = Joi.object({
  id: Joi.string().guid({ version: 'uuidv4' }).required(),
});

export const deviceLabelSchema = Joi.object({
  label: Joi.string().max(120).required(),
});

export const pinSetupSchema = Joi.object({
  pin: Joi.string().length(6).pattern(/^\d+$/).required(),
});

export const pinChangeSchema = Joi.object({
  currentPin: Joi.string().length(6).pattern(/^\d+$/).required(),
  newPin: Joi.string().length(6).pattern(/^\d+$/).required(),
});

export const pinVerifySchema = Joi.object({
  pin: Joi.string().length(6).pattern(/^\d+$/).required(),
});

export const biometricSchema = Joi.object({
  enabled: Joi.boolean().required(),
});

export const accountClosureRequestSchema = Joi.object({
  reason: Joi.string().min(3).max(500).required(),
  feedbackMessage: Joi.string().max(1000).optional(),
});

export const accountClosureCancelQuerySchema = Joi.object({
  token: Joi.string().min(32).max(128).required(),
});

export const securityQuestionSetSchema = Joi.object({
  question: Joi.string().min(5).max(200).required(),
  answer: Joi.string().min(2).max(200).required(),
});

export const securityQuestionEnableSchema = Joi.object({
  enabled: Joi.boolean().required(),
});

export const securityQuestionVerifySchema = Joi.object({
  answer: Joi.string().min(2).max(200).required(),
});

export const totpEnableSchema = Joi.object({
  token: Joi.string().length(6).pattern(/^\d+$/).required(),
});

export const totpDisableSchema = Joi.object({
  token: Joi.string().length(6).pattern(/^\d+$/).optional(),
  backupCode: Joi.string().min(6).max(12).optional(),
}).or('token', 'backupCode');

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const adminUserIdParamSchema = Joi.object({
  id: Joi.string().guid({ version: 'uuidv4' }).required(),
});

export const adminKycUpdateSchema = Joi.object({
  status: Joi.string().valid('verified', 'rejected', 'pending').required(),
  level: Joi.number().valid(1, 2, 3).required(),
});

export const adminBillsCategorySchema = Joi.object({
  code: Joi.string().max(60).required(),
  name: Joi.string().max(120).required(),
  description: Joi.string().max(300).required(),
});

export const adminBillsCategoryUpdateSchema = Joi.object({
  name: Joi.string().max(120).required(),
  description: Joi.string().max(300).required(),
  active: Joi.boolean().required(),
});

export const adminBillsProviderSchema = Joi.object({
  categoryId: Joi.string().max(60).required(),
  name: Joi.string().max(120).required(),
  code: Joi.string().max(60).required(),
  logoUrl: Joi.string().uri().max(500).allow('', null).optional(),
});

export const adminBillsProviderUpdateSchema = Joi.object({
  name: Joi.string().max(120).required(),
  code: Joi.string().max(60).required(),
  logoUrl: Joi.string().uri().max(500).allow('', null).optional(),
  active: Joi.boolean().required(),
});

export const adminPricingSchema = Joi.object({
  providerId: Joi.string().max(60).required(),
  baseFee: Joi.number().min(0).max(5_000_000).optional(),
  markupType: Joi.string().valid('flat', 'percent').optional(),
  markupValue: Joi.number().min(0).max(100_000).optional(),
  currency: Joi.string().length(3).optional(),
});

export const adminPricingUpdateSchema = Joi.object({
  baseFee: Joi.number().min(0).max(5_000_000).optional(),
  markupType: Joi.string().valid('flat', 'percent').optional(),
  markupValue: Joi.number().min(0).max(100_000).optional(),
  currency: Joi.string().length(3).optional(),
  active: Joi.boolean().required(),
});

export const adminManagementCreateSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(10).max(128).required(),
  role: Joi.string().min(2).max(60).required(),
});

export const adminRoleUpdateSchema = Joi.object({
  role: Joi.string().min(2).max(60).required(),
});

export const adminAdjustmentCreateSchema = Joi.object({
  userId: Joi.string().guid({ version: 'uuidv4' }).required(),
  type: Joi.string().valid('credit', 'debit').required(),
  amount: Joi.number().min(1).max(1_000_000_000).required(),
  reason: Joi.string().max(500).optional(),
});

export const adminAdjustmentsQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
});

export const adminAdjustmentIdParamSchema = Joi.object({
  id: Joi.string().max(80).required(),
});

export const adminReferenceParamSchema = Joi.object({
  reference: Joi.string().max(120).required(),
});

export const adminFinanceExportQuerySchema = Joi.object({
  format: Joi.string().valid('csv', 'pdf').optional(),
  from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const adminFinanceBalancesQuerySchema = Joi.object({
  limit: Joi.number().min(1).max(200).optional(),
  offset: Joi.number().min(0).max(10_000).optional(),
});

export const adminConversationIdParamSchema = Joi.object({
  id: Joi.string().guid({ version: 'uuidv4' }).required(),
});

export const adminConversationSendSchema = Joi.object({
  text: Joi.string().min(1).max(2000).required(),
});

export const conversationSendSchema = Joi.object({
  text: Joi.string().min(1).max(2000).required(),
});

export const notificationsReadSchema = Joi.object({
  ids: Joi.array()
    .items(Joi.string().guid({ version: 'uuidv4' }))
    .min(1)
    .max(200)
    .required(),
});

export const bankResolveSchema = Joi.object({
  accountNumber: Joi.string().pattern(/^\d{8,20}$/).required(),
  bankCode: Joi.string().pattern(/^\d{3,10}$/).optional(),
});

export const adminNotificationSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  body: Joi.string().min(2).max(2000).required(),
  type: Joi.string().valid('info', 'warning', 'success', 'error').optional(),
  userId: Joi.string().guid({ version: 'uuidv4' }).optional(),
  force: Joi.boolean().optional(),
  data: Joi.object().optional(),
});

export const adminNotificationHistoryQuerySchema = Joi.object({
  limit: Joi.number().min(1).max(200).optional(),
  offset: Joi.number().min(0).max(10_000).optional(),
});

export const adminFlutterwaveRequerySchema = Joi.object({
  userId: Joi.string().guid({ version: 'uuidv4' }).optional(),
  accountReference: Joi.string().max(120).optional(),
}).or('userId', 'accountReference');

export const adminVtpassEventsQuerySchema = Joi.object({
  limit: Joi.number().min(1).max(200).optional(),
  offset: Joi.number().min(0).max(10_000).optional(),
  status: Joi.string().max(20).optional(),
});

export const adminVtpassRequerySchema = Joi.object({
  requestId: Joi.string().max(120).required(),
});

export const cardCreateSchema = Joi.object({
  amount: Joi.number().required().min(100).max(5_000_000).integer(),
  currency: Joi.string().length(3).optional(),
  pin: Joi.string().required().length(6).pattern(/^\d+$/),
});

export const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  phone: Joi.string()
    .pattern(/^(\+234|0)[789][0-9]{9}$/)
    .optional(),
});

// ============================================================================
// MIDDLEWARE FACTORY
// ============================================================================

/**
 * Create validation middleware for any Joi schema
 * Validates request body and attaches validated data to req.validated
 */
export function createValidationMiddleware(schema, options = {}) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      ...options
    });

    if (error) {
      // Log validation errors (without sensitive data)
      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors: error.details.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          type: e.type
        }))
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    req.validated = value;
    next();
  };
}

/**
 * Shorthand: Create and apply validation in one call
 */
export function validateRequest(schema) {
  return createValidationMiddleware(schema);
}

/**
 * Validate query parameters
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        error: 'Query validation failed',
        details: error.details
      });
    }

    req.validatedQuery = value;
    next();
  };
}

/**
 * Validate path parameters
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        error: 'Path parameter validation failed',
        details: error.details
      });
    }

    req.validatedParams = value;
    next();
  };
}

export default {
  // Schemas
  registrationSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyDeviceSchema,
  securityQuestionSchema,
  changePasswordSchema,
  billPaymentSchema,
  walletTransferSchema,
  walletSendSchema,
  walletReceiveSchema,
  recipientLookupSchema,
  adminLoginSchema,
  adminForgotPasswordSchema,
  adminResetPasswordSchema,
  adminTotpEnableSchema,
  adminTotpDisableSchema,
  transactionIdParamSchema,
  statementSchema,
  cardAdditionSchema,
  kycSchema,
  kycPayloadSchema,
  kycSubmissionSchema,
  billsQuoteSchema,
  billsPaySchema,
  billsPayCardSchema,
  billsProvidersQuerySchema,
  billsVariationsQuerySchema,
  cardIdParamSchema,
  cardSettingsSchema,
  cardAuthorizeSchema,
  securityEventsQuerySchema,
  deviceIdParamSchema,
  deviceLabelSchema,
  pinSetupSchema,
  pinChangeSchema,
  pinVerifySchema,
  biometricSchema,
  accountClosureRequestSchema,
  accountClosureCancelQuerySchema,
  securityQuestionSetSchema,
  securityQuestionEnableSchema,
  securityQuestionVerifySchema,
  totpEnableSchema,
  totpDisableSchema,
  adminUserIdParamSchema,
  adminKycUpdateSchema,
  adminBillsCategorySchema,
  adminBillsCategoryUpdateSchema,
  adminBillsProviderSchema,
  adminBillsProviderUpdateSchema,
  adminPricingSchema,
  adminPricingUpdateSchema,
  adminManagementCreateSchema,
  adminRoleUpdateSchema,
  adminAdjustmentCreateSchema,
  adminAdjustmentsQuerySchema,
  adminAdjustmentIdParamSchema,
  adminReferenceParamSchema,
  adminFinanceExportQuerySchema,
  adminFinanceBalancesQuerySchema,
  adminConversationIdParamSchema,
  adminConversationSendSchema,
  conversationSendSchema,
  notificationsReadSchema,
  bankResolveSchema,
  adminNotificationSchema,
  adminNotificationHistoryQuerySchema,
  adminFlutterwaveRequerySchema,
  adminVtpassEventsQuerySchema,
  adminVtpassRequerySchema,
  cardCreateSchema,
  updateProfileSchema,
  // Middleware
  createValidationMiddleware,
  validateRequest,
  validateQuery,
  validateParams
};
