import { Router } from 'express';
import { authController, syncSchema } from '../controllers/auth.controller';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

router.post('/sync', verifyFirebaseToken, validateRequest({ body: syncSchema }), authController.sync);

export default router;
