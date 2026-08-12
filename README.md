# Input Validator

Runtime validation for user inputs. Protect Ferrow agents from bad data.

```javascript
const validator = new InputValidator({
  email: 'email',
  age: 'number|min:18|max:120',
});
```

## Features
- ✓ Chainable rules
- ✓ Custom validators
- ✓ Detailed error messages
- ✓ Ferrow request protection

## License: MIT
## Examples
