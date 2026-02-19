# Validators

This folder contains request validation middleware using `express-validator`.

## Structure

Each validator file corresponds to a module/resource:
- `user.validator.js` - User-related validations
- `product.validator.js` - Product-related validations
- `sale.validator.js` - Sales-related validations
- etc.

## Usage

Import validators in your route files:

```javascript
const { validateUserRegistration } = require('../validators/user.validator');

router.post('/register', validateUserRegistration, userController.register);
```

## Creating New Validators

Use the `express-validator` package to create validation chains:

```javascript
const { body, validationResult } = require('express-validator');

exports.validateSomething = [
    body('field')
        .notEmpty().withMessage('Field is required')
        .isLength({ min: 3 }).withMessage('Minimum 3 characters'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }
        next();
    }
];
```

## Available Validators

- `body()` - Validates request body fields
- `param()` - Validates URL parameters
- `query()` - Validates query string parameters
- `header()` - Validates request headers

## Common Validations

- `notEmpty()` - Field cannot be empty
- `isEmail()` - Must be valid email
- `isInt()` - Must be integer
- `isLength()` - Length constraints
- `matches()` - Regex pattern matching
- `custom()` - Custom validation logic
