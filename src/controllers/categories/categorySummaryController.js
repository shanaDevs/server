const {Category} = require('../../models');

exports.getAllCategoryCount = async (req, res) => {
  try {
    // 1. Count
    const total = await Category.count();

    // 2. Full dataset (all categories)
    const categories = await Category.findAll({
      attributes: ['id', 'category_code', 'name', 'description', 'parent_id', 'is_active', 'created_at'],
      order: [['id', 'ASC']],
      raw: true
    });

    // 3. Send response
    return res.status(200).json({
      success: true,
      totalCategories: total,
      categories: categories
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getActiveCategoryCount = async (req, res) => {
  try {
    const active = await Category.count({ where: { is_active: 1 }});
    const categories = await Category.findAll({
      where: { is_active: 1 },
      attributes: ['id', 'category_code', 'name', 'description', 'parent_id', 'is_active', 'created_at'],
      order: [['id', 'ASC']],
      raw: true
    });

    return res.status(200).json({
      success: true,
      activeCategories: active,
      categories
    });
  } catch (error) {
    console.error('Error fetching active categories:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// 3️⃣ Inactive categories count + dataset
exports.getInactiveCategoryCount = async (req, res) => {
  try {
    const inactive = await Category.count({ where: { is_active: 0 }});
    const categories = await Category.findAll({
      where: { is_active: 0 },
      attributes: ['id', 'category_code', 'name', 'description', 'parent_id', 'is_active', 'created_at'],
      order: [['id', 'ASC']],
      raw: true
    });

    return res.status(200).json({
      success: true,
      inactiveCategories: inactive,
      categories
    });
  } catch (error) {
    console.error('Error fetching inactive categories:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
