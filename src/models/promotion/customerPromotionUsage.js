module.exports = (sequelize, DataTypes) => {
  const CustomerPromotionUsage = sequelize.define('CustomerPromotionUsage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    customerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Customer ID, nullable for guest purchases'
    },

    promotionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Promotion ID'
    },

    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'Number of times this customer has used this promotion'
    },

    lastUsedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Last time this promotion was used by the customer'
    }

  }, {
    tableName: 'customer_promotion_usage',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['customer_id', 'promotion_id']
      },
      {
        fields: ['customer_id']
      },
      {
        fields: ['promotion_id']
      }
    ]
  });

  CustomerPromotionUsage.associate = (models) => {
    // Association with Promotion
    CustomerPromotionUsage.belongsTo(models.Promotion, {
      foreignKey: 'promotionId',
      as: 'promotion',
      onDelete: 'CASCADE'
    });

    // Association with Customer (if customer model exists)
    if (models.Customer) {
      CustomerPromotionUsage.belongsTo(models.Customer, {
        foreignKey: 'customerId',
        as: 'customer',
        onDelete: 'SET NULL'
      });
    }
  };

  return CustomerPromotionUsage;
};
