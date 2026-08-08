import { Router } from "express";
import customerMasterRoutes from "./customerMasterRoutes.js";
import policyRoutes from "./policyRoutes.js";
import productAttributeMasterRoutes from "./productAttributeMasterRoutes.js";
import productAttributeValueRoutes from "./productAttributeValueRoutes.js";
import userRoutes from "./userRoutes.js";

const router = Router();

router.use("/users", userRoutes);
router.use("/customers-master", customerMasterRoutes);
router.use("/policies", policyRoutes);
router.use("/product-attributes-master", productAttributeMasterRoutes);
router.use("/product-attribute-values", productAttributeValueRoutes);

export default router;
