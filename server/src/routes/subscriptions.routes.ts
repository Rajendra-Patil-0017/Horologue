import { Router } from 'express';
import { subscriptionsController } from '../controllers/subscriptions.controller';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';

const router = Router();

router.get('/me', verifyFirebaseToken, subscriptionsController.getMySubscription);

export default router;
