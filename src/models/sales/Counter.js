module.exports = (sequelize, DataTypes) => {
    const Counter = sequelize.define('Counter', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        counterName: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Name of the counter e.g. Counter 1, Express Counter'
        },
        counterCode: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'branches',
                key: 'id'
            }
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
        tableName: 'counters',
        timestamps: true
    });

    return Counter;
};
