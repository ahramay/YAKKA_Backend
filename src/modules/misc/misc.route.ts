import { FastifyError, FastifyInstance, FastifyPluginOptions } from "fastify";
import { version } from "../../../package.json";
import { generateDeepLink } from "../../utils/deeplink";

const miscRoutes = (
	app: FastifyInstance,
	_: FastifyPluginOptions,
	done: (err?: FastifyError) => void
) => {
	app.get(
		"/api/ping",
		{
			schema: {
				hide: true,
				summary: "ping",
			},
		},
		(req, reply) => {
			reply.code(200).send({ message: "hello" });
		}
	);
	app.get(
		"/api/version",
		{
			schema: {
				hide: true,
				summary: "Get the API version",
			},
		},
		(req, reply) => {
			reply.code(200).send(version);
		}
	);

	app.get(
		"/api/redirect",
		{
			schema: {
				hide: true,
			},
		},
		async (req, reply) => {
			// Query includes a routeName and a routeParams object
			// routeName is the name of the route to redirect to
			// routeParams is an object of the params to pass to the route
			// @ts-ignore
			const { routeName, ...query } = req.query;
			// Join the query params to the route
			const deeplink = generateDeepLink(routeName, query);

			return reply.redirect(deeplink);
		}
	);

	done();
};

export default miscRoutes;
