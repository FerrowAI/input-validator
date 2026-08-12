/**
 * input-validator — a rule-string validation engine.
 *
 * Rules are pipe-delimited strings like `"required|number|min:18|max:120"`
 * applied to a schema of field -> rule-string (or nested schema, or array
 * item schema). Every error is collected (not just the first) with a
 * dot/bracket path so callers can point users at the exact bad field.
 */

export type RuleFn = (value: unknown, arg: string | undefined, data: unknown) => string | null;

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export type FieldSchema =
  | string // rule string, e.g. "required|number|min:18"
  | { schema: Schema } // nested object
  | { array: FieldSchema } // array of items each validated against FieldSchema
  | { arraySchema: Schema }; // array of objects validated against Schema

export type Schema = Record<string, FieldSchema>;

const registry = new Map<string, RuleFn>();

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function registerDefaults(): void {
  registry.set('required', (value) => (isEmpty(value) ? 'is required' : null));

  registry.set('string', (value) => (isEmpty(value) || typeof value === 'string' ? null : 'must be a string'));

  registry.set('number', (value) =>
    isEmpty(value) || typeof value === 'number' && !Number.isNaN(value) ? null : 'must be a number'
  );

  registry.set('boolean', (value) => (isEmpty(value) || typeof value === 'boolean' ? null : 'must be a boolean'));

  registry.set('email', (value) => {
    if (isEmpty(value)) return null;
    return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'must be a valid email';
  });

  registry.set('min', (value, arg) => {
    if (isEmpty(value)) return null;
    const bound = Number(arg);
    if (typeof value === 'number') return value >= bound ? null : `must be >= ${bound}`;
    if (typeof value === 'string') return value.length >= bound ? null : `must have length >= ${bound}`;
    return null;
  });

  registry.set('max', (value, arg) => {
    if (isEmpty(value)) return null;
    const bound = Number(arg);
    if (typeof value === 'number') return value <= bound ? null : `must be <= ${bound}`;
    if (typeof value === 'string') return value.length <= bound ? null : `must have length <= ${bound}`;
    return null;
  });

  registry.set('length', (value, arg) => {
    if (isEmpty(value)) return null;
    if (typeof value !== 'string') return 'must be a string';
    const [min, max] = (arg ?? '').split(',').map(Number);
    if (Number.isNaN(min)) return null;
    if (value.length < min) return `must have length >= ${min}`;
    if (!Number.isNaN(max) && value.length > max) return `must have length <= ${max}`;
    return null;
  });

  registry.set('in', (value, arg) => {
    if (isEmpty(value)) return null;
    const options = (arg ?? '').split(',');
    return options.includes(String(value)) ? null : `must be one of: ${options.join(', ')}`;
  });

  registry.set('regex', (value, arg) => {
    if (isEmpty(value)) return null;
    if (typeof value !== 'string' || !arg) return 'must match pattern';
    try {
      return new RegExp(arg).test(value) ? null : `must match pattern ${arg}`;
    } catch {
      return `invalid regex rule argument: ${arg}`;
    }
  });
}

registerDefaults();

/** Register a custom rule. `name` is used in rule strings as `name` or `name:arg`. */
export function registerRule(name: string, fn: RuleFn): void {
  registry.set(name, fn);
}

function parseRuleString(ruleString: string): { name: string; arg?: string }[] {
  return ruleString
    .split('|')
    .map((r) => r.trim())
    .filter((r) => r.length > 0)
    .map((r) => {
      const idx = r.indexOf(':');
      if (idx === -1) return { name: r };
      return { name: r.slice(0, idx), arg: r.slice(idx + 1) };
    });
}

function validateRuleString(
  path: string,
  value: unknown,
  ruleString: string,
  data: unknown,
  errors: ValidationError[]
): void {
  const rules = parseRuleString(ruleString);
  const hasRequired = rules.some((r) => r.name === 'required');

  if (!hasRequired && isEmpty(value)) return; // optional field, absent -> skip other rules

  for (const { name, arg } of rules) {
    const fn = registry.get(name);
    if (!fn) {
      errors.push({ path, message: `unknown rule: ${name}` });
      continue;
    }
    const message = fn(value, arg, data);
    if (message) errors.push({ path, message: `${path} ${message}` });
  }
}

function validateField(path: string, value: unknown, fieldSchema: FieldSchema, data: unknown, errors: ValidationError[]): void {
  if (typeof fieldSchema === 'string') {
    validateRuleString(path, value, fieldSchema, data, errors);
    return;
  }

  if ('schema' in fieldSchema) {
    if (value === undefined || value === null) return;
    if (typeof value !== 'object' || Array.isArray(value)) {
      errors.push({ path, message: `${path} must be an object` });
      return;
    }
    validateSchema(fieldSchema.schema, value as Record<string, unknown>, path, errors);
    return;
  }

  if ('array' in fieldSchema) {
    if (value === undefined || value === null) return;
    if (!Array.isArray(value)) {
      errors.push({ path, message: `${path} must be an array` });
      return;
    }
    value.forEach((item, i) => validateField(`${path}[${i}]`, item, fieldSchema.array, data, errors));
    return;
  }

  if ('arraySchema' in fieldSchema) {
    if (value === undefined || value === null) return;
    if (!Array.isArray(value)) {
      errors.push({ path, message: `${path} must be an array` });
      return;
    }
    value.forEach((item, i) => {
      const itemPath = `${path}[${i}]`;
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        errors.push({ path: itemPath, message: `${itemPath} must be an object` });
        return;
      }
      validateSchema(fieldSchema.arraySchema, item as Record<string, unknown>, itemPath, errors);
    });
  }
}

function validateSchema(schema: Schema, data: Record<string, unknown>, basePath: string, errors: ValidationError[]): void {
  for (const [field, fieldSchema] of Object.entries(schema)) {
    const path = basePath ? `${basePath}.${field}` : field;
    validateField(path, data[field], fieldSchema, data, errors);
  }
}

/**
 * Validate `data` against `schema` (field -> rule string, nested schema,
 * or array spec). Collects every failing rule across every field.
 */
export function validate(schema: Schema, data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];
  validateSchema(schema, data ?? {}, '', errors);
  return { valid: errors.length === 0, errors };
}

/** A reusable validator bound to one schema. */
export class InputValidator {
  private readonly schema: Schema;
  constructor(schema: Schema) {
    this.schema = schema;
  }
  validate(data: Record<string, unknown>): ValidationResult {
    return validate(this.schema, data);
  }
}

export default { validate, InputValidator, registerRule };
