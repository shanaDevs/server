module.exports = (sequelize, DataTypes) => {
  const PromotionEmail = sequelize.define('PromotionEmail', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    promotionType: {
      type: DataTypes.ENUM('BIRTHDAY', 'SEASONAL', 'CLEARANCE', 'NEW_ARRIVAL'),
      allowNull: false,
      comment: 'Type of promotion this email is for'
    },
    count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Count of emails sent or other tracking number'
    },
    promotionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'promotions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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
    tableName: 'promotion_emails',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['promotion_id']
      },
      {
        fields: ['customer_id']
      },
      {
        fields: ['promotion_id', 'customer_id']
      },
      {
        fields: ['promotion_type']
      }
    ]
  });

  return PromotionEmail;
};
