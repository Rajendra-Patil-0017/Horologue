import { Router } from 'express';
import { paymentsController } from '../controllers/payments.controller';
import { optionalFirebaseToken } from '../middleware/verifyFirebaseToken';

const router = Router();

router.post('/create-order', optionalFirebaseToken, paymentsController.createOrder);
router.post('/verify', optionalFirebaseToken, paymentsController.verifyPayment);
router.post('/webhook', paymentsController.webhook);

export default router;
