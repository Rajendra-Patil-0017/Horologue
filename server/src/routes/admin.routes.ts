import { Router } from 'express';
import { adminController, updateStatusSchema, uuidParamSchema, updateProductSchema, createProductSchema } from '../controllers/admin.controller';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

// Apply auth and admin checks to all admin endpoints
router.use(verifyFirebaseToken);
router.use(requireAdmin);

router.get('/orders', adminController.getOrders);
router.patch('/orders/:id', validateRequest({ params: uuidParamSchema, body: updateStatusSchema }), adminController.updateOrderStatus);
router.get('/customers', adminController.getCustomers);
router.get('/subscriptions', adminController.getSubscriptions);
router.get('/newsletter', adminController.getNewsletter);
router.get('/stats', adminController.getStats);
router.post('/products', validateRequest({ body: createProductSchema }), adminController.addProduct);
router.patch('/products/:id', validateRequest({ params: uuidParamSchema, body: updateProductSchema }), adminController.updateProduct);
router.delete('/products/:id', validateRequest({ params: uuidParamSchema }), adminController.deleteProduct);

export default router;
