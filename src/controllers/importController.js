const db = require('../models');
const { Op } = require('sequelize');

/**
 * Import suppliers from CSV file
 * POST /api/suppliers/import
 */
exports.importSuppliersFromCSV = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CSV file uploaded'
            });
        }

        const fs = require('fs');
        const csv = require('csv-parser');

        const results = [];
        let rowNumber = 0;
        const filePath = req.file.path;

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    rowNumber++;
                    results.push({ ...data, rowNumber });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (results.length === 0) {
            await transaction.rollback();
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: 'CSV file is empty'
            });
        }

        const imported = [];
        const skipped = [];

        for (const row of results) {
            try {
                if (!row.name) {
                    skipped.push({
                        row: row.rowNumber,
                        data: row,
                        reason: 'Missing required field: name'
                    });
                    continue;
                }

                // Check for duplicate by name
                const existing = await db.Suppliers.findOne({
                    where: { name: row.name },
                    transaction
                });

                if (existing) {
                    skipped.push({
                        row: row.rowNumber,
                        data: row,
                        reason: `Supplier with name "${row.name}" already exists`
                    });
                    continue;
                }

                // Find or create company
                let targetCompanyId = null;
                const companyName = row.company_name || row.company || row.name; // Fallback to supplier name if no company provided
                
                if (row.company_id) {
                    targetCompanyId = parseInt(row.company_id);
                } else if (companyName) {
                    let company = await db.Companies.findOne({
                        where: { name: companyName },
                        transaction
                    });
                    
                    if (!company) {
                        // Create company if it doesn't exist
                        company = await db.Companies.create({
                            name: companyName,
                            phoneNumber: row.phone || row.phone_number || '0000000000', // Default phone if missing
                            address: row.address || null,
                            contactEmail: row.email || null,
                            branchId: req.branchId
                        }, { transaction });
                    }
                    targetCompanyId = company.id;
                }

                if (!targetCompanyId) {
                    skipped.push({
                        row: row.rowNumber,
                        data: row,
                        reason: 'Missing company information or failed to create company'
                    });
                    continue;
                }

                const supplierData = {
                    companyId: targetCompanyId,
                    name: row.name,
                    contactPerson: row.contact_person || null,
                    phone: row.phone || null,
                    email: row.email || null,
                    address: row.address || null,
                    city: row.city || null,
                    state: row.state || null,
                    country: row.country || null,
                    postalCode: row.postal_code || null,
                    taxId: row.tax_id || null,
                    paymentTerms: row.payment_terms || null,
                    creditLimit: row.credit_limit ? parseFloat(row.credit_limit) : null,
                    notes: row.notes || null,
                    isActive: row.is_active !== undefined ? row.is_active === '1' || row.is_active === 'true' : true,
                    branchId: req.branchId
                    
                };

                const supplier = await db.Suppliers.create(supplierData, { transaction });

                imported.push({
                    row: row.rowNumber,
                    supplierId: supplier.id,
                    name: supplier.name
                });

            } catch (error) {
                skipped.push({
                    row: row.rowNumber,
                    data: row,
                    reason: error.message
                });
            }
        }

        await transaction.commit();
        fs.unlinkSync(filePath);

        res.status(201).json({
            success: true,
            message: `Import completed. ${imported.length} suppliers imported, ${skipped.length} skipped`,
            data: {
                imported,
                skipped,
                summary: {
                    totalRows: results.length,
                    imported: imported.length,
                    skipped: skipped.length
                }
            }
        });

    } catch (error) {
        await transaction.rollback();
        if (req.file && req.file.path) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('Error deleting file:', e);
            }
        }
        next(error);
    }
};

/**
 * Import categories from CSV file
 * POST /api/categories/import
 */
exports.importCategoriesFromCSV = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CSV file uploaded'
            });
        }

        const fs = require('fs');
        const csv = require('csv-parser');

        const results = [];
        let rowNumber = 0;
        const filePath = req.file.path;

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    rowNumber++;
                    results.push({ ...data, rowNumber });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (results.length === 0) {
            await transaction.rollback();
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: 'CSV file is empty'
            });
        }

        const imported = [];
        const skipped = [];

        for (const row of results) {
            try {
                if (!row.name) {
                    skipped.push({
                        row: row.rowNumber,
                        data: row,
                        reason: 'Missing required field: name'
                    });
                    continue;
                }

                // Check for duplicate by name
                const existing = await db.Category.findOne({
                    where: { name: row.name },
                    transaction
                });

                if (existing) {
                    skipped.push({
                        row: row.rowNumber,
                        data: row,
                        reason: `Category with name "${row.name}" already exists`
                    });
                    continue;
                }

                const categoryData = {
                    name: row.name,
                    description: row.description || null,
                    image: row.image || null,
                    parentId: row.parent_id ? parseInt(row.parent_id) : null,
                    isActive: row.is_active !== undefined ? row.is_active === '1' || row.is_active === 'true' : true,
                    branchId: req.branchId
                };

                const category = await db.Category.create(categoryData, { transaction });

                imported.push({
                    row: row.rowNumber,
                    categoryId: category.id,
                    name: category.name
                });

            } catch (error) {
                skipped.push({
                    row: row.rowNumber,
                    data: row,
                    reason: error.message
                });
            }
        }

        await transaction.commit();
        fs.unlinkSync(filePath);

        res.status(201).json({
            success: true,
            message: `Import completed. ${imported.length} categories imported, ${skipped.length} skipped`,
            data: {
                imported,
                skipped,
                summary: {
                    totalRows: results.length,
                    imported: imported.length,
                    skipped: skipped.length
                }
            }
        });

    } catch (error) {
        await transaction.rollback();
        if (req.file && req.file.path) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('Error deleting file:', e);
            }
        }
        next(error);
    }
};

/**
 * Import brands from CSV file
 * POST /api/brands/import
 */
exports.importBrandsFromCSV = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CSV file uploaded'
            });
        }

        const fs = require('fs');
        const csv = require('csv-parser');

        const results = [];
        let rowNumber = 0;
        const filePath = req.file.path;

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    rowNumber++;
                    results.push({ ...data, rowNumber });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (results.length === 0) {
            await transaction.rollback();
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: 'CSV file is empty'
            });
        }

        const imported = [];
        const skipped = [];

        for (const row of results) {
            try {
                if (!row.name) {
                    skipped.push({
                        row: row.rowNumber,
                        data: row,
                        reason: 'Missing required field: name'
                    });
                    continue;
                }

                // Check for duplicate by name
                const existing = await db.Brand.findOne({
                    where: { name: row.name },
                    transaction
                });

                if (existing) {
                    skipped.push({
                        row: row.rowNumber,
                        data: row,
                        reason: `Brand with name "${row.name}" already exists`
                    });
                    continue;
                }

                const brandData = {
                    name: row.name,
                    description: row.description || null,
                    website: row.website || null,
                    logo: row.logo || null,
                    image: row.image || null,
                    isActive: row.is_active !== undefined ? row.is_active === '1' || row.is_active === 'true' : true,
                    branchId: req.branchId
                };

                const brand = await db.Brand.create(brandData, { transaction });

                imported.push({
                    row: row.rowNumber,
                    brandId: brand.id,
                    name: brand.name
                });

            } catch (error) {
                skipped.push({
                    row: row.rowNumber,
                    data: row,
                    reason: error.message
                });
            }
        }

        await transaction.commit();
        fs.unlinkSync(filePath);

        res.status(201).json({
            success: true,
            message: `Import completed. ${imported.length} brands imported, ${skipped.length} skipped`,
            data: {
                imported,
                skipped,
                summary: {
                    totalRows: results.length,
                    imported: imported.length,
                    skipped: skipped.length
                }
            }
        });

    } catch (error) {
        await transaction.rollback();
        if (req.file && req.file.path) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('Error deleting file:', e);
            }
        }
        next(error);
    }
};

/**
 * Import companies from CSV file
 * POST /api/companies/import
 */
exports.importCompaniesFromCSV = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CSV file uploaded'
            });
        }

        const fs = require('fs');
        const csv = require('csv-parser');

        const results = [];
        let rowNumber = 0;
        const filePath = req.file.path;

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    rowNumber++;
                    results.push({ ...data, rowNumber });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (results.length === 0) {
            await transaction.rollback();
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: 'CSV file is empty'
            });
        }

        const imported = [];
        const skipped = [];

        for (const row of results) {
            try {
                if (!row.name) {
                    skipped.push({
                        row: row.rowNumber,
                        data: row,
                        reason: 'Missing required field: name'
                    });
                    continue;
                }

                // Check for duplicate by name
                const existing = await db.Companies.findOne({
                    where: { name: row.name },
                    transaction
                });

                if (existing) {
                    skipped.push({
                        row: row.rowNumber,
                        data: row,
                        reason: `Company with name "${row.name}" already exists`
                    });
                    continue;
                }

                const companyData = {
                    name: row.name,
                    address: row.address || null,
                    contactEmail: row.contact_email || null,
                    phoneNumber: row.phone_number || row.phone || '0000000000',
                    branchId: req.branchId,
                    isdisabled: row.is_disabled !== undefined ? row.is_disabled === '1' || row.is_disabled === 'true' : false,
                    idDeleted: false
                };

                const company = await db.Companies.create(companyData, { transaction });

                imported.push({
                    row: row.rowNumber,
                    companyId: company.id,
                    name: company.name
                });

            } catch (error) {
                skipped.push({
                    row: row.rowNumber,
                    data: row,
                    reason: error.message
                });
            }
        }

        await transaction.commit();
        fs.unlinkSync(filePath);

        res.status(201).json({
            success: true,
            message: `Import completed. ${imported.length} companies imported, ${skipped.length} skipped`,
            data: {
                imported,
                skipped,
                summary: {
                    totalRows: results.length,
                    imported: imported.length,
                    skipped: skipped.length
                }
            }
        });

    } catch (error) {
        await transaction.rollback();
        if (req.file && req.file.path) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('Error deleting file:', e);
            }
        }
        next(error);
    }
};
