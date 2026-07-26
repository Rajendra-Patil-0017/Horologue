import { Router } from 'express';
import { productsController, uuidParamSchema, notifyMeSchema, reviewSchema } from '../controllers/products.controller';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

router.get('/', productsController.getAll);
router.post('/:id/notify-me', validateRequest({ params: uuidParamSchema, body: notifyMeSchema }), productsController.notifyMe);
router.get('/:id/reviews', validateRequest({ params: uuidParamSchema }), productsController.getReviews);
router.post('/:id/reviews', verifyFirebaseToken, validateRequest({ params: uuidParamSchema, body: reviewSchema }), productsController.addReview);

export default router;
