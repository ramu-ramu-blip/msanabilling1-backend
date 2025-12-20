// GST Tax Calculation Utilities

// Indian state codes for GST
export const STATE_CODES = {
    'Andhra Pradesh': '37',
    'Arunachal Pradesh': '12',
    'Assam': '18',
    'Bihar': '10',
    'Chhattisgarh': '22',
    'Goa': '30',
    'Gujarat': '24',
    'Haryana': '06',
    'Himachal Pradesh': '02',
    'Jharkhand': '20',
    'Karnataka': '29',
    'Kerala': '32',
    'Madhya Pradesh': '23',
    'Maharashtra': '27',
    'Manipur': '14',
    'Meghalaya': '17',
    'Mizoram': '15',
    'Nagaland': '13',
    'Odisha': '21',
    'Punjab': '03',
    'Rajasthan': '08',
    'Sikkim': '11',
    'Tamil Nadu': '33',
    'Telangana': '36',
    'Tripura': '16',
    'Uttar Pradesh': '09',
    'Uttarakhand': '05',
    'West Bengal': '19',
    'Andaman and Nicobar Islands': '35',
    'Chandigarh': '04',
    'Dadra and Nagar Haveli and Daman and Diu': '26',
    'Delhi': '07',
    'Jammu and Kashmir': '01',
    'Ladakh': '38',
    'Lakshadweep': '31',
    'Puducherry': '34'
};

/**
 * Calculate GST breakdown based on place of supply
 * @param {Array} items - Invoice items with gstPct and amount
 * @param {String} placeOfSupply - State name or code
 * @param {String} businessState - Business state name or code
 * @returns {Object} - { cgst, sgst, igst, isInterState }
 */
export const calculateGST = (items, placeOfSupply, businessState) => {
    // Determine if inter-state
    const isInterState = placeOfSupply !== businessState;

    // Calculate total GST amount
    const totalGST = items.reduce((sum, item) => {
        const baseAmount = item.qty * item.unitRate;
        const gstAmount = (baseAmount * (item.gstPct || 0)) / 100;
        return sum + gstAmount;
    }, 0);

    if (isInterState) {
        // Inter-state: IGST only
        return {
            cgst: 0,
            sgst: 0,
            igst: totalGST,
            isInterState: true
        };
    } else {
        // Intra-state: CGST + SGST (split equally)
        return {
            cgst: totalGST / 2,
            sgst: totalGST / 2,
            igst: 0,
            isInterState: false
        };
    }
};

/**
 * Get state code from state name
 * @param {String} stateName - State name
 * @returns {String} - State code
 */
export const getStateCode = (stateName) => {
    return STATE_CODES[stateName] || '';
};

/**
 * Validate GSTIN format
 * @param {String} gstin - GSTIN to validate
 * @returns {Boolean} - Is valid
 */
export const validateGSTIN = (gstin) => {
    if (!gstin) return false;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
};

/**
 * Extract state code from GSTIN
 * @param {String} gstin - GSTIN
 * @returns {String} - State code (first 2 digits)
 */
export const getStateCodeFromGSTIN = (gstin) => {
    if (!gstin || gstin.length < 2) return '';
    return gstin.substring(0, 2);
};
