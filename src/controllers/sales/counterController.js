const { Counter, CounterSession, User, Branch } = require('../../models');
const { Op } = require('sequelize');

/**
 * Register a new counter
 */
exports.createCounter = async (req, res, next) => {
    try {
        const { counterName, counterCode } = req.body;
        const branchId = req.branchId;

        if (!counterName) {
            return res.status(400).json({
                success: false,
                message: 'Counter name is required'
            });
        }

        // Check if counter code already exists in this branch
        if (counterCode) {
            const existing = await Counter.findOne({
                where: { counterCode, branchId, isDeleted: false }
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Counter code already exists in this branch'
                });
            }
        }

        const counter = await Counter.create({
            counterName,
            counterCode,
            branchId,
            isActive: true
        });

        res.status(201).json({
            success: true,
            message: 'Counter registered successfully',
            data: counter
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all counters for a branch
 */
exports.getCounters = async (req, res, next) => {
    try {
        const branchId = req.branchId;
        const counters = await Counter.findAll({
            where: { 
                branchId,
                isDeleted: false,
                isActive: true
            }
        });
        res.json({ success: true, data: counters });
    } catch (error) {
        next(error);
    }
};

/**
 * Check if the current user has an open session for today
 */
exports.checkActiveSession = async (req, res, next) => {
    try {
        const branchId = req.branchId;
        const userId = req.user.id;
        
        // Find an open session for this user in this branch
        const session = await CounterSession.findOne({
            where: {
                branchId,
                userId,
                status: 'OPEN'
            },
            include: [{ model: Counter, as: 'counter' }]
        });

        res.json({ 
            success: true, 
            hasActiveSession: !!session,
            session: session || null
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Open a new counter session (Morning Login / Day Start)
 */
exports.openSession = async (req, res, next) => {
    try {
        const { counterId, openingBalance, notes } = req.body;
        const branchId = req.branchId;
        const userId = req.user.id;

        // 1. Check if the counter is already open by someone else
        const existingSession = await CounterSession.findOne({
            where: {
                counterId,
                status: 'OPEN'
            }
        });

        if (existingSession) {
            return res.status(400).json({
                success: false,
                message: 'This counter is already being used by another salesperson.'
            });
        }

        // 2. Check if the user already has an open session
        const userSession = await CounterSession.findOne({
            where: {
                userId,
                status: 'OPEN'
            }
        });

        if (userSession) {
            return res.status(400).json({
                success: false,
                message: 'You already have an open session. Please close it before opening another.'
            });
        }

        // 3. Create the session
        const session = await CounterSession.create({
            counterId,
            userId,
            branchId,
            openingBalance: openingBalance || 0,
            openingTime: new Date(),
            status: 'OPEN',
            notes
        });

        res.status(201).json({
            success: true,
            message: 'Counter opened successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Close a counter session (End of Shift / Day End)
 */
exports.closeSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { closingBalance, notes } = req.body;

        const session = await CounterSession.findByPk(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        if (session.status === 'CLOSED') {
            return res.status(400).json({
                success: false,
                message: 'Session is already closed'
            });
        }

        session.closingBalance = closingBalance;
        session.closingTime = new Date();
        session.status = 'CLOSED';
        session.notes = notes ? `${session.notes || ''}\nClosing Notes: ${notes}` : session.notes;

        await session.save();

        res.json({
            success: true,
            message: 'Counter session closed successfully',
            data: session
        });
    } catch (error) {
        next(error);
    }
};
