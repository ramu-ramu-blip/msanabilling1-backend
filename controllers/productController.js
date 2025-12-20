import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import logger from '../utils/logger.js';
import stockWatcher from '../services/stockWatcher.js';
import fs from 'fs';
import csv from 'csv-parser';
import mongoose from 'mongoose';

// @desc    Get all products
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res, next) => {
    try {
        const { search, lowStock, schedule } = req.query;

        let query = { isActive: true };

        // Search by name, brand, generic, or SKU
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { generic: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
            ];
        }

        // Filter by schedule
        if (schedule) {
            query.schedule = schedule;
        }

        // Filter low stock items
        if (lowStock === 'true') {
            query.$expr = { $lte: ['$stock', '$minStock'] };
        }

        const products = await Product.find(query)
            .sort({ brand: 1 });

        res.json({
            success: true,
            count: products.length,
            data: products,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
export const getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (Admin/Staff)
export const createProduct = async (req, res, next) => {
    try {
        const { supplier } = req.body;

        // If supplier is provided as a name instead of an ID, look it up
        if (supplier && !mongoose.Types.ObjectId.isValid(supplier)) {
            const foundSupplier = await Supplier.findOne({
                name: { $regex: new RegExp('^' + supplier + '$', 'i') }
            });
            if (foundSupplier) {
                req.body.supplier = foundSupplier._id;
            } else {
                // If not found, we keep it as is or could set to undefined
                // For now, let's keep the user's string so they see validation error if it's not a valid ID
            }
        }

        const product = await Product.create(req.body);

        logger.info(`Product created: ${product.brand} (${product.sku})`);

        res.status(201).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin/Staff)
export const updateProduct = async (req, res, next) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        logger.info(`Product updated: ${product.brand}`);

        // Reset notification tracking in case stock/minStock changed
        stockWatcher.resetProductNotification(product._id);

        res.json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
export const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Soft delete
        product.isActive = false;
        await product.save();

        logger.info(`Product soft deleted: ${product.brand}`);

        res.json({
            success: true,
            message: 'Product deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update product stock
// @route   PATCH /api/products/:id/stock
// @access  Private (Admin/Staff)
export const updateStock = async (req, res, next) => {
    try {
        // NOTE: In new system, stock should be updated via helper functions interacting with Batches
        // For now, allowing direct override for simple edits, but warning this is unsafe for FIFO.
        const { quantity, operation } = req.body;

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (operation === 'add') {
            product.stock += quantity;
        } else if (operation === 'subtract') {
            if (product.stock < quantity) {
                return res.status(400).json({ message: 'Insufficient stock' });
            }
            product.stock -= quantity;
        }

        await product.save();

        logger.info(
            `Stock manually updated for ${product.brand}: ${operation} ${quantity}, new stock: ${product.stock}`
        );

        // Reset low stock notification tracking so it alerts again if it drops low
        stockWatcher.resetProductNotification(product._id);

        res.json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get low stock products
// @route   GET /api/products/alerts/low-stock
// @access  Private
export const getLowStockProducts = async (req, res, next) => {
    try {
        const products = await Product.find({
            $expr: { $lte: ['$stock', '$minStock'] },
            isActive: true,
        })
            .sort({ stock: 1 });

        res.json({
            success: true,
            count: products.length,
            data: products,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get expiring products (next 30 days)
// @route   GET /api/products/alerts/expiring
// @access  Private
export const getExpiringProducts = async (req, res, next) => {
    try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const products = await Product.find({
            expiryDate: {
                $exists: true,
                $ne: null,
                $lte: thirtyDaysFromNow
            },
            isActive: true,
        })
            .select('name brand generic expiryDate stock')
            .sort({ expiryDate: 1 });

        res.json({
            success: true,
            count: products.length,
            data: products,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get product schedules (was categories)
// @route   GET /api/products/categories
// @access  Private
export const getCategories = async (req, res, next) => {
    try {
        const schedules = await Product.distinct('schedule');
        res.json({
            success: true,
            count: schedules.length,
            data: schedules,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Bulk import products from CSV
// @route   POST /api/products/bulk
// @access  Private (Admin/Manager)
export const bulkImportProducts = async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
    }

    const results = [];
    const errors = [];
    let successCount = 0;

    // Use a stream to parse CSV
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                for (let i = 0; i < results.length; i++) {
                    const row = results[i];
                    try {
                        // Transform and validate data based on model fields
                        // Handle Supplier Linking (by ID or by Name)
                        let supplierId = undefined;
                        const supplierVal = row.supplier?.trim();

                        if (supplierVal) {
                            if (mongoose.Types.ObjectId.isValid(supplierVal)) {
                                supplierId = supplierVal;
                            } else {
                                // Lookup by name
                                const foundSupplier = await Supplier.findOne({
                                    name: { $regex: new RegExp('^' + supplierVal + '$', 'i') }
                                });
                                if (foundSupplier) {
                                    supplierId = foundSupplier._id;
                                }
                            }
                        }

                        const productData = {
                            sku: row.sku?.trim(),
                            brand: row.brand?.trim(),
                            generic: row.generic?.trim(),
                            form: row.form?.toUpperCase().trim(),
                            strength: row.strength?.trim(),
                            mrp: parseFloat(row.mrp),
                            schedule: row.schedule?.toUpperCase().trim() || 'OTC',
                            gstPercent: parseInt(row.gstPercent) || 12,
                            hsnCode: row.hsnCode?.trim(),
                            batchNumber: row.batchNumber?.trim(),
                            expiryDate: row.expiryDate ? new Date(row.expiryDate) : undefined,
                            minStock: parseInt(row.minStock) || 10,
                            stock: parseInt(row.stock) || 0,
                            unitsPerPack: parseInt(row.unitsPerPack) || 1,
                            barcode: row.barcode?.trim(),
                            supplier: supplierId,
                        };

                        // Basic required field validation as per createProduct logic
                        if (!productData.sku || !productData.brand || !productData.generic || !productData.form || !productData.strength || isNaN(productData.mrp)) {
                            throw new Error(`Row ${i + 1}: Missing required fields or invalid MRP`);
                        }

                        // Create product (reusing createProduct logic)
                        await Product.create(productData);
                        successCount++;
                    } catch (err) {
                        errors.push({
                            row: i + 1,
                            sku: row.sku,
                            error: err.message
                        });
                    }
                }

                // Delete temporary file
                fs.unlinkSync(req.file.path);

                logger.info(`Bulk import completed: ${successCount} successful, ${errors.length} failed`);

                res.status(200).json({
                    success: true,
                    message: `Import completed: ${successCount} successful, ${errors.length} failed`,
                    data: {
                        total: results.length,
                        success: successCount,
                        failed: errors.length,
                        errors: errors.length > 0 ? errors : []
                    }
                });
            } catch (error) {
                // Delete temporary file on hard error
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                next(error);
            }
        })
        .on('error', (error) => {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            next(error);
        });
};