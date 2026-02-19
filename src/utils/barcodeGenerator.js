const bwipjs = require('bwip-js');

/**
 * Generate barcode image as PNG buffer
 * @param {string} barcodeValue - The value to encode in barcode
 * @param {Object} options - Barcode generation options
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateBarcode(barcodeValue, options = {}) {
    try {
        const defaultOptions = {
            bcid: 'code128',       // Barcode type (code128, ean13, upca, qrcode, etc.)
            text: barcodeValue,    // Text to encode
            scale: 3,              // 3x scaling factor
            height: 10,            // Bar height, in millimeters
            includetext: true,     // Show human-readable text
            textxalign: 'center',  // Always good to set this
        };

        const barcodeOptions = { ...defaultOptions, ...options };

        // Generate barcode as PNG buffer
        const png = await bwipjs.toBuffer(barcodeOptions);
        return png;
    } catch (error) {
        throw new Error(`Barcode generation failed: ${error.message}`);
    }
}

/**
 * Generate multiple barcodes
 * @param {Array<{value: string, label: string}>} items - Array of items to generate barcodes for
 * @param {Object} options - Barcode generation options
 * @returns {Promise<Array<{label: string, barcode: Buffer}>>}
 */
async function generateBulkBarcodes(items, options = {}) {
    try {
        const barcodes = await Promise.all(
            items.map(async (item) => {
                const barcode = await generateBarcode(item.value, options);
                return {
                    label: item.label || item.value,
                    productCode: item.value,
                    barcode: barcode
                };
            })
        );
        return barcodes;
    } catch (error) {
        throw new Error(`Bulk barcode generation failed: ${error.message}`);
    }
}

/**
 * Generate barcode as base64 string
 * @param {string} barcodeValue - The value to encode in barcode
 * @param {Object} options - Barcode generation options
 * @returns {Promise<string>} Base64 encoded PNG image
 */
async function generateBarcodeBase64(barcodeValue, options = {}) {
    try {
        const png = await generateBarcode(barcodeValue, options);
        return `data:image/png;base64,${png.toString('base64')}`;
    } catch (error) {
        throw new Error(`Barcode base64 generation failed: ${error.message}`);
    }
}

/**
 * Generate QR code
 * @param {string} data - Data to encode in QR code
 * @param {Object} options - QR code generation options
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateQRCode(data, options = {}) {
    try {
        const defaultOptions = {
            bcid: 'qrcode',
            text: data,
            scale: 5,
            height: 20,
            width: 20,
        };

        const qrOptions = { ...defaultOptions, ...options };
        const png = await bwipjs.toBuffer(qrOptions);
        return png;
    } catch (error) {
        throw new Error(`QR code generation failed: ${error.message}`);
    }
}

module.exports = {
    generateBarcode,
    generateBulkBarcodes,
    generateBarcodeBase64,
    generateQRCode
};
