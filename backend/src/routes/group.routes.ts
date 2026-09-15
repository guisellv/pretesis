import { Router } from "express";
import { joinGroup } from "../controllers/group.controller";

const router = Router();

router.post("/unirse", joinGroup);

export default router;
