import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/rbac.middleware.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

router
  .route('/')
  .get(checkPermission('user:readAll'), userController.getAllUsers)
  .post(checkPermission('user:create'), userController.createUser);

router
  .route('/:id')
  .get(checkPermission('user:readOne'), userController.getUser)
  .patch(checkPermission('user:update'), userController.updateUser)
  .delete(checkPermission('user:delete'), userController.deleteUser);

export { router as userRoutes };
