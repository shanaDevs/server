// models/Payment.js
const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    amountPaid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'amount_paid'
    },

    paymentType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'payment_type'
    },

    balanceAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      field: 'balance_amount'
    },

    paymentMethod: {
      type: DataTypes.ENUM('CASH', 'CARD', 'QR', 'BANK', 'CHEQUE', 'CREDIT', 'OTHER'),
      allowNull: false,
      field: 'payment_method'
    },

    referenceNo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      field: 'reference_no',
      comment: 'Human readable payment reference (e.g. CSH-20251203-001)'
    },

    paidDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'paid_date'
    },

    note: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'created_by'
    },

    isCancelled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_cancelled'
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'branch_id'
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['reference_no'], unique: true },
    ]
  });

  Payment.beforeCreate(async (payment, options) => {
    // determine prefix from paymentMethod
    const prefixMap = {
      CASH: 'CSH',
      CARD: 'CRD',
      CREDIT: 'CRD',
        QR: 'QR',
        BANK: 'BNK',
        CHEQUE: 'CHQ',
        OTHER: 'OTH'
    };

    const prefix = prefixMap[payment.paymentMethod] || 'PMT';

    const dt = payment.paidDate ? new Date(payment.paidDate) : new Date();
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const dateString = `${yyyy}${mm}${dd}`; // e.g. 20251203

    // pattern to match existing refs for same prefix+date
    const likePattern = `${prefix}-${dateString}-%`;

    // find last payment with same prefix+date (order by created_at desc)
    // note: using 'created_at' because underscored: true; adjust if you want 'paid_date'
    const lastPayment = await Payment.findOne({
      where: {
        referenceNo: { [Op.like]: likePattern }
      },
      order: [['created_at', 'DESC']]
    });

    let nextNum = 1;
    if (lastPayment && lastPayment.referenceNo) {
      const parts = lastPayment.referenceNo.split('-');
      const seqPart = parts[2] || '';
      const parsed = parseInt(seqPart, 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }

    const seq = String(nextNum).padStart(5, '0');
    payment.referenceNo = `${prefix}-${dateString}-${seq}`;
  });

  return Payment;
};
