import { Router } from 'express';
import { getUsers, updateUser, deleteUser } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'lab_admin'), getUsers);
router.patch('/:id', authorize('admin', 'lab_admin'), updateUser);
router.delete('/:id', authorize('admin', 'lab_admin'), deleteUser);

export default router;
