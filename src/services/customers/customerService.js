const { Customer, CustomerLoyalty, CustomerCredit, CustomerPurchaseHistory, User } = require('../../models');
const db = require('../../models');
const { Op } = require('sequelize');

class CustomerService {
    async getAllCustomers(filters, pagination, branchConfig) {
        const { search, customerType, isActive } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = { isDeleted: false };
        
        // Apply branch filter manually since we don't have req
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess) {
             if (!branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
                 where.branchId = branchAccess.branches;
             }
        }

        if (search) {
            where[Op.or] = [
                { customerName: { [Op.like]: `%${search}%` } },
                { customerCode: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } }
            ];
        }
        
        if (customerType) where.customerType = customerType;
        if (isActive !== undefined) where.isActive = isActive === 'true';
        
        return await Customer.findAndCountAll({
            where,
            include: [
                { model: User, as: 'creator', attributes: ['id', 'userName', 'phone'] }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });
    }

    async getCustomerById(id, branchConfig) {
        const where = { id, isDeleted: false };
        const { branchId, branchAccess } = branchConfig;
        
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }
        
        return await Customer.findOne({
            where,
            include: [
                { model: User, as: 'creator', attributes: ['id', 'userName', 'phone'] }
            ]
        });
    }

    async createCustomer(data, transaction) {
        return await Customer.create(data, { transaction });
    }

    async updateCustomer(id, data, branchConfig, transaction) {
        const customer = await this.getCustomerById(id, branchConfig);
        if (!customer) return null;

        return await customer.update(data, { transaction });
    }

    async deleteCustomer(id, branchConfig, transaction) {
        const customer = await this.getCustomerById(id, branchConfig);
        if (!customer) return null;

        return await customer.update({
            isActive: false,
            isDeleted: true
        }, { transaction });
    }

    async toggleStatus(id, branchConfig, transaction) {
        const customer = await this.getCustomerById(id, branchConfig);
        if (!customer) return null;

        return await customer.update({
            isActive: !customer.isActive
        }, { transaction });
    }

    async getPurchaseHistory(id, pagination, branchConfig) {
        const customer = await this.getCustomerById(id, branchConfig);
        if (!customer) return null;

        const historyWhere = { customerId: id };
        // Apply branch filter logic for history
        const { branchId, branchAccess } = branchConfig;
        if (branchId) {
            historyWhere.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            historyWhere.branchId = branchAccess.branches;
        }

        return await CustomerPurchaseHistory.findAndCountAll({
            where: historyWhere,
            limit: pagination.limit,
            offset: pagination.offset,
            order: [['saleDate', 'DESC']]
        });
    }

    async getLoyaltyDetails(id, pagination, branchConfig) {
        const customer = await Customer.findOne({
            where: { id, isDeleted: false }, // Use basic find, strict branch check might be needed
            attributes: ['id', 'customerCode', 'customerName', 'loyaltyPoints', 'branchId']
        });
        
        if (!customer) return null;

        // Verify branch access
        const { branchId: reqBranchId, branchAccess } = branchConfig;
        if (reqBranchId && customer.branchId && customer.branchId !== reqBranchId) return null; // Simple check
        
        const loyaltyWhere = { customerId: id };
        if (reqBranchId) loyaltyWhere.branchId = reqBranchId;

        const transactions = await CustomerLoyalty.findAndCountAll({
            where: loyaltyWhere,
            limit: pagination.limit,
            offset: pagination.offset,
            order: [['createdAt', 'DESC']]
        });

        return { customer, transactions };
    }

    async addLoyaltyPoints(id, data, branchConfig, transaction) {
        const customer = await this.getCustomerById(id, branchConfig);
        if (!customer) throw new Error('Customer not found');

        const newBalance = customer.loyaltyPoints + parseInt(data.points);
        await customer.update({ loyaltyPoints: newBalance }, { transaction });

        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        const loyaltyData = {
            customerId: id,
            transactionType: 'earn',
            points: parseInt(data.points),
            balancePoints: newBalance,
            referenceType: data.referenceType || 'manual',
            referenceId: data.referenceId,
            expiryDate,
            notes: data.notes,
            performedBy: data.performedBy,
            branchId: data.branchId
        };

        await CustomerLoyalty.create(loyaltyData, { transaction });
        return { customerId: id, pointsAdded: data.points, totalPoints: newBalance };
    }

    async redeemLoyaltyPoints(id, data, branchConfig, transaction) {
        const customer = await this.getCustomerById(id, branchConfig);
        if (!customer) throw new Error('Customer not found');

        if (customer.loyaltyPoints < parseInt(data.points)) {
            throw new Error('Insufficient loyalty points');
        }

        const newBalance = customer.loyaltyPoints - parseInt(data.points);
        await customer.update({ loyaltyPoints: newBalance }, { transaction });

        const loyaltyData = {
            customerId: id,
            transactionType: 'redeem',
            points: -parseInt(data.points),
            balancePoints: newBalance,
            referenceType: data.referenceType || 'manual',
            referenceId: data.referenceId,
            notes: data.notes,
            performedBy: data.performedBy,
            branchId: data.branchId
        };

        await CustomerLoyalty.create(loyaltyData, { transaction });
        return { customerId: id, pointsRedeemed: data.points, remainingPoints: newBalance };
    }

    async getCreditHistory(id, pagination, filters, branchConfig) {
        const customer = await this.getCustomerById(id, branchConfig);
        if (!customer) return null;

        const creditWhere = { customerId: id };
        if (filters.status) creditWhere.status = filters.status;
        
        const { branchId } = branchConfig;
        if (branchId) creditWhere.branchId = branchId;

        const transactions = await CustomerCredit.findAndCountAll({
            where: creditWhere,
            limit: pagination.limit,
            offset: pagination.offset,
            order: [['createdAt', 'DESC']]
        });

        // Calculate credit summary
        const creditBalance = parseFloat(customer.currentCredit) || 0;
        const creditLimit = parseFloat(customer.creditLimit) || 0;
        const availableCredit = Math.max(0, creditLimit - creditBalance);
        const utilization = creditLimit > 0 ? ((creditBalance / creditLimit) * 100) : 0;

        const creditSummary = {
            creditBalance: creditBalance,
            creditLimit: creditLimit,
            availableCredit: availableCredit,
            utilization: Math.round(utilization * 10) / 10,
            calculation: `${creditLimit.toFixed(2)} - ${creditBalance.toFixed(2)}`
        };

        return { customer, transactions, creditSummary };
    }

    async issueCredit(id, data, branchConfig, transaction) {
        const customer = await this.getCustomerById(id, branchConfig);
        if (!customer) throw new Error('Customer not found');

        const newCreditBalance = parseFloat(customer.currentCredit) + parseFloat(data.amount);
        if (newCreditBalance > parseFloat(customer.creditLimit)) {
            throw new Error(`Credit limit exceeded. Available: ${parseFloat(customer.creditLimit) - parseFloat(customer.currentCredit)}`);
        }

        await customer.update({ currentCredit: newCreditBalance }, { transaction });

        const creditData = {
            customerId: id,
            transactionType: 'credit_issued',
            amount: parseFloat(data.amount),
            balanceAmount: newCreditBalance,
            referenceType: (data.referenceType === 'mannual' || data.referenceType === 'manual') ? 'adjustment' : (data.referenceType || 'adjustment'),            referenceId: data.referenceId,
            dueDate: data.dueDate,
            status: 'pending',
            notes: data.notes,
            performedBy: data.performedBy,
            branchId: data.branchId
        };

        await CustomerCredit.create(creditData, { transaction });
        return { 
            customerId: id, 
            creditAmount: data.amount, 
            currentCredit: newCreditBalance,
            availableCredit: parseFloat(customer.creditLimit) - newCreditBalance 
        };
    }

    async receivePayment(id, data, branchConfig, transaction) {
        const customer = await this.getCustomerById(id, branchConfig);
        if (!customer) throw new Error('Customer not found');

        if (parseFloat(customer.currentCredit) <= 0) {
            throw new Error('No outstanding credit to pay');
        }

        const paymentAmount = Math.min(parseFloat(data.amount), parseFloat(customer.currentCredit));
        const newCreditBalance = parseFloat(customer.currentCredit) - paymentAmount;

        await customer.update({ currentCredit: newCreditBalance }, { transaction });

        const paymentData = {
            customerId: id,
            transactionType: 'payment_received',
            amount: -paymentAmount,
            balanceAmount: newCreditBalance,
            referenceType: 'payment',
            referenceId: data.referenceId,
            paymentMethod: data.paymentMethod || 'cash',
            paidDate: new Date(),
            status: 'paid',
            notes: data.notes,
            performedBy: data.performedBy,
            branchId: data.branchId
        };

        await CustomerCredit.create(paymentData, { transaction });
        return {
            customerId: id,
            paymentAmount: paymentAmount,
            remainingCredit: newCreditBalance
        };
    }

    async getCreditSummary(id, branchConfig) {
        const customer = await this.getCustomerById(id, branchConfig);
        if (!customer) return null;

        const creditBalance = parseFloat(customer.currentCredit) || 0;
        const creditLimit = parseFloat(customer.creditLimit) || 0;
        const availableCredit = Math.max(0, creditLimit - creditBalance);
        const utilization = creditLimit > 0 ? ((creditBalance / creditLimit) * 100) : 0;

        return {
            creditBalance: creditBalance,
            creditLimit: creditLimit,
            availableCredit: availableCredit,
            utilization: Math.round(utilization * 10) / 10, // Round to 1 decimal place
            calculation: `${creditLimit.toFixed(2)} - ${creditBalance.toFixed(2)}`
        };
    }
    
    async getStatistics(id, branchConfig) {
        const customer = await this.getCustomerById(id, branchConfig);
        if (!customer) return null;

        const purchaseWhere = { customerId: id };
        const { branchId } = branchConfig;
        if (branchId) purchaseWhere.branchId = branchId;

        const purchaseStats = await CustomerPurchaseHistory.findOne({
            where: purchaseWhere,
            attributes: [
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalOrders'],
                [db.sequelize.fn('SUM', db.sequelize.col('net_amount')), 'totalPurchases'],
                [db.sequelize.fn('AVG', db.sequelize.col('net_amount')), 'averageOrderValue']
            ],
            raw: true
        });

        const creditWhere = { 
            customerId: id,
            status: { [Op.in]: ['pending', 'partial', 'overdue'] }
        };
        if (branchId) creditWhere.branchId = branchId;

        const pendingCredits = await CustomerCredit.findOne({
            where: creditWhere,
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalPending']
            ],
            raw: true
        });

        return {
            customer: {
                id: customer.id,
                customerCode: customer.customerCode,
                customerName: customer.customerName,
                totalPoints: customer.loyaltyPoints,
                creditLimit: customer.creditLimit,
                currentCredit: customer.currentCredit
            },
            stats: {
                ...purchaseStats,
                totalPendingCredit: pendingCredits ? pendingCredits.totalPending : 0
            }
        };
    }
}

module.exports = new CustomerService();
