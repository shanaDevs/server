const {CustomerRefund , Product } = require('../../models');
const { Sequelize } = require('sequelize');

exports.getMostRefundedProductByMonth = async (req, res) => {
  try {
    const { month } = req.query; // Expecting format: "2025-12"
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month query parameter is required (format: YYYY-MM)'
      });
    }

    // Start and end date of month
    const startDate = `${month}-01`;
    const endDate = `${month}-31`; // Simple, MySQL handles overflow

    const mostRefunded = await CustomerRefund.findAll({
      attributes: [
        'product_id',
        [Sequelize.fn('COUNT', Sequelize.col('CustomerRefund.id')), 'refund_count']
      ],
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'product_code']
        }
      ],
      where: {
        refund_date: {
          [Sequelize.Op.between]: [startDate, endDate]
        }
      },
      group: ['product_id', 'product.id', 'product.name', 'product.product_code'],
      order: [[Sequelize.literal('refund_count'), 'DESC']],
      limit: 1
    });

    return res.status(200).json({
      success: true,
      data: mostRefunded[0] || null
    });

  } catch (error) {
    console.error('Error fetching most refunded product by month:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};