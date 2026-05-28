import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import investmentsRouter from "./investments";
import transactionsRouter from "./transactions";
import withdrawalsRouter from "./withdrawals";
import depositsRouter from "./deposits";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/investments", investmentsRouter);
router.use("/transactions", transactionsRouter);
router.use("/withdrawals", withdrawalsRouter);
router.use("/deposits", depositsRouter);

export default router;
