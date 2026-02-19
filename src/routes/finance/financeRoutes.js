const express = require('express');
const router = express.Router();
const financeController = require('../../controllers/finance/financeController');

router.get('/statistics', financeController.getFinanceStatistics);
router.get('/download-excel', financeController.downloadFinanceExcel);

module.exports = router;
