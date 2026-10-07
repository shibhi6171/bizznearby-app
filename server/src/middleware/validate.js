import { fail } from '../utils/response.js';

// validate(schema, 'body' | 'query' | 'params') -> replaces req[source] with the parsed, typed data
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const friendly = (i) => {
      const field = i.path.join('.') || 'value';
      if (i.message === 'Required') return `${field} is required`;
      if (/received nan/i.test(i.message)) return `${field} must be a valid number`;
      return i.message;
    };
    const issues = result.error.issues;
    return fail(res, 400, friendly(issues[0]), issues.map((i) => ({ field: i.path.join('.'), message: friendly(i) })));
  }
  req[source] = result.data;
  next();
};
