const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Sms = sequelize.define('sms', {

        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        from: {
            type: DataTypes.STRING,
            allowNull: false
        },
        to: {
            type: DataTypes.STRING,
            allowNull: false
        },
        body: {
            type: DataTypes.STRING,
            allowNull: false
        },
        smsType: {
            type: DataTypes.ENUM('Birthday', 'Promotions', 'In-Store Purchase', 'Online Order'),
            allowNull: false
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }  
            
    }, {});
    return Sms;
}