
const { Sale, SaleItem, Customer, Product, User } = require('../../models');
const { Op, fn, col, literal, Sequelize } = require('sequelize');

const buildDateFilter = ({ start, end, month }) => {
  if (start && end) return { [Op.between]: [start, end] };
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    return { [Op.between]: [startDate, endDate] };
  }
  return null;
};


exports.getMostBuyingCustomer = async (req, res) => {
  try {
    const { start, end, month } = req.query;
    const dateFilter = buildDateFilter({ start, end, month });
    const where = {};
    if (dateFilter) where.sale_date = dateFilter;
    where.is_deleted = 0; // exclude deleted sales

    // aggregate sales by customer
    const rows = await Sale.findAll({
      where,
      attributes: [
        'customer_id',
        [fn('SUM', col('total_amount')), 'total_spent'],
        [fn('COUNT', col('id')), 'sales_count']
      ],
      group: ['customer_id'],
      order: [[literal('total_spent'), 'DESC']],
      limit: 1,
      raw: true
    });

    const top = rows[0];
    if (!top) 
      return res.json({ success: true, message: 'No sales found', data: null });

    // fetch customer info including customer_name
    const customer = await Customer.findByPk(top.customer_id, {
      attributes: ['id','customer_code','customer_name','phone','total_purchases'],
      raw: true
    });

    return res.json({
      success: true,
      data: {
        customer: customer || { id: top.customer_id },
        customer_name: customer?.customer_name || 'Unknown',
        total_spent: Number(top.total_spent),
        sales_count: Number(top.sales_count)
      }
    });

  } catch (err) {
    console.error('getMostBuyingCustomer Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMostSellingProduct = async (req, res) => {
  try {
    const { start, end, month } = req.query;
    const saleDateFilter = buildDateFilter({ start, end, month });

    // Join SaleItem -> Sale to filter by sale_date
    const whereSale = {};
    if (saleDateFilter) whereSale.sale_date = saleDateFilter;
    whereSale.is_deleted = 0;

    // Use subquery via include
    const results = await SaleItem.findAll({
      attributes: [
        'product_id',
        [fn('SUM', col('quantity')), 'total_qty_sold'],
        [fn('SUM', col('Sale.total_amount')), 'total_sales_amount']
      ],
      include: [
        {
          model: Sale,
          as: 'sale',
          attributes: [],
          where: whereSale
        }
      ],
      group: ['product_id'],
      order: [[literal('total_qty_sold'), 'DESC']],
      limit: 1,
      raw: true
    });

    const top = results[0];
    if (!top) return res.json({ success: true, message: 'No sold items found', data: null });

    const product = await Product.findByPk(top.product_id, { attributes: ['id','name','product_code'], raw: true });

    return res.json({
      success: true,
      data: {
        product: product || { id: top.product_id },
        total_quantity: Number(top.total_qty_sold),
        total_sales_amount: Number(top.total_sales_amount || 0)
      }
    });
  } catch (err) {
    console.error('getMostSellingProduct Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMostSellingCashier = async (req, res) => {
  try {
    const { start, end, month } = req.query;
    const saleDateFilter = buildDateFilter({ start, end, month });
    const whereSale = {};
    if (saleDateFilter) whereSale.sale_date = saleDateFilter;
    whereSale.is_deleted = 0;

    // aggregate sale_items joining sale
    const rows = await SaleItem.findAll({
      attributes: [
        [col('sale.cashier_id'), 'cashier_id'],
        [fn('SUM', col('quantity')), 'total_items_sold'],
        [fn('COUNT', col('SaleItem.id')), 'line_count']
      ],
      include: [
        {
          model: Sale,
          as: 'sale',
          attributes: [],
          where: whereSale
        }
      ],
      group: ['sale.cashier_id'],
      order: [[literal('total_items_sold'), 'DESC']],
      limit: 1,
      raw: true
    });

    const top = rows[0];
    if (!top || !top.cashier_id) 
      return res.json({ success: true, message: 'No sales found', data: null });

    // fetch cashier info using first_name and last_name
    const cashier = await User.findByPk(top.cashier_id, { 
      attributes: [
        'id', 
        'first_name', 
        'last_name', 
        'phone'
      ], 
      raw: true 
    });

    return res.json({
      success: true,
      data: {
        cashier: {
          id: cashier.id,
          name: `${cashier.first_name} ${cashier.last_name}`,
          phone: cashier.phone
        },
        total_items_sold: Number(top.total_items_sold),
        line_count: Number(top.line_count)
      }
    });
  } catch (err) {
    console.error('getMostSellingCashier Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDailySales = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'date is required in YYYY-MM-DD' });
    }

    const start = `${date} 00:00:00`;
    const end = `${date} 23:59:59`;

    const totals = await Sale.findAll({
      where: { sale_date: { [Op.between]: [start, end] }, is_deleted: 0 },
      attributes: [
        [fn('COUNT', col('id')), 'sales_count'],
        [fn('SUM', col('total_amount')), 'total_amount']
      ],
      raw: true
    });

    const row = totals[0] || {};
    return res.json({
      success: true,
      date,
      sales_count: Number(row.sales_count || 0),
      total_amount: Number(row.total_amount || 0)
    });
  } catch (err) {
    console.error('getDailySales Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


exports.getMonthlySales = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'month is required in YYYY-MM' });
    }

    const startDate = `${month}-01 00:00:00`;
    const endDate = `${month}-31 23:59:59`;

    const totals = await Sale.findAll({
      where: { sale_date: { [Op.between]: [startDate, endDate] }, is_deleted: 0 },
      attributes: [
        [fn('COUNT', col('id')), 'sales_count'],
        [fn('SUM', col('total_amount')), 'total_amount']
      ],
      raw: true
    });

    const row = totals[0] || {};
    return res.json({
      success: true,
      month,
      sales_count: Number(row.sales_count || 0),
      total_amount: Number(row.total_amount || 0)
    });
  } catch (err) {
    console.error('getMonthlySales Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
