import express from 'express';
import { getAuditLogs, getAuditStats } from '../controllers/auditLogController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

router.get('/', protect, authorize('admin'), getAuditLogs);
router.get('/stats', protect, authorize('admin'), getAuditStats);

export default router;
