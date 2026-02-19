const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SalePromotion = sequelize.define('SalePromotion', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        saleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'sale_id',
            references: {
                model: 'sales',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        promotionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'promotion_id',
            references: {
                model: 'promotions',
                key: 'id'
            }
        },
        promoCode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'promo_code'
        },
        discountAmount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'discount_amount',
            comment: 'Amount of discount contribution from this specific promotion'
        }
    }, {
        tableName: 'sale_promotions',
        timestamps: true,
        underscored: true
    });

    return SalePromotion;
};
