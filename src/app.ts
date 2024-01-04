import createServer from "./utils/createServer";
import config from "./utils/config";
import prisma from "./utils/prisma";
import logger from "./utils/logger";

const signals = ["SIGINT", "SIGTERM", "SIGQUIT"] as const;
// We say as const to make sure that the type of signals is
// 'SIGINT' | 'SIGTERM' | 'SIGQUIT' instead of just string

const gracefulShutdown = async ({
	signal,
	server,
}: {
	signal: typeof signals[number];
	server: Awaited<ReturnType<typeof createServer>>;
}) => {
	logger.info(`Received ${signal} signal. Goodbye!`);
	await server.close();
	//   NOTE: Typically we don't need to explicitly connect or disconnect with Prisma
	// https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-management
	//   However it can't hurt to do it here
	await prisma.$disconnect();

	process.exit(0);
};

const startServer = async () => {
	const server = await createServer();
	server.listen({
		port: config.PORT,
		host: config.HOST, //NOTE: It is important to define the host
		// as 0.0.0.0 for docker as it doesn't know what localhost is
	});

	//   Add a listener for each signal
	signals.forEach(signal => {
		process.on(signal, () => {
			gracefulShutdown({ signal, server });
		});
	});
};

startServer();
