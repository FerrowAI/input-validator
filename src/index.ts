export class InputValidator {
  private schema: Record<string, string>;
  constructor(schema: Record<string, string>) { this.schema = schema; }
  
  validate(data: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    
    for (const [field, type] of Object.entries(this.schema)) {
      if (!data[field]) {
        errors[field] = `${field} is required`;
        continue;
      }
      
      if (type === 'email' && !data[field].includes('@')) {
        errors[field] = 'Invalid email';
      } else if (type === 'number' && typeof data[field] !== 'number') {
        errors[field] = 'Must be a number';
      }
    }
    
    return { valid: Object.keys(errors).length === 0, errors };
  }
}
