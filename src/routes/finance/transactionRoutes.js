const express = require('express');
const router = express.Router();
const transactionController = require('../../controllers/finance/transactionController');

router.get('/', transactionController.getAllTransactions);

module.exports = router;
