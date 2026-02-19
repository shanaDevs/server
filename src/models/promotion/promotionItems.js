module.exports = (sequelize, DataTypes) => {
  const PromotionItem = sequelize.define('PromotionItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    promotionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'promotions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    productCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Product code for reference'
    },
    buyQty: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Quantity customer needs to buy'
    },
    getQty: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Quantity customer gets free or discounted'
    },
    discountPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Discount percentage for this item'
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Fixed discount amount for this item'
    },
    sellingPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Special selling price for this promotion'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'promotion_items',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['promotion_id']
      },
      {
        fields: ['product_id']
      },
      {
        fields: ['promotion_id', 'product_id'],
        unique: true
      }
    ]
  });

  return PromotionItem;
};
