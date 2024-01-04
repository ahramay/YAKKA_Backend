import { PrismaClient } from "@prisma/client";
import logger from "./logger";
// Export a Prisma singleton
const prisma = new PrismaClient({
	log: ["query", "info", "warn", "error"],
});

export default prisma;

prisma.$on("beforeExit", async () => {
	logger.info("Closing prisma connection");
});
