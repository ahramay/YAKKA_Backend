import { FastifyError, FastifyInstance, FastifyPluginOptions } from "fastify";
import {
	defaultResponseSchema,
	errorResponseSchema,
	inviteResponseSchema,
	lazyLoadSchema,
	securitySchema,
} from "../../types/globalSchemas";
import {
	cancelGroupYakkaHandler,
	createGroupHandler,
	getPlannedGroupYakkasHandler,
	getRecentGroupYakkasHandler,
	getGroupYakkaHandler,
	updateGroupYakkaHandler,
	groupResponseHandler,
	createInviteHandler,
	getAllCategoriesHandler,
	filterGroupsOnKeys,
	// nearbyGroupsHandler,
} from "./yakkaGroup.controller";
import {
	createGroupYakkaInputSchema,
	getPlannedGroupYakkasResponseSchema,
	getRecentGroupYakkasResponseSchema,
	getGroupYakkaResponseSchema,
	updateGroupYakkaInputSchema,
	yakkaGroupParamsSchema,
	groupYakkaResponseInputSchema,
	createInviteInputSchema,
	findNearbyGroupsSchema,
	groupFilterSchemaDefaultDistance,
	getAllCategoriesResponseSchema,
	newCreateGroupSchema,
	groupFiltrationSchema,
	getFilterYakkaGroupSchema,
} from "./yakkaGroup.schema";

const groupYakkaRoutes = (
	app: FastifyInstance,
	_: FastifyPluginOptions,
	done: (err?: FastifyError) => void
) => {
	// middleware to console log the request body and headers
	app.addHook("onRequest", (request, reply, done) => {
		console.log("Request Body:", request.body);
		console.log("Request Headers:", request.headers);
		done();
	});
	app.post(
		"/invite",
		{
			config: {
				rateLimit: {
					max: 10,
					timeWindow: "1 minute",
				},
			},
			schema: {
				tags: ["Groups"],
				summary: "Invite a user to a group",
				body: createInviteInputSchema,
				response: {
					201: inviteResponseSchema,
					403: errorResponseSchema.describe(
						"You can't invite yourself to a group"
					),
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		createInviteHandler
	);
	app.get(
		"/categories",
		{
			config: {
				rateLimit: {
					max: 10,
					timeWindow: "1 minute",
				},
			},
			schema: {
				tags: ["Groups"],
				summary: "Get all Categories",
				response: {
					200: getAllCategoriesResponseSchema,
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		getAllCategoriesHandler
	);

	app.post(
		"/",
		{
			config: {
				rateLimit: {
					max: 10,
					timeWindow: "1 minute",
				},
			},
			schema: {
				tags: ["Groups"],
				summary: "Create a new group",
				body: createGroupYakkaInputSchema,
				response: {
					201: newCreateGroupSchema,
					403: errorResponseSchema.describe(
						"You can't invite yourself to a yakka"
					),
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		createGroupHandler
	);

	app.put(
		"/requests/:groupId",
		{
			schema: {
				tags: ["Groups"],
				summary: "Respond to a group request",
				body: groupYakkaResponseInputSchema,
				params: yakkaGroupParamsSchema,
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		groupResponseHandler
	);

	app.get(
		"/planned",
		{
			schema: {
				tags: ["Groups"],
				summary: "Get planned groups",
				...securitySchema,
				querystring: lazyLoadSchema,
				response: {
					200: getPlannedGroupYakkasResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getPlannedGroupYakkasHandler
	);
	app.post(
		"/groupFilters",
		{
			schema: {
				tags: ["Groups"],
				summary: "Fillter Groups",
				body: groupFiltrationSchema,
				response: {
					200: getFilterYakkaGroupSchema
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		filterGroupsOnKeys
	);

	app.get(
		"/recent",
		{
			schema: {
				tags: ["Groups"],
				summary: "Get recent group",
				...securitySchema,
				querystring: lazyLoadSchema,

				response: {
					200: getRecentGroupYakkasResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getRecentGroupYakkasHandler
	);

	// app.get(
	// 	"/find/nearby",
	// 	{
	// 		//  TODO: finish this api
	// 		schema: {
	// 			tags: ["Users"],
	// 			summary: "Get nearby users",
	// 			querystring: groupFilterSchemaDefaultDistance,
	// 			// querystring: userFilterScemaDefaultDistance,
	// 			description:
	// 				"Find all groups within a certain radius of the user's location. Defaults to a max radius of 200 miles, however this is sorted by distance and lazy loaded.",
	// 			response: {
	// 				200: findNearbyGroupsSchema,
	// 				// 200: findNearbyUsersSchema,
	// 				404: errorResponseSchema.describe(
	// 					"You attempted to filter by location without providing your location"
	// 				),
	// 			},
	// 			...securitySchema,
	// 		},
	// 		onRequest: app.authenticate,
	// 	},
		// nearbyUsersHandler
	// 	nearbyGroupsHandler
	// );

	app.patch(
		"/:groupId",
		{
			schema: {
				tags: ["Groups"],
				summary: "Update a group",
				...securitySchema,
				body: updateGroupYakkaInputSchema,
				params: yakkaGroupParamsSchema,
				response: {
					200: defaultResponseSchema,
					403: errorResponseSchema.describe(
						"Access Denied"
					),
					404: errorResponseSchema.describe(
						"Group not found, it is possible it has already elapsed"
					),
				},
			},
			onRequest: app.authenticate,
		},
		updateGroupYakkaHandler
	);

	app.delete(
		"/:groupId",
		{
			schema: {
				tags: ["Groups"],
				summary: "Cancel a group",
				...securitySchema,
				params: yakkaGroupParamsSchema,
				response: {
					200: defaultResponseSchema,
					404: errorResponseSchema.describe("Yakka not found"),
				},
			},
			onRequest: app.authenticate,
		},
		cancelGroupYakkaHandler
	);

	app.get(
		"/:groupId",
		{
			schema: {
				tags: ["Groups"],
				summary: "Get a group",
				params: yakkaGroupParamsSchema,
				response: {
					200: getGroupYakkaResponseSchema,
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		getGroupYakkaHandler
	);

	done();
};

export default groupYakkaRoutes;
