const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupplierReturn = sequelize.define('SupplierReturn', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    returnNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'return_number',
      unique: true
    },

    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'supplier_id',
      validate: {
        notNull: { msg: 'supplier_id is required' },
        isInt: { msg: 'supplier_id must be an integer' }
      }
    },

    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
      validate: {
        notNull: { msg: 'product_id is required' },
        isInt: { msg: 'product_id must be an integer' }
      }
    },

    grnId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'grn_id'
    },

    returnDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'return_date',
      defaultValue: DataTypes.NOW,
    },

    returnReason: {
      type: DataTypes.ENUM('defective', 'damaged', 'expired', 'wrong_item', 'quality_issue', 'overstock', 'other'),
      allowNull: false,
      defaultValue: 'other',
      field: 'return_reason'
    },

    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'expiry_date',
      comment: 'Product expiry date if return reason is expired'
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    quantity: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
    },

    unitCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'unit_cost'
    },

    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'total_amount'
    },

    // Payment tracking
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'partial', 'received', 'credited', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      field: 'payment_status'
    },

    receivedAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'received_amount'
    },

    balanceAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: 'balance_amount'
    },

    status: {
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },

    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'approved_by'
    },

    approvedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'approved_date'
    },

    performedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'performed_by_user_id',
      validate: {
        isInt: { msg: 'performed_by_user_id must be an integer' }
      }
    },

    branchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'branch_id'
    }

    // createdAt, updatedAt handled by timestamps:true
  }, {
    tableName: 'supplier_returns',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['supplier_id'] },
      { fields: ['product_id'] },
      { fields: ['return_date'] },
      { fields: ['return_reason'] },
      { fields: ['payment_status'] },
      { fields: ['status'] },
      { fields: ['return_number'] }
    ]
  });

  return SupplierReturn;
};
