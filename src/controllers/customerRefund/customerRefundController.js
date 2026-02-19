const db = require('../../models');
const { sequelize, CustomerRefund, CustomerRefundItem, Inventory, Payment } = db;
const customerRefundService = require('../../services/customerRefunds/customerRefundService');
const { requireBranchId, addBranchId } = require('../../utils/branchHelper');

// Get all customer refunds
exports.getAllCustomerRefunds = async (req, res, next) => {
  try {
    const branchConfig = {
      branchId: req.branchId,
      branchAccess: req.user?.branchAccess
    };

    const filters = req.query;
    const pagination = {
      limit: parseInt(req.query.limit) || 10,
      offset: parseInt(req.query.offset) || 0
    };

    const { count, rows } = await customerRefundService.getAllRefunds(filters, pagination, branchConfig);

    res.status(200).json({
      success: true,
      data: rows,
      total: count,
      page: Math.floor(pagination.offset / pagination.limit) + 1,
      limit: pagination.limit
    });
  } catch (error) {
    next(error);
  }
};

// Create a new customer refund
exports.createCustomerRefund = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user?.id;
    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({ success: false, message: 'Unauthorized - user required' });
    }

    const refundData = { ...req.body, userId };
    addBranchId(refundData, req);

    // Check for active counter session and link it
    const activeSession = await db.CounterSession.findOne({
      where: {
        userId,
        branchId: refundData.branchId,
        status: 'OPEN'
      },
      transaction
    });

    if (activeSession) {
      refundData.counterSessionId = activeSession.id;
    }

    const branchConfig = {
      branchId: req.branchId,
      branchAccess: req.user?.branchAccess
    };

    const createdRefund = await customerRefundService.createRefund(
      refundData,
      branchConfig,
      transaction,
      req.user
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: 'Customer refund created successfully',
      data: createdRefund
    });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
