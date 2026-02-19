module.exports = (sequelize, DataTypes) => {
  const Promotion = sequelize.define('Promotion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Promotion Type: 'PRODUCT' for product-specific, 'BILL' for full bill, 'BOGO' for buy one get one
    promotionType: {
      type: DataTypes.ENUM('PRODUCT', 'BILL', 'BOGO', 'BUY_X_GET_Y'),
      allowNull: false,
      defaultValue: 'PRODUCT'
    },

    // Product Code (instead of productId for easier management)
    productCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Product code for product-specific promotions'
    },

    // Legacy productId (kept for backward compatibility)
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    title: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    description: {
      type: DataTypes.TEXT
    },

    discountPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },

    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },

    // Coupon Code for discount code promotions
    couponCode: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: true,
      comment: 'Unique coupon code that customers can apply'
    },

    // Legacy promoCode (kept for backward compatibility)
    promoCode: {
      type: DataTypes.STRING(50)
    },

    // For BOGO and BUY_X_GET_Y promotions
    buyQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Quantity to buy for BOGO or BUY_X_GET_Y'
    },

    getQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Quantity to get free for BOGO or BUY_X_GET_Y'
    },

    // For BUY_X_GET_Y: the product code to be given
    rewardProductCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Product code for the reward product in BUY_X_GET_Y promotions'
    },

    rewardProductId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Product ID for the reward product in BUY_X_GET_Y promotions'
    },

    // Minimum purchase amount for bill-level promotions
    minimumPurchaseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Minimum purchase amount required for bill promotions'
    },

    // Maximum discount cap
    maximumDiscountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Maximum discount amount that can be applied'
    },

    // Usage limit
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum number of times this promotion can be used'
    },

    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times this promotion has been used'
    },

    // Per customer usage limit
    perCustomerLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum times a single customer can use this promotion'
    },

    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },

    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },

    // Expiration Date - for time-sensitive promotions (like birthday coupons)
    expireDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Exact expiration date and time for coupon (e.g., birthday + 48 hours)'
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }


  }, {
    tableName: 'promotions',
    timestamps: true,
    underscored: true
  });



  return Promotion;
};
