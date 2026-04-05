import Joi from 'joi';

export const userValidationSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('Admin', 'Analyst', 'Viewer').default('Viewer'),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('Admin', 'Analyst', 'Viewer').optional(),
});


export const transactionValidationSchema = Joi.object({
  amount: Joi.number().positive().required(),
  type: Joi.string().valid('income', 'expense').required(),
  category: Joi.string().required(),
  date: Joi.date().iso().default(() => new Date()),
  notes: Joi.string().max(500).optional().allow(''),
});
