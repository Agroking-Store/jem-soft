import { Router } from "express";
import { updateProfile } from "../controllers/userController.js";
import { protect} from "../middlewares/authMiddleware.js";

const router = Router();

// Update logged-in user profile
router.patch("/updateProfile",protect,  updateProfile);

export default router;