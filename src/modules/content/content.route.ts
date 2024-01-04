import { FastifyError, FastifyInstance, FastifyPluginOptions } from "fastify";
import { securitySchema } from "../../types/globalSchemas";
import { getSafetyScreenHandler } from "./content.controller";
import { getSafetyScreenResponseSchema } from "./content.schema";

const contentRoutes = (
	app: FastifyInstance,
	_: FastifyPluginOptions,
	done: (err?: FastifyError) => void
) => {
	app.get(
		"/safety",
		{
			schema: {
				tags: ["Content"],
				response: {
					200: getSafetyScreenResponseSchema,
				},
				summary: "Get safety screen content",
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		getSafetyScreenHandler
	);

	done();
};

export default contentRoutes;
