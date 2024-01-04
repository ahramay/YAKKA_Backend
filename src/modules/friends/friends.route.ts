import { FastifyError, FastifyInstance, FastifyPluginOptions } from "fastify";
import {
	defaultResponseSchema,
	errorResponseSchema,
	securitySchema,
	userParamsSchema,
} from "../../types/globalSchemas";
import {
	getFriendsHandler,
	removeFriendHandler,
	respondToFriendRequestHandler,
	sendFriendRequestHandler,
} from "./friends.controller";
import {
	friendParamsSchema,
	getFriendsResponseSchema,
	removeFriendParamsSchema,
	respondToFriendRequestSchema,
} from "./friends.schema";

const friendRoutes = (
	app: FastifyInstance,
	_: FastifyPluginOptions,
	done: (err?: FastifyError) => void
) => {
	app.post(
		"/requests/send/:userId",
		{
			schema: {
				tags: ["Friends"],
				summary: "Send a friend request",
				params: userParamsSchema,
				...securitySchema,

				response: {
					201: defaultResponseSchema,
					403: errorResponseSchema.describe(
						"You can't send a friend request to yourself"
					),
					404: errorResponseSchema.describe("User not found"),
					409: errorResponseSchema.describe("Friend request already sent"),
				},
			},
			onRequest: app.authenticate,
			preHandler: app.strictCheckBlockList,
		},
		sendFriendRequestHandler
	);

	app.put(
		"/requests/:requestId",
		{
			schema: {
				tags: ["Friends"],
				summary: "Respond to a friend request",
				params: friendParamsSchema,
				body: respondToFriendRequestSchema,
				...securitySchema,
				response: {
					200: defaultResponseSchema,
					403: errorResponseSchema.describe(
						"You can't respond to a friend request that isn't yours"
					),
					404: errorResponseSchema.describe("Friend request not found"),
					409: errorResponseSchema.describe(
						"You can't respond to a friend request that has already been responded to"
					),
				},
			},
			onRequest: app.authenticate,
		},
		respondToFriendRequestHandler
	);

	app.get(
		"/",
		{
			schema: {
				tags: ["Friends"],
				summary: "Get all friends",
				...securitySchema,
				response: {
					200: getFriendsResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getFriendsHandler
	);

	app.delete(
		"/:friendshipId",
		{
			schema: {
				tags: ["Friends"],
				summary: "Unfriend a user",
				params: removeFriendParamsSchema,
				...securitySchema,
				response: {
					200: defaultResponseSchema,
					403: errorResponseSchema.describe("You are not friends"),
					404: errorResponseSchema.describe("Friend not found"),
				},
			},
			onRequest: app.authenticate,
		},
		removeFriendHandler
	);

	done();
};

export default friendRoutes;
