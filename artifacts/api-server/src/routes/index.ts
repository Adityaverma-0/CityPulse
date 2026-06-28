import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import complaintsRouter from "./complaints";
import departmentsRouter from "./departments";
import workersRouter from "./workers";
import analyticsRouter from "./analytics";
import assignmentsRouter from "./assignments";
import usersRouter from "./users";
import assetsRouter from "./assets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(complaintsRouter);
router.use(departmentsRouter);
router.use(workersRouter);
router.use(analyticsRouter);
router.use(assignmentsRouter);
router.use(usersRouter);
router.use(assetsRouter);

export default router;
