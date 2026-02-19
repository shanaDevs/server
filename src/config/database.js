const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'pos_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || 'AllPos145',
    {
        host: process.env.DB_HOST || '72.60.195.186',
        port: process.env.DB_PORT || 3380,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: false
        }
    }
);

module.exports = { sequelize, Sequelize };

