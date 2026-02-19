const PDFDocument = require('pdfkit');
const { SystemSettings } = require('../models');
const { generateBarcode } = require('./barcodeGenerator');
const axios = require('axios');


/**
 * Paper size configurations
 */
const PAPER_SIZES = {
    A4: { width: 595.28, height: 841.89, margin: 50 },
    A5: { width: 419.53, height: 595.28, margin: 30 },
    THERMAL_80MM: { width: 226.77, height: 'auto', margin: 10 } // 80mm thermal printer
};

/**
 * Get page dimensions based on size
 */
const getPageSize = (size = 'A4') => {
    const config = PAPER_SIZES[size] || PAPER_SIZES.A4;
    if (config.height === 'auto') {
        // For thermal printers, height is determined by content
        return { width: config.width, margin: config.margin, autoSize: true };
    }
    return { width: config.width, height: config.height, margin: config.margin };
};

/**
 * Helper function to format currency
 */
const formatCurrency = (amount, symbol = 'Rs.') => {
    return `${symbol} ${parseFloat(amount).toFixed(2)}`;
};

/**
 * Helper function to format date
 */
const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Draw header with company logo and details
 */
const drawHeader = async (doc, settings, title, paperSize = 'A4') => {
    const pageConfig = getPageSize(paperSize);

    const margin = Number(pageConfig.margin || 40);
    const pageWidth = Number(doc.page.width || 595);
    const contentWidth = pageWidth - (margin * 2);

    /* =========================
       THERMAL PRINTER HEADER
    ========================== */
    if (paperSize === 'THERMAL_80MM') {
        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text(settings.shopName || '', margin, margin, {
                width: contentWidth,
                align: 'center'
            });

        let yPos = margin + 15;

        doc.fontSize(7).font('Helvetica');

        if (settings.shopAddress) {
            doc.text(settings.shopAddress, margin, yPos, {
                width: contentWidth,
                align: 'center'
            });
            yPos += 10;
        }

        if (settings.shopPhone) {
            doc.text(`Ph: ${settings.shopPhone}`, margin, yPos, {
                width: contentWidth,
                align: 'center'
            });
            yPos += 10;
        }

        doc.moveTo(margin, yPos + 5)
            .lineTo(pageWidth - margin, yPos + 5)
            .stroke();

        doc.fontSize(10)
            .font('Helvetica-Bold')
            .text(title, margin, yPos + 10, {
                width: contentWidth,
                align: 'center'
            });

        return yPos + 30;
    }

    /* =========================
       A4 / A5 HEADER
    ========================== */
    const fontSize = paperSize === 'A5' ? 14 : 20;
    const detailSize = paperSize === 'A5' ? 8 : 10;
    const logoSize =
        paperSize === 'A5' ? 50 :
            paperSize === 'A4' ? 70 :
                40; // fallback

    /* =========================
       LOGO (TOP RIGHT)
    ========================== */
    if (
        settings.shopLogo &&
        typeof settings.shopLogo === 'string' &&
        (settings.shopLogo.startsWith('http://') || settings.shopLogo.startsWith('https://'))
    ) {
        try {
            const response = await axios.get(settings.shopLogo, {
                responseType: 'arraybuffer'
            });

            const logoBuffer = Buffer.from(response.data);

            doc.image(
                logoBuffer,
                pageWidth - margin - logoSize,
                margin,
                {
                    fit: [logoSize, 80]
                }
            );
        } catch (error) {
            console.error('Logo load failed:', error.message);
        }
    }

    /* =========================
       SHOP DETAILS (LEFT)
    ========================== */
    doc.fontSize(fontSize)
        .font('Helvetica-Bold')
        .text(settings.shopName || '', margin, margin);

    doc.fontSize(detailSize).font('Helvetica');

    let yPos = margin + (paperSize === 'A5' ? 18 : 25);

    if (settings.shopAddress) {
        doc.text(settings.shopAddress, margin, yPos);
        yPos += paperSize === 'A5' ? 12 : 15;
    }

    if (settings.shopPhone) {
        doc.text(`Phone: ${settings.shopPhone}`, margin, yPos);
        yPos += paperSize === 'A5' ? 12 : 15;
    }

    if (settings.shopEmail) {
        doc.text(`Email: ${settings.shopEmail}`, margin, yPos);
        yPos += paperSize === 'A5' ? 12 : 15;
    }

    /* =========================
       ALIGN BELOW LOGO
    ========================== */
    const logoBottomY = margin + logoSize + 10;
    yPos = Math.max(yPos, logoBottomY);

    doc.moveTo(margin, yPos + 10)
        .lineTo(pageWidth - margin, yPos + 10)
        .stroke();

    const titleSize = paperSize === 'A5' ? 12 : 16;

    doc.fontSize(titleSize)
        .font('Helvetica-Bold')
        .text(title, margin, yPos + (paperSize === 'A5' ? 15 : 25));

    return yPos + (paperSize === 'A5' ? 40 : 55);
};


/**
 * Draw footer
 */
const drawFooter = async (doc, settings, yPos, paperSize = 'A4', barcodeValue = null) => {
    const margin = getPageSize(paperSize).margin;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - (margin * 2);
    const footerFontSize = paperSize === 'THERMAL_80MM' ? 7 : (paperSize === 'A5' ? 8 : 9);

    // Don't add footer if we're too close to the end (prevents empty pages)
    const pageHeight = doc.page.height;
    if (pageHeight !== Infinity && yPos > pageHeight - 120) {
        return; // Skip footer if no room
    }

    let footerY = yPos + 20;

    // Horizontal line (skip for thermal)
    if (paperSize !== 'THERMAL_80MM') {
        doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).stroke();
        footerY += 10;
    }

    // Add barcode if provided
    if (barcodeValue) {
        try {
            const barcodeBuffer = await generateBarcode(barcodeValue, {
                bcid: 'code39',
                scale: paperSize === 'THERMAL_80MM' ? 2 : 4,
                height: paperSize === 'THERMAL_80MM' ? 8 : 7,
                includetext: true
            });

            const barcodeWidth = paperSize === 'THERMAL_80MM' ? 150 : 200;
            const barcodeX = (pageWidth - barcodeWidth) / 2;

            doc.image(barcodeBuffer, barcodeX, footerY, {
                width: barcodeWidth,
                align: 'center'
            });

            footerY += paperSize === 'THERMAL_80MM' ? 40 : 50;
        } catch (error) {
            console.error('Failed to generate barcode:', error);
        }
    }

    // Footer text
    doc.fontSize(footerFontSize).font('Helvetica');

    if (settings.invoiceFooter) {
        doc.text(settings.invoiceFooter, margin, footerY, {
            width: contentWidth,
            align: 'center'
        });
        footerY += paperSize === 'THERMAL_80MM' ? 15 : 25;
    }

    doc.text('Thank you for your business!', margin, footerY, {
        width: contentWidth,
        align: 'center'
    });
};

/**
 * Draw table header
 */
const drawTableHeader = (doc, headers, yPos, columnWidths) => {
    doc.fontSize(9).font('Helvetica-Bold');

    let xPos = 50;
    headers.forEach((header, index) => {
        doc.text(header, xPos, yPos, {
            width: columnWidths[index],
            align: index === 0 ? 'left' : 'right'
        });
        xPos += columnWidths[index];
    });

    // Calculate total width for underline
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    doc.moveTo(50, yPos + 15).lineTo(50 + totalWidth, yPos + 15).stroke();

    return yPos + 25;
};

/**
 * Draw table row
 */
const drawTableRow = (doc, cells, yPos, columnWidths, font = 'Helvetica') => {
    doc.fontSize(8).font(font);

    let xPos = 50;
    cells.forEach((cell, index) => {
        const text = cell !== null && cell !== undefined ? String(cell) : '-';
        doc.text(text, xPos, yPos, {
            width: columnWidths[index],
            align: index === 0 ? 'left' : 'right'
        });
        xPos += columnWidths[index];
    });

    return yPos + 18;
};

/**
 * Generate Purchase Order PDF
 */
const generatePurchaseOrder = async (poData) => {
    return new Promise(async (resolve, reject) => {
        try {
            const settings = await SystemSettings.findOne();

            if (!settings) {
                throw new Error('System settings not found');
            }

            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Draw Header
            let yPos = await drawHeader(doc, settings, 'PURCHASE ORDER');

            const startYPos = yPos;

            // Supplier Details (Left Side)
            doc.fontSize(11).font('Helvetica-Bold').text('Supplier:', 50, yPos);
            yPos += 20;
            doc.fontSize(10).font('Helvetica');
            doc.text(poData.supplier.name, 50, yPos);
            yPos += 15;
            if (poData.supplier.address) {
                doc.text(poData.supplier.address, 50, yPos);
                yPos += 15;
            }
            if (poData.supplier.phone) {
                doc.text(`Phone: ${poData.supplier.phone}`, 50, yPos);
                yPos += 15;
            }
            if (poData.supplier.email) {
                doc.text(`Email: ${poData.supplier.email}`, 50, yPos);
                yPos += 15;
            }

            // PO Details (Right Side - aligned)
            let poDetailYPos = startYPos;
            doc.fontSize(10).font('Helvetica');
            doc.text('PO Number:', 350, poDetailYPos);
            doc.text(poData.poNumber, 450, poDetailYPos, { width: 100, align: 'right' });
            poDetailYPos += 15;

            doc.text('Date:', 350, poDetailYPos);
            doc.text(formatDate(poData.poDate), 450, poDetailYPos, { width: 100, align: 'right' });
            poDetailYPos += 15;

            doc.text('Expected Delivery:', 350, poDetailYPos);
            doc.text(formatDate(poData.expectedDeliveryDate), 450, poDetailYPos, { width: 100, align: 'right' });
            poDetailYPos += 15;

            doc.text('Status:', 350, poDetailYPos);
            doc.text(poData.status.toUpperCase(), 450, poDetailYPos, { width: 100, align: 'right' });

            // Use the greater of the two yPos values
            yPos = Math.max(yPos, poDetailYPos + 10);

            yPos += 20;

            // Items Table
            const headers = ['Product', 'Quantity'];
            const columnWidths = [370, 125];

            yPos = drawTableHeader(doc, headers, yPos, columnWidths);

            let total = 0;
            let totalQuantity = 0;

            poData.items.forEach(item => {
                const quantity = parseFloat(item.quantityOrdered) || 0;
                const unitPrice = parseFloat(item.unitPrice) || 0;
                const itemTotal = quantity * unitPrice;
                total += itemTotal;
                totalQuantity += quantity;

                yPos = drawTableRow(doc, [
                    item.product?.name || 'Product',
                    quantity.toFixed(3),
                ], yPos, columnWidths);

                if (yPos > 700) {
                    doc.addPage();
                    yPos = 50;
                }
            });

            // Total
            yPos += 10;
            doc.moveTo(420, yPos).lineTo(545, yPos).stroke();
            yPos += 15;

            doc.fontSize(11).font('Helvetica-Bold');
            doc.text('Total Quantity:', 370, yPos);
            doc.text(totalQuantity.toFixed(3), 420, yPos, { width: 125, align: 'right' });

            if (poData.notes) {
                yPos += 35;
                doc.fontSize(9).font('Helvetica');
                doc.text(`Notes: ${poData.notes}`, 50, yPos, { width: 500 });
            }

            // Footer with barcode
            await drawFooter(doc, settings, yPos + 40, 'A4', poData.poNumber);

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Generate GRN (Goods Received Note) PDF
 * @param {Object} grnData - GRN data including items, supplier, etc.
 * @param {Object} paymentData - Payment details (optional for backward compatibility)
 */
const generateGRN = async (grnData, paymentData = null) => {
    return new Promise(async (resolve, reject) => {
        try {
            const settings = await SystemSettings.findOne();
            if (!settings) throw new Error('System settings not found');

            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            /* ================= HEADER ================= */
            let yPos = await drawHeader(doc, settings, 'GOODS RECEIVED NOTE');
            const startYPos = yPos;

            /* ================= SUPPLIER (LEFT) ================= */
            doc.fontSize(11).font('Helvetica-Bold').text('Supplier:', 50, yPos);
            yPos += 18;
            doc.fontSize(10).font('Helvetica');
            doc.text(grnData.supplier?.name || '-', 50, yPos);
            yPos += 14;
            if (grnData.supplier?.address) {
                doc.text(`Address: ${grnData.supplier.address}`, 50, yPos);
                yPos += 14;
            }
            if (grnData.supplier?.phone) {
                doc.text(`Phone: ${grnData.supplier.phone}`, 50, yPos);
                yPos += 14;
            }
            if (grnData.supplier?.email) {
                doc.text(`Email: ${grnData.supplier.email}`, 50, yPos);
                yPos += 14;
            }

            /* ================= GRN DETAILS (RIGHT) ================= */
            let rightY = startYPos;
            doc.fontSize(10).font('Helvetica');
            doc.text('GRN Number:', 350, rightY);
            doc.text(grnData.grnNumber || '-', 450, rightY, { width: 100, align: 'right' });
            rightY += 14;
            doc.text('GRN Date:', 350, rightY);
            doc.text(formatDate(grnData.grnDate || grnData.createdAt), 450, rightY, { width: 100, align: 'right' });
            rightY += 14;
            doc.text('Invoice Number:', 350, rightY);
            doc.text(grnData.invoiceNumber || '-', 450, rightY, { width: 100, align: 'right' });
            rightY += 14;
            doc.text('Invoice Date:', 350, rightY);
            doc.text(formatDate(grnData.invoiceDate), 450, rightY, { width: 100, align: 'right' });
            rightY += 14;
            doc.text('PO Number:', 350, rightY);
            doc.text(grnData.purchaseOrder?.poNumber || '-', 450, rightY, { width: 100, align: 'right' });
            rightY += 14;
            doc.text('Status:', 350, rightY);
            doc.text((grnData.status || 'draft').toUpperCase(), 450, rightY, { width: 100, align: 'right' });

            yPos = Math.max(yPos, rightY) + 25;

            /* ================= ITEMS TABLE ================= */
            const headers = ['Product', 'Batch', 'Qty', 'Unit Cost', 'S. Price', 'MRP', 'Total'];
            const columnWidths = [120, 65, 40, 60, 60, 60, 65];
            yPos = drawTableHeader(doc, headers, yPos, columnWidths);

            let totalValue = 0;
            for (const item of grnData.items || []) {
                const quantity = Number(item.quantityAccepted || item.quantityReceived || item.receivedQty || 0);
                const unitCost = Number(item.unitCost || 0);
                const sellingPrice = Number(item.sellingPrice || 0);
                const mrp = Number(item.mrp || 0);
                const itemTotal = quantity * unitCost;
                totalValue += itemTotal;

                yPos = drawTableRow(doc, [
                    item.product?.name || item.productName || 'Product',
                    item.batchNumber || '-',
                    quantity.toFixed(2),
                    formatCurrency(unitCost, settings.currencySymbol),
                    formatCurrency(sellingPrice, settings.currencySymbol),
                    formatCurrency(mrp, settings.currencySymbol),
                    formatCurrency(itemTotal, settings.currencySymbol)
                ], yPos, columnWidths);

                if (yPos > 720) { doc.addPage(); yPos = 50; }
            }

            /* ================= TOTAL ================= */
            yPos += 10;
            doc.moveTo(50, yPos).lineTo(520, yPos).stroke();
            yPos += 15;
            doc.fontSize(11).font('Helvetica-Bold');

            // Use grnData.totalAmount if available, otherwise use calculated total
            const finalTotal = Number(grnData.totalAmount || totalValue);

            doc.text('Total Quantity:', 50, yPos);
            doc.text((Number(grnData.totalQuantity || 0)).toFixed(2), 420, yPos, { width: 100, align: 'right' });
            yPos += 18;

            doc.text('Total Amount:', 50, yPos);
            doc.text(formatCurrency(finalTotal, settings.currencySymbol), 420, yPos, { width: 100, align: 'right' });
            yPos += 25;

            /* ================= NOTES ================= */
            if (grnData.inspectionNotes) {
                yPos += 30;
                doc.fontSize(9).font('Helvetica');
                doc.text(`Inspection Notes: ${grnData.inspectionNotes}`, 50, yPos, { width: 500 });
            }

            /* ================= CREATED BY ================= */
            yPos += 25;
            doc.fontSize(9).font('Helvetica');
            if (grnData.createdByUser?.userName || grnData.createdBy) {
                const createdBy = grnData.createdByUser?.userName || `User ID: ${grnData.createdBy}`;
                doc.text(`Created By: ${createdBy}`, 50, yPos);
                yPos += 14;
            }
            if (grnData.createdAt) {
                doc.text(`Created At: ${formatDate(grnData.createdAt)} ${new Date(grnData.createdAt).toLocaleTimeString('en-GB')}`, 50, yPos);
            }

            /* ================= SIGNATURES ================= */
            yPos += 50;
            doc.fontSize(10).font('Helvetica');
            doc.text('_________________________', 50, yPos);
            doc.text('_________________________', 380, yPos);
            yPos += 18;
            doc.text('Received By', 50, yPos);
            doc.text('Authorized Signature', 380, yPos);

            /* ================= FOOTER ================= */
            await drawFooter(doc, settings, yPos + 40, 'A4', grnData.grnNumber);

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
};



/**
 * Generate Sales Receipt PDF - Professional Real-World Format
 */
const generateSalesReceipt = async (saleData, paperSize = 'A4') => {
    return new Promise(async (resolve, reject) => {
        try {
            const settings = await SystemSettings.findOne();

            if (!settings) {
                throw new Error('System settings not found');
            }

            const pageConfig = getPageSize(paperSize);
            const docOptions = pageConfig.autoSize
                ? { margin: pageConfig.margin, size: [pageConfig.width, 2000] }
                : { margin: pageConfig.margin, size: [pageConfig.width, pageConfig.height] };

            const doc = new PDFDocument(docOptions);
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const margin = pageConfig.margin;
            const pageWidth = doc.page.width;
            const contentWidth = pageWidth - (margin * 2);

            // ==================== HEADER ====================
            let yPos = await drawHeader(doc, settings, 'SALES RECEIPT', paperSize);

            const isThermal = paperSize === 'THERMAL_80MM';
            const isA5 = paperSize === 'A5';
            const fontSize = isThermal ? 7 : (isA5 ? 9 : 10);
            const lineSpacing = isThermal ? 12 : (isA5 ? 14 : 16);

            yPos += 5;

            // ==================== RECEIPT INFO ====================
            doc.fontSize(fontSize).font('Helvetica-Bold');

            if (isThermal) {
                // Thermal: Simple format
                doc.text(`Receipt #: ${saleData.saleNumber}`, margin, yPos, { width: contentWidth, align: 'center' });
                yPos += lineSpacing;
                doc.font('Helvetica');
                doc.text(formatDate(saleData.saleDate), margin, yPos, { width: contentWidth, align: 'center' });
                yPos += lineSpacing;

                // Served by
                if (saleData.user?.name || saleData.createdBy?.name) {
                    doc.text(`Served by: ${saleData.user?.name || saleData.createdBy?.name}`, margin, yPos, { width: contentWidth, align: 'center' });
                    yPos += lineSpacing;
                }
            } else {
                // A4/A5: Two column layout
                const leftCol = margin;
                const rightCol = pageWidth - margin - 150;

                // Left: Customer info
                doc.text('BILL TO:', leftCol, yPos);
                yPos += lineSpacing;
                doc.font('Helvetica');

                if (saleData.customer && saleData.customer.customerName) {
                    doc.text(saleData.customer.customerName, leftCol, yPos);
                    yPos += lineSpacing - 2;

                    if (saleData.customer.phone) {
                        doc.fontSize(fontSize - 1);
                        doc.text(`Tel: ${saleData.customer.phone}`, leftCol, yPos);
                        yPos += lineSpacing - 2;
                    }

                    if (saleData.customer.email) {
                        doc.fontSize(fontSize - 1);
                        doc.text(`Email: ${saleData.customer.email}`, leftCol, yPos);
                        yPos += lineSpacing - 2;
                    }
                } else {
                    doc.text('Walk-in Customer', leftCol, yPos);
                    yPos += lineSpacing - 2;
                }

                // Right: Receipt details
                let rightYPos = yPos - (lineSpacing * 4);
                doc.fontSize(fontSize).font('Helvetica');

                const labelCol = rightCol;
                const valueCol = rightCol + 75;

                doc.text('Receipt No:', labelCol, rightYPos, { continued: true });
                doc.font('Helvetica-Bold').text(` ${saleData.saleNumber}`);
                rightYPos += lineSpacing;

                doc.font('Helvetica').text('Date:', labelCol, rightYPos, { continued: true });
                doc.font('Helvetica-Bold').text(` ${formatDate(saleData.saleDate)}`);
                rightYPos += lineSpacing;

                doc.font('Helvetica').text('Time:', labelCol, rightYPos, { continued: true });
                doc.font('Helvetica-Bold').text(
                    ` ${new Date(saleData.saleDate || Date.now()).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}`
                );
                rightYPos += lineSpacing;

                // Cashier/User
                if (saleData.user?.name || saleData.createdBy?.name) {
                    doc.font('Helvetica').text('Cashier:', labelCol, rightYPos, { continued: true });
                    doc.font('Helvetica-Bold').text(` ${saleData.user?.name || saleData.createdBy?.name}`);
                    rightYPos += lineSpacing;
                }

                yPos = Math.max(yPos, rightYPos) + 10;
            }

            // Separator line
            yPos += 5;
            doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke();
            yPos += isThermal ? 8 : 12;

            // ==================== ITEMS TABLE ====================
            if (isThermal) {
                // Thermal: Compact single-line items
                doc.fontSize(7).font('Helvetica-Bold');
                doc.text('ITEMS', margin, yPos, { width: contentWidth });
                yPos += lineSpacing;
                doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke();
                yPos += 8;

                doc.font('Helvetica');

                saleData.items.forEach((item, index) => {
                    const qty = parseFloat(item.quantity || 0);
                    const price = parseFloat(item.unitPrice || 0);
                    const itemSubtotal = qty * price; // Calculate before discount
                    const discAmt = parseFloat(item.discountAmount || 0);
                    const itemTotal = itemSubtotal - discAmt; // After discount

                    // Item name
                    doc.fontSize(7.5).font('Helvetica-Bold');
                    const itemName = item.productName || item.product?.name || 'Item';
                    doc.text(`${index + 1}. ${itemName}`, margin, yPos, { width: contentWidth });
                    yPos += 11;

                    // Quantity x Price = Subtotal
                    doc.fontSize(7).font('Helvetica');
                    const qtyStr = qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2);

                    // Add Tax info if exists
                    let taxInfo = '';
                    if (item.taxPercentage > 0) {
                        taxInfo = ` (Tax ${parseFloat(item.taxPercentage)}%)`;
                    }

                    const qtyLine = `   ${qtyStr} x ${formatCurrency(price, settings.currencySymbol)}${taxInfo}`;
                    doc.text(qtyLine, margin, yPos, { width: contentWidth - 60 });

                    doc.text(formatCurrency(itemSubtotal, settings.currencySymbol), margin, yPos, { width: contentWidth, align: 'right' });
                    yPos += 11;

                    // Item discount (if any)
                    if (discAmt > 0) {
                        doc.fontSize(6.5);
                        const discPerc = item.discountPercentage || 0;
                        const discText = discPerc > 0
                            ? `   Discount (${parseFloat(discPerc).toFixed(1)}%): -${formatCurrency(discAmt, settings.currencySymbol)}`
                            : `   Discount: -${formatCurrency(discAmt, settings.currencySymbol)}`;
                        doc.text(discText, margin, yPos, { width: contentWidth });
                        yPos += 10;
                    }

                    yPos += 2;
                });
            } else {
                // A4/A5: Professional table format
                doc.fontSize(fontSize).font('Helvetica-Bold');

                const colNo = margin;
                const colItem = margin + 25;
                const colQty = pageWidth - margin - 325;
                const colPrice = pageWidth - margin - 265;
                const colDisc = pageWidth - margin - 195;
                const colTax = pageWidth - margin - 130; // Dedicated Tax column
                const colAmount = pageWidth - margin - 75;

                // Table headers
                doc.text('#', colNo, yPos, { width: 20, align: 'center' });
                doc.text('ITEM DESCRIPTION', colItem, yPos);
                doc.text('QTY', colQty, yPos, { width: 45, align: 'right' });
                doc.text('PRICE', colPrice, yPos, { width: 60, align: 'right' });
                doc.text('DISC', colDisc, yPos, { width: 60, align: 'right' });
                doc.text(saleData.taxName || 'TAX', colTax, yPos, { width: 50, align: 'right' });
                doc.text('AMOUNT', colAmount, yPos, { width: 75, align: 'right' });
                yPos += lineSpacing;

                doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke();
                yPos += 8;

                // Items
                doc.font('Helvetica');

                saleData.items.forEach((item, index) => {
                    const qty = parseFloat(item.quantity || 0);
                    const price = parseFloat(item.unitPrice || 0);
                    const discAmt = parseFloat(item.discountAmount || 0);
                    const taxAmt = parseFloat(item.taxAmount || 0);
                    const itemSubtotal = qty * price; // Before discount
                    const itemTotal = itemSubtotal - discAmt + taxAmt; // After discount and with tax = AMOUNT column

                    // Row number
                    doc.text((index + 1).toString(), colNo, yPos, { width: 20, align: 'center' });

                    // Item name
                    const itemName = item.productName || item.product?.name || 'Item';
                    doc.text(itemName, colItem, yPos, { width: colQty - colItem - 10, ellipsis: true });

                    // Quantity
                    const qtyStr = qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2);
                    doc.text(qtyStr, colQty, yPos, { width: 45, align: 'right' });

                    // Unit Price
                    doc.text(formatCurrency(price, settings.currencySymbol), colPrice, yPos, { width: 60, align: 'right' });

                    // Discount
                    if (discAmt > 0) {
                        doc.text(`-${formatCurrency(discAmt, settings.currencySymbol)}`, colDisc, yPos, { width: 60, align: 'right' });
                    } else {
                        doc.text('-', colDisc, yPos, { width: 60, align: 'right' });
                    }

                    // TAX
                    const taxPercent = parseFloat(item.taxPercentage || 0);
                    if (taxPercent > 0) {
                        doc.text(`${taxPercent}%`, colTax, yPos, { width: 50, align: 'right' });
                    } else {
                        doc.text('-', colTax, yPos, { width: 50, align: 'right' });
                    }

                    // AMOUNT (after discount)
                    if (itemTotal <= 0 && price === 0) {
                        doc.font('Helvetica-Bold');
                        doc.text('** FREE **', colAmount, yPos, { width: 75, align: 'right' });
                        doc.font('Helvetica');
                    } else {
                        doc.text(formatCurrency(itemTotal, settings.currencySymbol), colAmount, yPos, { width: 75, align: 'right' });
                    }

                    yPos += lineSpacing;
                });
            }

            // Separator before totals
            yPos += 5;
            doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke();
            yPos += isThermal ? 10 : 15;

            // ==================== RETURNS SECTION ====================
            // Only show if there are return items
            if (saleData.returnItems && saleData.returnItems.length > 0) {
                yPos += 10;

                // RETURNS header
                doc.fontSize(fontSize + 2).font('Helvetica-Bold');
                doc.fillColor('#DC143C');
                if (isThermal) {
                    doc.text('RETURNS', margin, yPos, { width: contentWidth, align: 'center' });
                } else {
                    doc.text('RETURNS', margin, yPos);
                }
                doc.fillColor('#000000');
                yPos += lineSpacing + 5;

                // Return items table
                if (isThermal) {
                    // Thermal: Compact format
                    doc.fontSize(7).font('Helvetica');

                    saleData.returnItems.forEach((item, index) => {
                        const qty = parseFloat(item.quantity || 0);
                        const rate = parseFloat(item.unitPrice || 0);
                        const taxAmt = parseFloat(item.taxAmount || 0);
                        const amount = (qty * rate) + taxAmt;

                        // Item name
                        doc.fontSize(7.5).font('Helvetica-Bold');
                        const itemName = item.productName || item.product?.name || 'Item';
                        doc.text(`${index + 1}. ${itemName}`, margin, yPos, { width: contentWidth });
                        yPos += 11;

                        // Quantity x Rate = Amount
                        doc.fontSize(7).font('Helvetica');
                        const qtyStr = qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2);
                        const itemLine = `   ${qtyStr} x ${formatCurrency(rate, settings.currencySymbol)} = ${formatCurrency(amount, settings.currencySymbol)}`;
                        doc.text(itemLine, margin, yPos, { width: contentWidth });
                        yPos += 11;

                        yPos += 2;
                    });
                } else {
                    // A4/A5: Table format
                    doc.fontSize(fontSize).font('Helvetica-Bold');

                    const colNo = margin;
                    const colItem = margin + 25;
                    const colQty = pageWidth - margin - 210;
                    const colRate = pageWidth - margin - 135;
                    const colAmount = pageWidth - margin - 75;

                    // Table headers
                    doc.text('#', colNo, yPos, { width: 20, align: 'center' });
                    doc.text('ITEM', colItem, yPos);
                    doc.text('QTY', colQty, yPos, { width: 50, align: 'right' });
                    doc.text('RATE', colRate, yPos, { width: 60, align: 'right' });
                    doc.text('AMOUNT', colAmount, yPos, { width: 75, align: 'right' });
                    yPos += lineSpacing;

                    doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke();
                    yPos += 8;

                    // Return items
                    doc.font('Helvetica');

                    saleData.returnItems.forEach((item, index) => {
                        const qty = parseFloat(item.quantity || 0);
                        const rate = parseFloat(item.unitPrice || 0);
                        const amount = qty * rate;

                        // Row number
                        doc.text((index + 1).toString(), colNo, yPos, { width: 20, align: 'center' });

                        // Item name
                        const itemName = item.productName || item.product?.name || 'Item';
                        doc.text(itemName, colItem, yPos, { width: colQty - colItem - 10, ellipsis: true });

                        // Quantity
                        const qtyStr = qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2);
                        doc.text(qtyStr, colQty, yPos, { width: 50, align: 'right' });

                        // Rate
                        doc.text(formatCurrency(rate, settings.currencySymbol), colRate, yPos, { width: 60, align: 'right' });

                        // Amount
                        doc.text(formatCurrency(amount, settings.currencySymbol), colAmount, yPos, { width: 75, align: 'right' });

                        yPos += lineSpacing;
                    });
                }

                // Return summary
                yPos += 5;
                doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke();
                yPos += isThermal ? 8 : 10;

                const returnLabelX = isThermal ? margin : pageWidth - margin - 200;
                const returnValueX = isThermal ? margin + 80 : pageWidth - margin - 85;
                const returnValueWidth = isThermal ? contentWidth - 80 : 85;

                doc.fontSize(fontSize).font('Helvetica');

                // Gross Return Value
                const returnSubtotal = parseFloat(saleData.returnSubtotal || 0);
                doc.text('Gross Return Value:', returnLabelX, yPos);
                doc.text(formatCurrency(returnSubtotal, settings.currencySymbol), returnValueX, yPos, {
                    width: returnValueWidth,
                    align: 'right'
                });
                yPos += lineSpacing;

                // Return Discount (if any)
                const returnDiscount = parseFloat(saleData.returnDiscountAmount || 0);
                if (returnDiscount > 0) {
                    doc.text('Discount:', returnLabelX, yPos);
                    doc.text(`-${formatCurrency(returnDiscount, settings.currencySymbol)}`, returnValueX, yPos, {
                        width: returnValueWidth,
                        align: 'right'
                    });
                    yPos += lineSpacing;
                }

                // Net Return Value
                const returnTotal = parseFloat(saleData.returnTotalAmount || 0);
                doc.font('Helvetica-Bold');
                doc.text('Net Return Value:', returnLabelX, yPos);
                doc.text(formatCurrency(returnTotal, settings.currencySymbol), returnValueX, yPos, {
                    width: returnValueWidth,
                    align: 'right'
                });
                yPos += lineSpacing + 5;

                doc.font('Helvetica');
                yPos += 10;
            }

            // ==================== SUMMARY SECTION ====================
            const labelX = isThermal ? margin : pageWidth - margin - 200;
            const valueX = isThermal ? margin + 80 : pageWidth - margin - 85;
            const valueWidth = isThermal ? contentWidth - 80 : 85;

            doc.fontSize(fontSize).font('Helvetica');

            // Subtotal (sum of all items BEFORE discount and tax)
            const subtotalAmount = saleData.items.reduce((sum, item) => {
                const itemQty = parseFloat(item.quantity || 0);
                const itemPrice = parseFloat(item.unitPrice || 0);
                return sum + (itemQty * itemPrice);
            }, 0);

            doc.text('Subtotal:', labelX, yPos);
            doc.text(formatCurrency(subtotalAmount, settings.currencySymbol), valueX, yPos, {
                width: valueWidth,
                align: 'right'
            });
            yPos += lineSpacing;

            // Calculate discounts
            const totalItemDiscounts = saleData.items.reduce((sum, item) =>
                sum + parseFloat(item.discountAmount || 0), 0
            );
            const saleDiscount = parseFloat(saleData.discountAmount || 0); // This is usually the promotion/bill level discount
            const totalDiscounts = totalItemDiscounts + saleDiscount;

            // 1. Item Level Discounts (if any)
            if (totalItemDiscounts > 0) {
                doc.text('Item Discounts:', labelX, yPos);
                doc.text(`-${formatCurrency(totalItemDiscounts, settings.currencySymbol)}`, valueX, yPos, {
                    width: valueWidth,
                    align: 'right'
                });
                yPos += lineSpacing;
            }

            // 2. Promotion / Bill Level Discount (if any)
            // 2. Promotion / Bill Level Discount (if any)
            // 2. Promotion / Bill Level Discount (if any)
            // If multiple promotions are recorded
            if (saleData.appliedPromotions && saleData.appliedPromotions.length > 0) {
                // Iterate and show each
                saleData.appliedPromotions.forEach(promo => {
                    // We need to link the specific discount amount from the join table to the promo logic
                    // Since saleData might be structured differently depending on the query, we try to access the join table field
                    let amount = 0;
                    if (promo.SalePromotion) {
                        amount = parseFloat(promo.SalePromotion.discountAmount);
                    } else {
                        // Fallback or estimated
                        amount = saleDiscount / saleData.appliedPromotions.length;
                    }

                    const label = `Promo (${promo.couponCode || promo.title}):`;
                    doc.text(label, labelX, yPos);
                    doc.text(`-${formatCurrency(amount, settings.currencySymbol)}`, valueX, yPos, {
                        width: valueWidth,
                        align: 'right'
                    });
                    yPos += lineSpacing;
                });
            } else if (saleDiscount > 0) {
                // Fallback to single line logic
                let discountLabel = 'Promotion Discount:';

                // Priority: 1) Promotion Title, 2) Promo Code, 3) Percentage
                if (saleData.promotion && saleData.promotion.title) {
                    discountLabel = `Promo: ${saleData.promotion.title}`;
                    // Append percentage if meaningful
                    if (saleData.discountPercentage > 0) {
                        discountLabel += ` (${parseFloat(saleData.discountPercentage).toFixed(0)}%)`;
                    }
                } else if (saleData.promoCode) {
                    discountLabel = `Promo (${saleData.promoCode}):`;
                } else if (saleData.discountPercentage > 0) {
                    discountLabel = `Promotion (${parseFloat(saleData.discountPercentage).toFixed(1)}%):`;
                }

                doc.text(discountLabel, labelX, yPos);
                doc.text(`-${formatCurrency(saleDiscount, settings.currencySymbol)}`, valueX, yPos, {
                    width: valueWidth,
                    align: 'right'
                });
                yPos += lineSpacing;
            }

            // Overall Discount (if any) - REMOVED to avoid duplication
            if (false && saleData.discountAmount && parseFloat(saleData.discountAmount) > 0) {
                let discountLabel = 'Discount:';
                if (saleData.discountPercentage > 0) {
                    discountLabel = `Discount (${parseFloat(saleData.discountPercentage).toFixed(1)}%):`;
                }
                doc.text(discountLabel, labelX, yPos);
                doc.text(`-${formatCurrency(saleData.discountAmount, settings.currencySymbol)}`, valueX, yPos, {
                    width: valueWidth,
                    align: 'right'
                });
                yPos += lineSpacing;
            }

            // Tax (if any)
            if (saleData.taxAmount && parseFloat(saleData.taxAmount) > 0) {
                // Use taxName from sale data (e.g., VAT, GST) or default to "Tax"
                const taxName = saleData.taxName || settings.taxName || 'Tax';
                let taxLabel = `${taxName}:`;

                // Add percentage if available
                if (saleData.taxPercentage > 0) {
                    taxLabel = `${taxName} (${parseFloat(saleData.taxPercentage).toFixed(1)}%):`;
                }

                doc.text(taxLabel, labelX, yPos);
                doc.text(formatCurrency(saleData.taxAmount, settings.currencySymbol), valueX, yPos, {
                    width: valueWidth,
                    align: 'right'
                });
                yPos += lineSpacing;
            }

            // Loyalty Points Redeemed (if any)
            if (settings.enableLoyalty && saleData.loyaltyPointsRedeemed && parseFloat(saleData.loyaltyPointsRedeemed) > 0) {
                const loyaltyValue = parseFloat(saleData.loyaltyPointsValue || 0);
                doc.text(`Loyalty Discount (${saleData.loyaltyPointsRedeemed} pts):`, labelX, yPos);
                doc.text(`-${formatCurrency(loyaltyValue, settings.currencySymbol)}`, valueX, yPos, {
                    width: valueWidth,
                    align: 'right'
                });
                yPos += lineSpacing;
            }

            // Grand Total Line
            yPos += 5;
            doc.moveTo(labelX, yPos).lineTo(pageWidth - margin, yPos).stroke();
            yPos += isThermal ? 8 : 10;

            // GRAND TOTAL
            doc.fontSize(fontSize + 3).font('Helvetica-Bold');
            doc.text('TOTAL:', labelX, yPos);
            doc.text(
                formatCurrency(saleData.totalAmount, settings.currencySymbol),
                valueX,
                yPos,
                { width: valueWidth, align: 'right' }
            );
            yPos += lineSpacing + 5;

            // NET PAYABLE (if there are returns)
            if (saleData.returnItems && saleData.returnItems.length > 0) {
                const netPayable = parseFloat(saleData.netPayable || saleData.totalAmount);

                doc.fontSize(fontSize).font('Helvetica');
                doc.text('Less: Returns', labelX, yPos);
                doc.text(
                    `-${formatCurrency(saleData.returnTotalAmount || 0, settings.currencySymbol)}`,
                    valueX,
                    yPos,
                    { width: valueWidth, align: 'right' }
                );
                yPos += lineSpacing;

                // Separator
                doc.moveTo(labelX, yPos).lineTo(pageWidth - margin, yPos).stroke();
                yPos += isThermal ? 8 : 10;

                // Net Payable
                doc.fontSize(fontSize + 3).font('Helvetica-Bold');
                doc.fillColor('#228B22');
                doc.text('NET PAYABLE:', labelX, yPos);
                doc.text(
                    formatCurrency(netPayable, settings.currencySymbol),
                    valueX,
                    yPos,
                    { width: valueWidth, align: 'right' }
                );
                doc.fillColor('#000000');
                yPos += lineSpacing + 5;
            }

            yPos += 5;

            // ==================== PAYMENT SECTION ====================
            doc.fontSize(fontSize).font('Helvetica-Bold');
            doc.text('PAYMENT', labelX, yPos);
            yPos += lineSpacing;

            // Horizontal line under payment header (thermal only)
            if (isThermal) {
                doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke();
                yPos += 8;
            }

            doc.font('Helvetica');

            // Amount Paid
            const paidAmount = parseFloat(saleData.paidAmount || 0);
            const totalAmount = parseFloat(saleData.totalAmount || 0);
            const balanceDue = parseFloat(saleData.creditAmount || 0);
            const changeAmount = parseFloat(saleData.changeAmount || 0);

            doc.text('Paid:', labelX, yPos);
            doc.text(formatCurrency(paidAmount, settings.currencySymbol), valueX, yPos, {
                width: valueWidth,
                align: 'right'
            });
            yPos += lineSpacing;

            // Show either Change OR Balance Due
            if (changeAmount > 0) {
                // Customer paid more - show change
                doc.text('Change:', labelX, yPos);
                doc.text(formatCurrency(changeAmount, settings.currencySymbol), valueX, yPos, {
                    width: valueWidth,
                    align: 'right'
                });
                yPos += lineSpacing;
            } else if (balanceDue > 0) {
                // Customer paid less - show balance due
                doc.font('Helvetica-Bold');
                doc.fillColor('#DC143C');
                doc.text('Balance Due:', labelX, yPos);
                doc.text(formatCurrency(balanceDue, settings.currencySymbol), valueX, yPos, {
                    width: valueWidth,
                    align: 'right'
                });
                doc.fillColor('#000000');
                doc.font('Helvetica');
                yPos += lineSpacing;
            }

            yPos += 5;

            // Payment Status Badge
            doc.fontSize(fontSize).font('Helvetica-Bold');
            let statusText = '';
            let statusColor = '#000000';

            if (saleData.paymentStatus === 'paid') {
                statusText = 'PAID IN FULL';
                statusColor = '#008000';
            } else if (saleData.paymentStatus === 'partial') {
                statusText = 'PARTIAL PAYMENT';
                statusColor = '#FF8C00';
            } else if (saleData.paymentStatus === 'pending') {
                statusText = 'PAYMENT PENDING';
                statusColor = '#DC143C';
            } else {
                statusText = saleData.paymentStatus?.toUpperCase() || 'UNKNOWN';
                statusColor = '#666666';
            }

            doc.fillColor(statusColor);
            if (isThermal) {
                doc.text(statusText, margin, yPos, { width: contentWidth, align: 'center' });
            } else {
                doc.text(statusText, labelX, yPos);
            }
            doc.fillColor('#000000');
            yPos += lineSpacing + 5;

            // ==================== LOYALTY & EXTRAS ====================
            // Loyalty Points Earned (Only if enabled in settings)
            if (settings.enableLoyalty && saleData.loyaltyPointsEarned && parseFloat(saleData.loyaltyPointsEarned) > 0) {
                yPos += 8;
                doc.fontSize(fontSize).font('Helvetica-Bold');
                doc.fillColor('#228B22');
                const loyaltyText = `★ You earned ${saleData.loyaltyPointsEarned} loyalty points!`;
                if (isThermal) {
                    doc.text(loyaltyText, margin, yPos, { width: contentWidth, align: 'center' });
                } else {
                    doc.text(loyaltyText, labelX, yPos);
                }
                doc.fillColor('#000000');
                yPos += lineSpacing;
            }

            // Notes (if any)
            if (saleData.notes || saleData.customerNotes) {
                yPos += 10;
                doc.fontSize(fontSize - 1).font('Helvetica-Oblique');
                doc.fillColor('#555555');

                if (saleData.notes) {
                    doc.text(`Note: ${saleData.notes}`, margin, yPos, { width: contentWidth });
                    yPos += lineSpacing;
                }

                if (saleData.customerNotes) {
                    doc.text(`Remarks: ${saleData.customerNotes}`, margin, yPos, { width: contentWidth });
                    yPos += lineSpacing;
                }

                doc.fillColor('#000000');
            }

            // Terms & Conditions (optional, from settings)
            if (settings.receiptTerms && !isThermal) {
                yPos += 10;
                doc.fontSize(7).font('Helvetica');
                doc.fillColor('#666666');
                doc.text(settings.receiptTerms, margin, yPos, {
                    width: contentWidth,
                    align: 'center'
                });
                doc.fillColor('#000000');
                yPos += 15;
            }

            // Auto-trim thermal paper height
            if (pageConfig.autoSize) {
                doc.page.height = yPos + 180;
            }

            // ==================== FOOTER ====================
            await drawFooter(doc, settings, yPos, paperSize, saleData.saleNumber);

            doc.end();

        } catch (error) {
            console.error('PDF Generation Error:', error);
            reject(error);
        }
    });
};

module.exports = {
    generatePurchaseOrder,
    generateGRN,
    generateSalesReceipt
};
