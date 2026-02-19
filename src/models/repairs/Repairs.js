const {DataTypes} = require('sequelize');

module.exports = (sequelize) => {
   const Repairs = sequelize.define('Repairs', {
       id: {
           type: DataTypes.INTEGER,
           primaryKey: true,
           autoIncrement: true
       },
       name: {
           type: DataTypes.STRING,
           allowNull: false,
           field: 'name'
       },
       basicCharge: {
            type: DataTypes.DECIMAL(18, 4),
            allowNull: false,
            defaultValue: 0.0000,
            field: 'basic_charge'
       },
       VAS: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'vas'
       },
       branchId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'branch_id'
       },
       createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'createdby'
       },
    }, {timestamps: true,
        underscored: true});

    return Repairs;
}
