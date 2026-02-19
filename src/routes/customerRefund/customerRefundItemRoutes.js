const express = require('express');
const router = express.Router();
const { customerRefundItemController } = require('../../controllers');


//get all customer refund items
router.get('/', customerRefundItemController.getAllCustomerRefundItems);

module.exports = router;