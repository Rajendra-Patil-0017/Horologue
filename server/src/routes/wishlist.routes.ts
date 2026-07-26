import { Router } from 'express';
import { wishlistController, addToWishlistSchema, wishlistParamSchema } from '../controllers/wishlist.controller';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

router.use(verifyFirebaseToken);

router.get('/', wishlistController.getWishlist);
router.post('/', validateRequest({ body: addToWishlistSchema }), wishlistController.addToWishlist);
router.delete('/:productId', validateRequest({ params: wishlistParamSchema }), wishlistController.removeFromWishlist);

export default router;
