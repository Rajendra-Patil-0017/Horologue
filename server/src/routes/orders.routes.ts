import { Router } from 'express';
import { ordersController } from '../controllers/orders.controller';
import { verifyFirebaseToken, optionalFirebaseToken } from '../middleware/verifyFirebaseToken';

const router = Router();

router.get('/', verifyFirebaseToken, ordersController.getMyOrders);
router.post('/cod', optionalFirebaseToken, ordersController.createCOD);

export default router;
