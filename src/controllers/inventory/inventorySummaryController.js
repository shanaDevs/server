// controllers/yourControllerFile.js
const { Inventory, Product } = require('../../models');
const { Op } = require('sequelize');

const buildDateRangeFilter = (month, dayFrom, dayTo) => {
  if (!month) return null;
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Invalid month format. Use YYYY-MM');

  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();

  const from = Number(dayFrom) || 1;
  const to = Number(dayTo) || lastDay;

  if (from < 1 || from > lastDay || to < 1 || to > lastDay || from > to) {
    throw new Error(`Invalid day range for ${month}. Valid days: 1..${lastDay}`);
  }

  const startDate = `${month}-${String(from).padStart(2, '0')}`; // YYYY-MM-DD
  const endDate = `${month}-${String(to).padStart(2, '0')}`;     // YYYY-MM-DD

  return { [Op.between]: [startDate, endDate] };
};

/**
 * GET /reference-type/:type
 * Optional query: month=YYYY-MM&dayFrom=1&dayTo=15&includeData=true
 */
exports.getReferenceTypeSummary = async (req, res) => {
  try {
    const { type } = req.params;
    const { month, dayFrom, dayTo, includeData } = req.query;

    // build where clause
    const where = { reference_type: type };
    const dateFilter = buildDateRangeFilter(month, dayFrom, dayTo);
    if (dateFilter) where.created_at = dateFilter; // change to grn_date etc if your date column differs

    // counts
    const count = await Inventory.count({ where });

    // optionally return data
    let data = [];
    if (String(includeData).toLowerCase() === 'true') {
      data = await Inventory.findAll({
        where,
        order: [['created_at', 'DESC']],
        raw: true
      });
    }

    return res.status(200).json({
      success: true,
      referenceType: type,
      filter: { month: month || null, dayFrom: dayFrom || null, dayTo: dayTo || null },
      count,
      data
    });
  } catch (error) {
    console.error("Reference Type Summary Error:", error);
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};


exports.getMostSellingProduct = async (req, res) => {
  try {
    const { month, dayFrom, dayTo, includeData } = req.query;

    // prepare where clause (sale only + optional date)
    const where = { reference_type: "sale" };
    const dateFilter = buildDateRangeFilter(month, dayFrom, dayTo);
    if (dateFilter) where.created_at = dateFilter; // or use sale date column if different

    // total distinct sold product count (optional info)
    const productCountRow = await Inventory.findOne({
      where,
      attributes: [[Inventory.sequelize.fn('COUNT', Inventory.sequelize.fn('DISTINCT', Inventory.sequelize.col('product_id'))), 'product_count']],
      raw: true
    });

    const result = await Inventory.findOne({
      where,
      attributes: [
        'product_id',
        [Inventory.sequelize.fn('SUM', Inventory.sequelize.col('quantity')), 'total_sold']
      ],
      group: ['product_id'],
      order: [[Inventory.sequelize.literal('total_sold'), 'DESC']],
      raw: true
    });

    if (!result) {
      return res.json({ success: true, message: "No sales found", product_count: productCountRow?.product_count || 0 });
    }

    const product = await Product.findByPk(result.product_id);

    let productSales = null;
    if (String(includeData).toLowerCase() === 'true') {
      productSales = await Inventory.findAll({
        where: { ...where, product_id: result.product_id },
        order: [['created_at', 'DESC']],
        raw: true
      });
    }

    return res.json({
      success: true,
      product_count: productCountRow?.product_count || 0,
      mostSelling: {
        product_id: result.product_id,
        product_name: product?.name || 'Unknown',
        total_sold: Number(result.total_sold),
        sales: productSales // null or array if requested
      }
    });

  } catch (error) {
    console.error("Most Selling Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.getTopSellingProducts = async (req, res) => {
  try {
    const { month, dayFrom, dayTo } = req.query;
    const limit = Number(req.query.limit) || 10;
    const includeData = String(req.query.includeData).toLowerCase() === 'true';

    const where = { reference_type: "sale" };
    const dateFilter = buildDateRangeFilter(month, dayFrom, dayTo);
    if (dateFilter) where.created_at = dateFilter;

    // product count
    const productCountRow = await Inventory.findOne({
      where,
      attributes: [[Inventory.sequelize.fn('COUNT', Inventory.sequelize.fn('DISTINCT', Inventory.sequelize.col('product_id'))), 'product_count']],
      raw: true
    });

    // top N by total_sold
    const results = await Inventory.findAll({
      where,
      attributes: [
        'product_id',
        [Inventory.sequelize.fn('SUM', Inventory.sequelize.col('quantity')), 'total_sold']
      ],
      group: ['product_id'],
      order: [[Inventory.sequelize.literal('total_sold'), 'DESC']],
      limit,
      raw: true
    });

    // Optionally enrich with product names and per-product rows if includeData true
    let enriched = results;
    if (results.length && (includeData || true)) {
      // fetch product names in batch
      const productIds = results.map(r => r.product_id);
      const products = await Product.findAll({ where: { id: productIds }, attributes: ['id', 'name'], raw: true });
      const prodMap = products.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

      enriched = await Promise.all(results.map(async r => {
        const item = {
          product_id: r.product_id,
          product_name: prodMap[r.product_id]?.name || 'Unknown',
          total_sold: Number(r.total_sold)
        };

        if (includeData) {
          const rows = await Inventory.findAll({
            where: { ...where, product_id: r.product_id },
            order: [['created_at', 'DESC']],
            raw: true
          });
          item.sales = rows;
        }

        return item;
      }));
    }

    return res.json({
      success: true,
      product_count: productCountRow?.product_count || 0,
      topSelling: enriched
    });

  } catch (error) {
    console.error("Top Selling Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /lowest-selling-product
 * Optional query: month=YYYY-MM&dayFrom=1&dayTo=15&includeData=true
 */
exports.getLowestSellingProduct = async (req, res) => {
  try {
    const { month, dayFrom, dayTo, includeData } = req.query;

    const where = { reference_type: "sale" };
    const dateFilter = buildDateRangeFilter(month, dayFrom, dayTo);
    if (dateFilter) where.created_at = dateFilter;

    const productCountRow = await Inventory.findOne({
      where,
      attributes: [[Inventory.sequelize.fn('COUNT', Inventory.sequelize.fn('DISTINCT', Inventory.sequelize.col('product_id'))), 'product_count']],
      raw: true
    });

    const result = await Inventory.findOne({
      where,
      attributes: [
        'product_id',
        [Inventory.sequelize.fn('SUM', Inventory.sequelize.col('quantity')), 'total_sold']
      ],
      group: ['product_id'],
      order: [[Inventory.sequelize.literal('total_sold'), 'ASC']],
      raw: true
    });

    if (!result) {
      return res.json({ success: true, message: "No sales found", product_count: productCountRow?.product_count || 0 });
    }

    const product = await Product.findByPk(result.product_id);

    let productSales = null;
    if (String(includeData).toLowerCase() === 'true') {
      productSales = await Inventory.findAll({
        where: { ...where, product_id: result.product_id },
        order: [['created_at', 'DESC']],
        raw: true
      });
    }

    return res.json({
      success: true,
      product_count: productCountRow?.product_count || 0,
      lowestSelling: {
        product_id: result.product_id,
        product_name: product?.name || 'Unknown',
        total_sold: Number(result.total_sold),
        sales: productSales
      }
    });

  } catch (error) {
    console.error("Lowest Selling Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
