// controllers/suppliers/supplierSummaryController.js
const { Suppliers, SupplierReturn, Inventory } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');


const buildRange = ({ start, end, month, dayFrom, dayTo }) => {
  if (start && end) {
    return { startDate: start, endDate: end };
  }
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Invalid month format (YYYY-MM)');
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const from = Number(dayFrom) || 1;
    const to = Number(dayTo) || lastDay;
    if (from < 1 || from > lastDay || to < 1 || to > lastDay || from > to) {
      throw new Error(`Invalid day range for ${month}. Valid days: 1..${lastDay}`);
    }
    const startDate = `${month}-${String(from).padStart(2,'0')}`;
    const endDate = `${month}-${String(to).padStart(2,'0')}`;
    return { startDate, endDate };
  }
  // no filter -> return null to indicate all-time
  return null;
};

exports.getTopSuppliedSuppliers = async (req, res) => {
  try {
    const { month, start, end, dayFrom, dayTo, limit = 10, includeData } = req.query;
    const range = buildRange({ month, start, end, dayFrom, dayTo });

    const whereInv = { reference_type: 'grn' };
    if (range) {
      whereInv.created_at = { [Op.between]: [ `${range.startDate} 00:00:00`, `${range.endDate} 23:59:59` ] };
    }

    // aggregate quantity by supplier_id
    const rows = await Inventory.findAll({
      where: whereInv,
      attributes: [
        'supplier_id',
        [fn('SUM', col('quantity')), 'supplied_qty']
      ],
      group: ['supplier_id'],
      order: [[literal('supplied_qty'), 'DESC']],
      limit: Number(limit),
      raw: true
    });

    const supplierIds = rows.map(r => r.supplier_id).filter(Boolean);
    const suppliers = supplierIds.length ? await Suppliers.findAll({
      where: { id: supplierIds },
      attributes: ['id','name','supplier_code','phone','email'],
      raw: true
    }) : [];

    const supplierMap = suppliers.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});

    const result = await Promise.all(rows.map(async r => {
      const item = {
        supplier_id: r.supplier_id,
        supplier: supplierMap[r.supplier_id] || null,
        supplied_qty: Number(r.supplied_qty)
      };
      if (String(includeData).toLowerCase() === 'true') {
        item.rows = await Inventory.findAll({
          where: { ...whereInv, supplier_id: r.supplier_id },
          attributes: ['id','product_id','supplier_id','supplier_name','quantity','unit_cost','created_at'],
          order: [['created_at','DESC']],
          raw: true
        });
      }
      return item;
    }));

    return res.json({ success: true, filter: range || null, topSupplied: result });
  } catch (err) {
    console.error('getTopSuppliedSuppliers Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};

exports.getTopReturnSuppliers = async (req, res) => {
  try {
    const { month, start, end, dayFrom, dayTo, limit = 10, includeData } = req.query;
    const range = buildRange({ month, start, end, dayFrom, dayTo });

    const whereRet = {};
    if (range) whereRet.return_date = { [Op.between]: [ range.startDate, range.endDate ] };

    const rows = await SupplierReturn.findAll({
      where: whereRet,
      attributes: [
        'supplier_id',
        [fn('SUM', col('quantity')), 'returned_qty']
      ],
      group: ['supplier_id'],
      order: [[literal('returned_qty'), 'DESC']],
      limit: Number(limit),
      raw: true
    });

    const supplierIds = rows.map(r => r.supplier_id).filter(Boolean);
    const suppliers = supplierIds.length ? await Suppliers.findAll({
      where: { id: supplierIds },
      attributes: ['id','name','supplier_code','phone','email'],
      raw: true
    }) : [];
    const supplierMap = suppliers.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});

    const result = await Promise.all(rows.map(async r => {
      const item = {
        supplier_id: r.supplier_id,
        supplier: supplierMap[r.supplier_id] || null,
        returned_qty: Number(r.returned_qty)
      };
      if (String(includeData).toLowerCase() === 'true') {
        item.rows = await SupplierReturn.findAll({
          where: { ...whereRet, supplier_id: r.supplier_id },
          attributes: ['id','product_id','return_date','quantity','remarks','created_at'],
          order: [['return_date','DESC']],
          raw: true
        });
      }
      return item;
    }));

    return res.json({ success: true, filter: range || null, topReturnSuppliers: result });
  } catch (err) {
    console.error('getTopReturnSuppliers Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};

exports.getTopReturnedProductsPerSupplier = async (req, res) => {
  try {
    const { supplierId, month, start, end, dayFrom, dayTo, limit = 10 } = req.query;
    const range = buildRange({ month, start, end, dayFrom, dayTo });

    const whereRet = {};
    if (range) whereRet.return_date = { [Op.between]: [ range.startDate, range.endDate ] };
    if (supplierId) whereRet.supplier_id = supplierId;

    // group by supplier_id + product_id to know per-supplier top products
    const rows = await SupplierReturn.findAll({
      where: whereRet,
      attributes: [
        'supplier_id',
        'product_id',
        [fn('SUM', col('quantity')), 'product_returned_qty']
      ],
      group: ['supplier_id','product_id'],
      order: [[literal('product_returned_qty'), 'DESC']],
      limit: Number(limit),
      raw: true
    });

    // gather supplier and (optionally) product info
    const supplierIds = [...new Set(rows.map(r => r.supplier_id).filter(Boolean))];
    const suppliers = supplierIds.length ? await Suppliers.findAll({
      where: { id: supplierIds },
      attributes: ['id','name','supplier_code'],
      raw: true
    }) : [];
    const supplierMap = suppliers.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});

    // structure response grouped by supplier
    const grouped = {};
    rows.forEach(r => {
      if (!grouped[r.supplier_id]) grouped[r.supplier_id] = { supplier: supplierMap[r.supplier_id] || null, products: [] };
      grouped[r.supplier_id].products.push({
        product_id: r.product_id,
        returned_qty: Number(r.product_returned_qty)
      });
    });

    return res.json({ success: true, filter: range || null, supplier_returned_products: grouped });
  } catch (err) {
    console.error('getTopReturnedProductsPerSupplier Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
