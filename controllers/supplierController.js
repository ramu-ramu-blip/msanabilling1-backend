import Supplier from '../models/Supplier.js';
import logger from '../utils/logger.js';

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
export const getSuppliers = async (req, res, next) => {
    try {
        const { search, isActive } = req.query;

        let query = {};

        // Search by name, phone, or email
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        // Filter by active status
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const suppliers = await Supplier.find(query).sort({ name: 1 });

        res.json({
            success: true,
            count: suppliers.length,
            data: suppliers,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single supplier
// @route   GET /api/suppliers/:id
// @access  Private
export const getSupplier = async (req, res, next) => {
    try {
        const supplier = await Supplier.findById(req.params.id);

        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        res.json({
            success: true,
            data: supplier,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private (Admin/Staff)
export const createSupplier = async (req, res, next) => {
    try {
        const supplier = await Supplier.create(req.body);

        logger.info(`Supplier created: ${supplier.name}`);

        res.status(201).json({
            success: true,
            data: supplier,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private (Admin/Staff)
export const updateSupplier = async (req, res, next) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        logger.info(`Supplier updated: ${supplier.name}`);

        res.json({
            success: true,
            data: supplier,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin only)
export const deleteSupplier = async (req, res, next) => {
    try {
        const supplier = await Supplier.findById(req.params.id);

        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        await supplier.deleteOne();

        logger.info(`Supplier deleted: ${supplier.name}`);

        res.json({
            success: true,
            message: 'Supplier deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
