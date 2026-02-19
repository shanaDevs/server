// controllers/purchase/purchaseSummaryController.js
const { PurchaseOrder, Suppliers } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');

const buildMonthDayRange = (month, dayFrom, dayTo) => {
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


exports.getStatusSummaryByMonth = async (req, res) => {
  try {
    const { month, dayFrom, dayTo, includeData } = req.query;
    let where = {};
    // filter by po_date if month provided
    const dateFilter = buildMonthDayRange(month, dayFrom, dayTo);
    if (dateFilter) where.po_date = dateFilter;

    // Count draft and sent
    const [draftCount, sentCount] = await Promise.all([
      PurchaseOrder.count({ where: { ...where, status: 'draft' } }),
      PurchaseOrder.count({ where: { ...where, status: 'sent' } })
    ]);

    const response = {
      success: true,
      filter: { month: month || null, dayFrom: dayFrom || null, dayTo: dayTo || null },
      draftCount,
      sentCount
    };

    if (String(includeData).toLowerCase() === 'true') {
      const [draftRows, sentRows] = await Promise.all([
        PurchaseOrder.findAll({ where: { ...where, status: 'draft' }, order: [['po_date','DESC']], raw: true }),
        PurchaseOrder.findAll({ where: { ...where, status: 'sent' }, order: [['po_date','DESC']], raw: true })
      ]);
      response.draft = draftRows;
      response.sent = sentRows;
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error('getStatusSummaryByMonth Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};

exports.getExpectedDeliveriesByMonth = async (req, res) => {
  try {
    const { month, dayFrom, dayTo, includeData } = req.query;
    const dateFilter = buildMonthDayRange(month, dayFrom, dayTo);
    if (!dateFilter) {
      return res.status(400).json({ success: false, message: 'month param required (YYYY-MM) for expected deliveries' });
    }

    const where = {
      expected_delivery_date: dateFilter,
      status: { [Op.notIn]: ['completed', 'cancelled'] } // orders still expected
    };

    const count = await PurchaseOrder.count({ where });

    const resp = { success: true, filter: { month, dayFrom: dayFrom || 1, dayTo: dayTo || null }, expectedDeliveryCount: count };

    if (String(includeData).toLowerCase() === 'true') {
      const rows = await PurchaseOrder.findAll({
        where,
        attributes: ['id','po_number','supplier_id','expected_delivery_date','po_date','status','notes'],
        order: [['expected_delivery_date','ASC']],
        raw: true
      });
      resp.data = rows;
      resp.count = rows.length;
    }

    return res.status(200).json(resp);
  } catch (err) {
    console.error('getExpectedDeliveriesByMonth Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};

exports.getSentPurchaseOrdersByMonth = async (req, res) => {
  try {
    const { month, dayFrom, dayTo, includeData } = req.query;
    const where = { status: 'sent' };
    const dateFilter = buildMonthDayRange(month, dayFrom, dayTo);
    if (dateFilter) where.po_date = dateFilter;

    const count = await PurchaseOrder.count({ where });

    const resp = { success: true, filter: { month: month || null }, sentCount: count };
    if (String(includeData).toLowerCase() === 'true') {
      const rows = await PurchaseOrder.findAll({
        where,
        attributes: ['id','po_number','supplier_id','po_date','expected_delivery_date','status','total_amount'],
        order: [['po_date','DESC']],
        raw: true
      });
      resp.data = rows;
      resp.count = rows.length;
    }

    return res.status(200).json(resp);
  } catch (err) {
    console.error('getSentPurchaseOrdersByMonth Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};

exports.getTopSuppliersByOrders = async (req, res) => {
  try {
    const { month, dayFrom, dayTo, limit } = req.query;
    const dateFilter = buildMonthDayRange(month, dayFrom, dayTo);
    const where = {};
    if (dateFilter) where.po_date = dateFilter;

    // aggregate: count orders per supplier_id
    const rows = await PurchaseOrder.findAll({
      where,
      attributes: [
        'supplier_id',
        [fn('COUNT', col('id')), 'order_count']
      ],
      group: ['supplier_id'],
      order: [[literal('order_count'), 'DESC']],
      limit: Number(limit) || 10,
      raw: true
    });

    // fetch supplier details for involved supplier_ids
    const supplierIds = rows.map(r => r.supplier_id).filter(Boolean);
    const suppliers = supplierIds.length ? await Suppliers.findAll({ where: { id: supplierIds }, attributes: ['id','name','supplier_code','phone','email'], raw: true }) : [];

    const supplierMap = suppliers.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});

    const result = rows.map(r => ({
      supplier_id: r.supplier_id,
      supplier: supplierMap[r.supplier_id] || null,
      order_count: Number(r.order_count)
    }));

    return res.status(200).json({ success: true, filter: { month: month || null }, topSuppliers: result });
  } catch (err) {
    console.error('getTopSuppliersByOrders Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};