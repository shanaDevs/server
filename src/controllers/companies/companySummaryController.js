// controllers/companySummaryController.js

const { Companies } = require('../../models');

// 1️⃣ Total companies
exports.getTotalCompanies = async (req, res) => {
  try {
    const total = await Companies.count();
    const companies = await Companies.findAll({
      attributes: ['id', 'name', 'address', 'contact_email', 'phone_number', 'created_at', 'updated_at'],
      order: [['id', 'ASC']],
      raw: true
    });
    return res.status(200).json({ success: true, total, companies });
  } catch (error) {
    console.error('Error fetching total companies:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 2️⃣ Active companies
exports.getActiveCompanies = async (req, res) => {
  try {
    const totalActive = await Companies.count({ where: { isdisabled: 0 } });
    const activeCompanies = await Companies.findAll({
      where: { isdisabled: 0 },
      attributes: ['id', 'name', 'address', 'contact_email', 'phone_number', 'created_at', 'updated_at'],
      order: [['id', 'ASC']],
      raw: true
    });
    return res.status(200).json({ success: true, totalActive, activeCompanies });
  } catch (error) {
    console.error('Error fetching active companies:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 3️⃣ Disabled companies
exports.getDisabledCompanies = async (req, res) => {
  try {
    const totalDisabled = await Companies.count({ where: { isdisabled: 1 } });
    const disabledCompanies = await Companies.findAll({
      where: { isdisabled: 1 },
      attributes: ['id', 'name', 'address', 'contact_email', 'phone_number', 'created_at', 'updated_at'],
      order: [['id', 'ASC']],
      raw: true
    });
    return res.status(200).json({ success: true, totalDisabled, disabledCompanies });
  } catch (error) {
    console.error('Error fetching disabled companies:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 4️⃣ Last created company
exports.getLatestCompany = async (req, res) => {
  try {
    const latestCompany = await Companies.findOne({
      attributes: ['id', 'name', 'address', 'contact_email', 'phone_number', 'created_at', 'updated_at'],
      order: [['created_at', 'DESC']],
      raw: true
    });

    return res.status(200).json({ success: true, latestCompany });
  } catch (error) {
    console.error('Error fetching latest company:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
