import { FastifyError, FastifyInstance, FastifyPluginOptions } from "fastify";
import {
	defaultResponseSchema,
	errorResponseSchema,
	lazyLoadSchema,
	securitySchema,
} from "../../types/globalSchemas";
import {
	createChatHandler,
	getChatHandler,
	getChatsHandler,
	markChatAsReadHandler,
} from "./chat.controller";
import {
	createChatParamsSchema,
	createChatResponseSchema,
	getChatListResponseSchema,
	getChatParamsSchema,
	getChatResponseSchema,
} from "./chat.schema";
const chatRoutes = (
	app: FastifyInstance,
	_: FastifyPluginOptions,
	done: (err?: FastifyError) => void
) => {
	// The profile route should bring back
	// existing chat ID if it exists. If not, the app will need to call this route
	// to create one.
	app.post(
		"/:userId",
		{
			schema: {
				tags: ["Chat"],
				summary: "Create a new chat ID if it does not exist.",
				description:
					"If this is called and the user already has a chat ID, it will return the existing one.",
				params: createChatParamsSchema.describe(
					"User ID of the person you want to chat with."
				),
				response: {
					200: createChatResponseSchema.describe("Existing chat Id"),
					201: createChatResponseSchema.describe("New chat Id"),
					403: errorResponseSchema.describe("User is blocked"),
					// 403: not friends / blocked
					404: errorResponseSchema.describe("User not found"),
					// 404: user not found
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
			preHandler: app.strictCheckBlockList,
		},
		createChatHandler
	);

	// Route to lazy load chat messages
	app.get(
		"/:chatId",
		{
			schema: {
				tags: ["Chat"],
				summary: "Get chat messages",
				description: "Get chat messages",
				params: getChatParamsSchema,
				querystring: lazyLoadSchema,
				...securitySchema,
				response: {
					200: getChatResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getChatHandler
	);

	app.get(
		"/",
		{
			schema: {
				tags: ["Chat"],
				summary: "Get all chats",
				querystring: lazyLoadSchema,
				...securitySchema,
				response: {
					200: getChatListResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getChatsHandler
	);

	app.put(
		"/:chatId/read",
		{
			schema: {
				tags: ["Chat"],
				summary: "Mark chat as read",
				params: getChatParamsSchema,
				...securitySchema,
				response: {
					200: defaultResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		markChatAsReadHandler
	);

	done();
};

export default chatRoutes;
