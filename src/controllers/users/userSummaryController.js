const { User, AuditLog } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');

const buildRangeFlexible = ({ date, start, end, month, dayFrom, dayTo }) => {
  if (date) return { startDate: date, endDate: date };
  if (start && end) return { startDate: start, endDate: end };
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Invalid month format (YYYY-MM)');
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const from = Number(dayFrom) || 1;
    const to = Number(dayTo) || lastDay;
    if (from < 1 || from > lastDay || to < 1 || to > lastDay || from > to) {
      throw new Error(`Invalid day range for ${month}. Valid days: 1..${lastDay}`);
    }
    return {
      startDate: `${month}-${String(from).padStart(2, '0')}`,
      endDate:   `${month}-${String(to).padStart(2, '0')}`
    };
  }
  return null;
};


exports.getMostActiveUsers = async (req, res) => {
  try {
    const { date, start, end, month, dayFrom, dayTo, limit = 1, includeData } = req.query;
    const range = buildRangeFlexible({ date, start, end, month, dayFrom, dayTo });

    const whereLog = {};
    if (range) {
      whereLog.created_at = { [Op.between]: [`${range.startDate} 00:00:00`, `${range.endDate} 23:59:59`] };
    }

    const rows = await AuditLog.findAll({
      where: whereLog,
      attributes: [
        'user_id',
        [fn('COUNT', col('id')), 'actions_count']
      ],
      group: ['user_id'],
      order: [[literal('actions_count'), 'DESC']],
      limit: Number(limit),
      raw: true
    });

    if (!rows.length) {
      return res.json({ success: true, message: 'No activity found for given range', filter: range || null, mostActive: [], users: [] });
    }

    const userIds = rows.map(r => r.user_id).filter(Boolean);
    const users = userIds.length ? await User.findAll({
      where: { id: userIds },
      attributes: ['id','first_name','last_name'],
      raw: true
    }) : [];

    // build simple user dataset (id, name)
    const usersSimple = users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`.trim() }));

    const userMap = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});

    const result = await Promise.all(rows.map(async r => {
      const u = userMap[r.user_id];
      const item = {
        user_id: r.user_id,
        user: { id: u?.id || r.user_id, name: u ? `${u.first_name} ${u.last_name}`.trim() : null },
        actions_count: Number(r.actions_count)
      };
      if (String(includeData).toLowerCase() === 'true') {
        item.audit_rows = await AuditLog.findAll({
          where: { ...whereLog, user_id: r.user_id },
          order: [['created_at','DESC']],
          raw: true
        });
      }
      return item;
    }));

    return res.json({ success: true, filter: range || null, mostActive: result, users: usersSimple });
  } catch (err) {
    console.error('getMostActiveUsers Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};


exports.getLeastActiveUsers = async (req, res) => {
  try {
    const { date, start, end, month, dayFrom, dayTo, limit = 1, includeData } = req.query;
    const range = buildRangeFlexible({ date, start, end, month, dayFrom, dayTo });

    const whereLog = {};
    if (range) {
      whereLog.created_at = { [Op.between]: [`${range.startDate} 00:00:00`, `${range.endDate} 23:59:59`] };
    }

    const rows = await AuditLog.findAll({
      where: whereLog,
      attributes: [
        'user_id',
        [fn('COUNT', col('id')), 'actions_count']
      ],
      group: ['user_id'],
      order: [[literal('actions_count'), 'ASC']],
      limit: Number(limit),
      raw: true
    });

    if (!rows.length) {
      return res.json({ success: true, message: 'No activity found for given range', filter: range || null, leastActive: [], users: [] });
    }

    const userIds = rows.map(r => r.user_id).filter(Boolean);
    const users = userIds.length ? await User.findAll({
      where: { id: userIds },
      attributes: ['id','first_name','last_name'],
      raw: true
    }) : [];

    const usersSimple = users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`.trim() }));
    const userMap = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});

    const result = await Promise.all(rows.map(async r => {
      const u = userMap[r.user_id];
      const item = {
        user_id: r.user_id,
        user: { id: u?.id || r.user_id, name: u ? `${u.first_name} ${u.last_name}`.trim() : null },
        actions_count: Number(r.actions_count)
      };
      if (String(includeData).toLowerCase() === 'true') {
        item.audit_rows = await AuditLog.findAll({
          where: { ...whereLog, user_id: r.user_id },
          order: [['created_at','DESC']],
          raw: true
        });
      }
      return item;
    }));

    return res.json({ success: true, filter: range || null, leastActive: result, users: usersSimple });
  } catch (err) {
    console.error('getLeastActiveUsers Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};


exports.getUsersCount = async (req, res) => {
  try {
    const { includeDeleted = 'false' } = req.query;

    const total = await User.count({
      where: includeDeleted === 'true' ? {} : { is_deleted: 0 }
    });

    const active = await User.count({
      where: { is_disabled: 0, ...(includeDeleted === 'true' ? {} : { is_deleted: 0 }) }
    });

    const disabled = await User.count({
      where: { is_disabled: 1, ...(includeDeleted === 'true' ? {} : { is_deleted: 0 }) }
    });

    return res.json({
      success: true,
      users: {
        total: Number(total),
        active: Number(active),
        disabled: Number(disabled)
      }
    });
  } catch (err) {
    console.error('getUsersCount Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
