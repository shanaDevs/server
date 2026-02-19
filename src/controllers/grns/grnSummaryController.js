const { GRN } = require('../../models');
const { Op } = require('sequelize');

exports.getGrnCountByMonthAndRange = async (req, res) => {
  try {
    const { month, dayFrom, dayTo, includeData } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'month is required in format YYYY-MM' });
    }

    // compute dayFrom/dayTo defaults
    const fromDay = parseInt(dayFrom, 10) || 1;

    // compute last day of month
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate(); // month is 1-based so new Date(y, m, 0) gives last day of month m
    const toDay = parseInt(dayTo, 10) || lastDay;

    if (fromDay < 1 || fromDay > lastDay || toDay < 1 || toDay > lastDay || fromDay > toDay) {
      return res.status(400).json({ success: false, message: `Invalid day range for ${month}. Valid days are 1..${lastDay}` });
    }

    const startDate = `${month}-${String(fromDay).padStart(2, '0')}`; // YYYY-MM-DD
    const endDate = `${month}-${String(toDay).padStart(2, '0')}`;     // YYYY-MM-DD

    // count
    const count = await GRN.count({
      where: {
        grn_date: { [Op.between]: [startDate, endDate] }
      }
    });

    const response = { success: true, month, dayFrom: fromDay, dayTo: toDay, startDate, endDate, totalGrnCount: count };

    // optional: return dataset if requested
    if (String(includeData).toLowerCase() === 'true') {
      const data = await GRN.findAll({
        where: { grn_date: { [Op.between]: [startDate, endDate] } },
        attributes: ['id','grn_number','supplier_id','grn_date','status','total_quantity','total_amount'],
        order: [['grn_date','ASC']],
        raw: true
      });
      response.data = data;
      response.count = data.length; // same as totalGrnCount but included for convenience
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error('Error in getGrnCountByMonthAndRange:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getGrnByStatus = async (status) => {
  const count = await GRN.count({ where: { status } });

  const data = await GRN.findAll({
    where: { status },
    attributes: [
      'id',
      'grn_number',
      'supplier_id',
      'grn_date',
      'status',
      'total_quantity',
      'total_amount'
    ],
    order: [['id', 'DESC']],
    raw: true,
  });

  return { count, data };
};

// Draft
exports.getDraftGrns = async (req, res) => {
  try {
    const result = await getGrnByStatus('draft');
    return res.json({ success: true, status: 'draft', ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

// Received
exports.getReceivedGrns = async (req, res) => {
  try {
    const result = await getGrnByStatus('received');
    return res.json({ success: true, status: 'received', ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

// Verified
exports.getVerifiedGrns = async (req, res) => {
  try {
    const result = await getGrnByStatus('verified');
    return res.json({ success: true, status: 'verified', ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

// Approved
exports.getApprovedGrns = async (req, res) => {
  try {
    const result = await getGrnByStatus('approved');
    return res.json({ success: true, status: 'approved', ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

// Rejected
exports.getRejectedGrns = async (req, res) => {
  try {
    const result = await getGrnByStatus('rejected');
    return res.json({ success: true, status: 'rejected', ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

exports.getHighestAmountGrnByMonth = async (req, res) => {
  try {
    const { month } = req.query;

    // Validate month
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "month is required in format YYYY-MM"
      });
    }

    // Month date range generate
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    // Highest total_amount GRN
    const highestGrn = await GRN.findOne({
      where: {
        grn_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['total_amount', 'DESC']],
      attributes: [
        'id',
        'grn_number',
        'supplier_id',
        'grn_date',
        'total_quantity',
        'total_amount',
        'status'
      ]
    });

    return res.json({
      success: true,
      message: "Highest amount GRN for month",
      month,
      data: highestGrn || null
    });

  } catch (err) {
    console.error("Error getHighestAmountGrnByMonth:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
