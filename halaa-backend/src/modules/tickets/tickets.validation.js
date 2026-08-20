const { z } = require('zod');
const { TICKET_STATUS, TICKET_PRIORITY } = require('../../shared/constants');

const TICKET_TYPE_VALUES = ['technical','payment','event','user','other','inquiry','issue','request','suggestion'];
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const createTicketSchema = z.object({
  subject:  z.string().trim().min(5).max(200),
  type:     z.enum(TICKET_TYPE_VALUES),
  message:  z.string().trim().min(10).max(5000),
  priority: z.enum(Object.values(TICKET_PRIORITY)).optional(),
}).strict();

const updateTicketSchema = z.object({
  subject:  z.string().trim().min(5).max(200).optional(),
  message:  z.string().trim().min(10).max(5000).optional(),
  type:     z.enum(TICKET_TYPE_VALUES).optional(),
  priority: z.enum(Object.values(TICKET_PRIORITY)).optional(),
  status:   z.enum(Object.values(TICKET_STATUS)).optional(),
}).strict().refine((v) => Object.keys(v).length > 0, 'At least one field required');

const updateStatusSchema = z.object({
  status:     z.enum(Object.values(TICKET_STATUS)),
  resolution: z.string().trim().min(10).max(5000).optional(),
}).strict();

const assignTicketSchema = z.object({
  assigneeId: objectId,
  notes: z.string().trim().min(1).max(2000).optional(),
}).strict();

const rateTicketSchema = z.object({
  rating:   z.number().int().min(1).max(5),
  feedback: z.string().trim().max(1000).optional(),
}).strict();

const listTicketsQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).optional(),
  limit:    z.coerce.number().int().min(1).max(100).optional(),
  status:   z.enum([...Object.values(TICKET_STATUS), 'all']).optional(),
  priority: z.enum(Object.values(TICKET_PRIORITY)).optional(),
  source:   z.string().optional(),
  search:   z.string().trim().max(200).optional(),
  from:     z.coerce.date().optional(),
  to:       z.coerce.date().optional(),
}).strict();

module.exports = { createTicketSchema, updateTicketSchema, updateStatusSchema,
  assignTicketSchema, rateTicketSchema, listTicketsQuerySchema };
