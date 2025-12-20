import Settings from '../models/Settings.js';
import logger from '../utils/logger.js';

// @desc    Get settings
// @route   GET /api/settings
// @access  Private
export const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();

        // Create default settings if none exist
        if (!settings) {
            settings = await Settings.create({
                businessName: 'mSana Billing',
                singleton: true
            });
            logger.info('Created default settings');
        }

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        logger.error(`Get settings error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to get settings'
        });
    }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private/Admin
export const updateSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();

        if (!settings) {
            // Create if doesn't exist
            settings = await Settings.create({
                ...req.body,
                singleton: true
            });
        } else {
            // Update existing
            Object.assign(settings, req.body);
            await settings.save();
        }

        logger.info(`Settings updated by user ${req.user.email}`);

        res.json({
            success: true,
            data: settings,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        logger.error(`Update settings error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update settings'
        });
    }
};

// @desc    Upload logo
// @route   POST /api/settings/logo
// @access  Private/Admin
export const uploadLogo = async (req, res) => {
    try {
        const { logoUrl } = req.body;

        if (!logoUrl) {
            return res.status(400).json({
                success: false,
                message: 'Logo URL is required'
            });
        }

        let settings = await Settings.findOne();

        if (!settings) {
            settings = await Settings.create({
                logoUrl,
                singleton: true
            });
        } else {
            settings.logoUrl = logoUrl;
            await settings.save();
        }

        logger.info(`Logo uploaded by user ${req.user.email}`);

        res.json({
            success: true,
            data: settings,
            message: 'Logo uploaded successfully'
        });
    } catch (error) {
        logger.error(`Upload logo error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to upload logo'
        });
    }
};
