// controllers/customer/customerSummaryController.js
const { Customer } = require('../../models');

exports.getTotalCustomersWithData = async (req, res) => {
  try {
    const totalCount = await Customer.count();
    const customers = await Customer.findAll({
      attributes: ['id', 'customer_code', 'customer_name', 'phone', 'address', 'is_active', 'is_deleted', 'total_purchases'],
      order: [['id', 'ASC']],
      raw: true
    });

    return res.status(200).json({
      success: true,
      totalCount,
      customers
    });
  } catch (error) {
    console.error('Error fetching total customers:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getActiveCustomersWithData = async (req, res) => {
  try {
    const activeCount = await Customer.count({ where: { is_active: 1, is_deleted: 0 } });
    const customers = await Customer.findAll({
      where: { is_active: 1, is_deleted: 0 },
      attributes: ['id', 'customer_code', 'customer_name', 'phone', 'address', 'total_purchases'],
      order: [['id', 'ASC']],
      raw: true
    });

    return res.status(200).json({
      success: true,
      activeCount,
      customers
    });
  } catch (error) {
    console.error('Error fetching active customers:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getDeletedCustomersWithData = async (req, res) => {
  try {
    const deletedCount = await Customer.count({ where: { is_deleted: 1 } });
    const customers = await Customer.findAll({
      where: { is_deleted: 1 },
      attributes: ['id', 'customer_code', 'customer_name', 'phone', 'address', 'total_purchases'],
      order: [['id', 'ASC']],
      raw: true
    });

    return res.status(200).json({
      success: true,
      deletedCount,
      customers
    });
  } catch (error) {
    console.error('Error fetching deleted customers:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getMostTotalPurchaseCustomerWithData = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      attributes: ['id', 'customer_code', 'customer_name', 'total_purchases', 'phone', 'address'],
      order: [['total_purchases', 'DESC']],
      raw: true
    });

    return res.status(200).json({ success: true, data: customer || null });
  } catch (error) {
    console.error('Error fetching most total purchase customer:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
