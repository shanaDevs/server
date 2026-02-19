// Unit conversion utilities

// Conversion factors to base units
const CONVERSIONS = {
    weight: {
        kg: 1,
        g: 0.001
    },
    volume: {
        l: 1,
        ml: 0.001
    },
    count: {
        pcs: 1,
        bunch: 1,
        doz: 12,
        pack: 1
    }
};

// Get unit type from unit
exports.getUnitType = (unit) => {
    if (['kg', 'g'].includes(unit)) return 'weight';
    if (['l', 'ml'].includes(unit)) return 'volume';
    if (['pcs', 'bunch', 'doz', 'pack'].includes(unit)) return 'count';
    return 'count';
};

// Get base unit from unit type
exports.getBaseUnit = (unitType) => {
    const baseUnits = {
        weight: 'kg',
        volume: 'l',
        count: 'pcs'
    };
    return baseUnits[unitType] || 'pcs';
};

// Convert to base unit
exports.convertToBaseUnit = (quantity, unit) => {
    const unitType = exports.getUnitType(unit);
    const conversionFactor = CONVERSIONS[unitType][unit] || 1;
    return quantity * conversionFactor;
};

// Convert from base unit to specific unit
exports.convertFromBaseUnit = (baseQuantity, targetUnit) => {
    const unitType = exports.getUnitType(targetUnit);
    const conversionFactor = CONVERSIONS[unitType][targetUnit] || 1;
    return baseQuantity / conversionFactor;
};

// Format display quantity
exports.formatQuantity = (quantity, unit, allowDecimal = false) => {
    const formatted = allowDecimal ? parseFloat(quantity).toFixed(2) : Math.floor(quantity);
    return `${formatted} ${unit}${quantity !== 1 && !unit.endsWith('s') ? 's' : ''}`;
};

// Calculate unit value for conversion
exports.calculateUnitValue = (unit) => {
    const unitType = exports.getUnitType(unit);
    return CONVERSIONS[unitType][unit] || 1;
};

// Validate if decimal is allowed for unit type
exports.canUseDecimal = (unit) => {
    const unitType = exports.getUnitType(unit);
    return unitType === 'weight' || unitType === 'volume';
};

// Get display info for unit
exports.getUnitDisplayInfo = (unit) => {
    const displays = {
        kg: { name: 'Kilogram', symbol: 'kg', decimals: 3 },
        g: { name: 'Gram', symbol: 'g', decimals: 0 },
        l: { name: 'Liter', symbol: 'l', decimals: 3 },
        ml: { name: 'Milliliter', symbol: 'ml', decimals: 0 },
        pcs: { name: 'Piece', symbol: 'pcs', decimals: 0 },
        bunch: { name: 'Bunch', symbol: 'bunch', decimals: 0 },
        doz: { name: 'Dozen', symbol: 'doz', decimals: 0 },
        pack: { name: 'Pack', symbol: 'pack', decimals: 0 }
    };
    return displays[unit] || { name: unit, symbol: unit, decimals: 0 };
};

module.exports = exports;
