import fastify, { FastifyReply, FastifyRequest } from "fastify";
import config from "./config";
import { loggerConfig } from "./logger";
import userRoutes from "../modules/user/user.route";
import authRoutes from "../modules/auth/auth.route";
import miscRoutes from "../modules/misc/misc.route";
import notificationRoutes from "../modules/notifications/notifications.route";
import fjwt from "./plugins/jwt";
import {
	jsonSchemaTransform,
	serializerCompiler,
	validatorCompiler,
} from "fastify-type-provider-zod";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { version } from "../../package.json";
import errorHandler from "./plugins/errorHandler";
import friendRoutes from "../modules/friends/friends.route";
import yakkaRoutes from "../modules/yakka/yakka.route";
import groupYakkaRoutes from "../modules/yakkaGroup/yakkaGroup.route";
import { checkIsBlocked } from "./globalHelpers";
import socketIo from "./plugins/socketIo";
import chatRoutes from "../modules/chat/chat.route";
import cron from "./plugins/cron";
import contentRoutes from "../modules/content/content.route";
import rateLimit from "./plugins/rateLimit";

// We separate the server creation into its own function to make testing easier
const createServer = async () => {
	const app = fastify({
		logger: loggerConfig[config.NODE_ENV] ?? true,
		bodyLimit: 5 * 1024 * 1024,
});

//   Register Plugins

	await app.register(rateLimit);
	app.register(socketIo);
	app.register(errorHandler);
	app.register(fjwt);
	app.register(cron);

	// Zod and swagger
	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);

	app.register(fastifySwagger, {
		transform: jsonSchemaTransform,
		openapi: {
			info: {
				title: "Yakka API",
				description: "Yakka API",
				version,
			},
			components: {
				securitySchemes: {
					bearerAuth: {
						type: "http",
						scheme: "bearer",
						bearerFormat: "JWT",
						description:
							"JWT Authorization header using the Bearer scheme. Put your access token in the header. Example: 'Authorization: Bearer {token}'",
					},
				},
			},
		},
	});

	app.register(fastifySwaggerUi, {
		routePrefix: "/docs",
		staticCSP: true,
	});

	app.decorate(
		"checkBlockList",
		async (
			request: FastifyRequest<{
				Params: {
					userId: number;
				};
			}>,
			reply: FastifyReply
		) => {
			await checkIsBlocked({
				currentUserId: request.user.id,
				otherUserId: request.params.userId,
				strict: false,
			});
		}
	);
	app.decorate(
		"strictCheckBlockList",
		async (
			request: FastifyRequest<{
				Params: {
					userId: number;
				};
			}>,
			reply: FastifyReply
		) => {
			await checkIsBlocked({
				currentUserId: request.user.id,
				otherUserId: request.params.userId,
				strict: true,
			});
		}
	);

	// Register routes
	// app.addHook("onRequest", (request, reply, done) => {
	// 	console.log("Request Body:", request.body);
	// 	console.log("Request Headers:", request.headers);
	// 	done();
	// });
	
	app.register(miscRoutes);
	app.register(yakkaRoutes, { prefix: "/api/yakkas" });
	app.register(groupYakkaRoutes, { prefix: "/api/groups" })
	app.register(friendRoutes, { prefix: "/api/friends" });
	app.register(userRoutes, { prefix: "/api/users" });
	app.register(chatRoutes, { prefix: "/api/chats" });
	app.register(notificationRoutes, { prefix: "/api/notifications" });
	app.register(contentRoutes, { prefix: "/api/content" });

	app.register(authRoutes, { prefix: "/api/auth" });
	// app.ready().then(() => {
	// 	// if (config.NODE_ENV === 'production') {
	// 	//   server.scheduler.addSimpleIntervalJob(commentCounterJob);
	// 	//   server.scheduler.addSimpleIntervalJob(likeCounterJob);
	// 	// }

	// });A
	return app;
};

export default createServer;
