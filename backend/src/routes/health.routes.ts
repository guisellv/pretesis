import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
    res.status(200).json({
        status: "success",
        message: "API de Agenda Comunitaria funcionando",
    });
});

export default router;
