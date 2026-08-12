const { validate, registerRule } = require('../dist/index.js');

const schema = {
  name: 'required|string|length:2,50',
  email: 'required|email',
  age: 'number|min:18|max:120',
  role: 'in:admin,member,guest',
  tags: { array: 'string' },
  address: { schema: { city: 'required|string', zip: 'regex:^[0-9]{5}$' } },
  friends: { arraySchema: { name: 'required|string', age: 'number|min:0' } },
};

const validPayload = {
  name: 'Ada',
  email: 'ada@example.com',
  age: 36,
  role: 'admin',
  tags: ['a', 'b'],
  address: { city: 'London', zip: '10001' },
  friends: [{ name: 'Bob', age: 30 }],
};

console.log('valid payload ->', JSON.stringify(validate(schema, validPayload)));

const invalidPayload = {
  name: 'A',
  email: 'not-an-email',
  age: 15,
  role: 'superadmin',
  tags: ['ok', 42],
  address: { city: '', zip: 'abcde' },
  friends: [{ name: '', age: -1 }, { age: 5 }],
};

const result = validate(schema, invalidPayload);
console.log('\ninvalid payload valid:', result.valid);
console.log('errors:');
for (const e of result.errors) console.log(' -', e.path, ':', e.message);

// custom rule
registerRule('even', (value) => (typeof value === 'number' && value % 2 === 0 ? null : 'must be even'));
console.log('\ncustom rule:', validate({ n: 'number|even' }, { n: 3 }));
