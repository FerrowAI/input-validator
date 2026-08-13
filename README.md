# input-validator

```sh
npm install @ferrow/input-validator
```
![CI](https://github.com/FerrowAI/input-validator/actions/workflows/ci.yml/badge.svg)

A rule-string validation engine for TypeScript/Node — Laravel-style rule
strings (`"required|number|min:18|max:120"`), nested object schemas, array
item validation, custom rule registration, and full error collection (not
just the first failure) with dot/bracket field paths. Zero runtime
dependencies.

## Install

Copy `src/index.ts` into your project, or build this repo (`npm run build`)
and depend on the compiled `dist/`.

## Quickstart

```ts
import { validate } from 'input-validator';

const schema = {
  name: 'required|string|length:2,50',
  email: 'required|email',
  age: 'number|min:18|max:120',
};

const { valid, errors } = validate(schema, { name: 'A', email: 'bad', age: 15 });
// valid: false
// errors: [
//   { path: 'name', message: 'name must have length >= 2' },
//   { path: 'email', message: 'email must be a valid email' },
//   { path: 'age', message: 'age must be >= 18' },
// ]
```

Or use the class form to reuse one schema:

```ts
import { InputValidator } from 'input-validator';
const validator = new InputValidator(schema);
validator.validate(payload);
```

## Built-in rules

`required` · `string` · `number` · `boolean` · `email` ·
`min:N` (numeric >= N, or string length >= N) ·
`max:N` (numeric <= N, or string length <= N) ·
`length:min,max` (string length range) ·
`in:a,b,c` (must equal one of the comma-separated values) ·
`regex:pattern` (tested with `new RegExp(pattern)`)

A field without `required` is skipped entirely (no errors) when its value
is `undefined`, `null`, or `''`.

## Nested schemas and arrays

```ts
const schema = {
  address: { schema: { city: 'required|string', zip: 'regex:^[0-9]{5}$' } },
  tags: { array: 'string' },                              // array of primitives
  friends: { arraySchema: { name: 'required|string' } },  // array of objects
};
```

Error paths reflect nesting: `address.city`, `friends[0].name`.

## Custom rules

```ts
import { registerRule } from 'input-validator';

registerRule('even', (value) => (typeof value === 'number' && value % 2 === 0 ? null : 'must be even'));
validate({ n: 'number|even' }, { n: 3 }); // { valid: false, errors: [{ path: 'n', message: 'n must be even' }] }
```

`registerRule` is global — it adds the rule name for every schema in the
process, matching how the built-in rules are registered.

## Scope and limits

- Rule arguments are always plain strings (`min:18`, `in:a,b,c`) — no
  cross-field rules (e.g. "must equal another field") are built in; write
  a custom rule with access to the full record via the third `data`
  argument passed to `RuleFn` if you need that.
- `regex:` rule arguments cannot contain a literal `|` (the rule-string
  delimiter) or `:` beyond the first — for complex patterns, register a
  custom rule instead of using the `regex:` shorthand.
- Not a coercion/transform library — it validates the value as given, it
  doesn't parse strings into numbers/booleans for you first.

Sponsored by [Ferrow](https://ferrow.ai)

---
Part of the [ferrow-toolkit](https://github.com/FerrowAI/ferrow-toolkit) collection · Sponsored by [Ferrow](https://ferrow.ai)
