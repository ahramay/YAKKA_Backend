import { FastifyError, FastifyInstance, FastifyPluginOptions } from "fastify";
import {
	defaultResponseSchema,
	errorResponseSchema,
	lazyLoadSchema,
	securitySchema,
} from "../../types/globalSchemas";
import {
	cancelYakkaHandler,
	createYakkaHandler,
	getPlannedYakkasHandler,
	getRecentYakkasHandler,
	getYakkaHandler,
	updateYakkaHandler,
	yakkaResponseHandler,
} from "./yakka.controller";
import {
	createYakkaInputSchema,
	getPlannedYakkasResponseSchema,
	getRecentYakkasResponseSchema,
	getYakkaResponseSchema,
	updateYakkaInputSchema,
	yakkaParamsSchema,
	yakkaResponseInputSchema,
} from "./yakka.schema";

const yakkaRoutes = (
	app: FastifyInstance,
	_: FastifyPluginOptions,
	done: (err?: FastifyError) => void
) => {
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
				tags: ["Yakkas"],
				summary: "Create a new yakka",
				body: createYakkaInputSchema,
				response: {
					201: defaultResponseSchema,
					403: errorResponseSchema.describe(
						"You can't invite yourself to a yakka"
					),
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		createYakkaHandler
	);

	app.put(
		"/requests/:yakkaId",
		{
			schema: {
				tags: ["Yakkas"],
				summary: "Respond to a yakka request",
				body: yakkaResponseInputSchema,
				params: yakkaParamsSchema,
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		yakkaResponseHandler
	);

	app.get(
		"/planned",
		{
			schema: {
				tags: ["Yakkas"],
				summary: "Get planned yakkas",
				...securitySchema,
				querystring: lazyLoadSchema,
				response: {
					200: getPlannedYakkasResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getPlannedYakkasHandler
	);

	app.get(
		"/recent",
		{
			schema: {
				tags: ["Yakkas"],
				summary: "Get recent yakkas",
				...securitySchema,
				querystring: lazyLoadSchema,

				response: {
					200: getRecentYakkasResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getRecentYakkasHandler
	);

	app.patch(
		"/:yakkaId",
		{
			schema: {
				tags: ["Yakkas"],
				summary: "Update a yakka",
				...securitySchema,
				body: updateYakkaInputSchema,
				params: yakkaParamsSchema,
				response: {
					200: defaultResponseSchema,
					404: errorResponseSchema.describe(
						"Yakka not found, it is possible it has already elapsed"
					),
				},
			},
			onRequest: app.authenticate,
		},
		updateYakkaHandler
	);

	app.delete(
		"/:yakkaId",
		{
			schema: {
				tags: ["Yakkas"],
				summary: "Cancel a yakka",
				...securitySchema,
				params: yakkaParamsSchema,
				response: {
					200: defaultResponseSchema,
					404: errorResponseSchema.describe("Yakka not found"),
				},
			},
			onRequest: app.authenticate,
		},
		cancelYakkaHandler
	);

	app.get(
		"/:yakkaId",
		{
			schema: {
				tags: ["Yakkas"],
				summary: "Get a yakka",
				params: yakkaParamsSchema,
				response: {
					200: getYakkaResponseSchema,
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		getYakkaHandler
	);

	done();
};

export default yakkaRoutes;
