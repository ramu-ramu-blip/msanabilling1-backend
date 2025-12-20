import express from 'express';
import { getSettings, updateSettings, uploadLogo } from '../controllers/settingsController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

router.get('/', protect, getSettings);
router.put('/', protect, authorize('admin'), updateSettings);
router.post('/logo', protect, authorize('admin'), uploadLogo);

export default router;
