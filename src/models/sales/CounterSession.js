module.exports = (sequelize, DataTypes) => {
    const CounterSession = sequelize.define('CounterSession', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        counterId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'counters',
                key: 'id'
            }
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'branches',
                key: 'id'
            }
        },
        openingBalance: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        closingBalance: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        openingTime: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        closingTime: {
            type: DataTypes.DATE,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('OPEN', 'CLOSED'),
            defaultValue: 'OPEN'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        denominations: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'JSON breakdown of cash denominations (e.g. { "5000": 10, "1000": 5, ... })'
        },
        actualCashReceived: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            field: 'actual_cash_received',
            comment: 'Total cash calculated from denominations'
        }
    }, {
        tableName: 'counter_sessions',
        timestamps: true
    });

    return CounterSession;
};
