import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import prisma from "../prisma";

const rateLimit = async (
	app: FastifyInstance,
	options: FastifyPluginOptions
) => {
	return await app.register(import("@fastify/rate-limit"), {
		max: 60,
		timeWindow: "1 minute",

		async onExceeded(req, key) {
			const { ip, url, method } = req;

			await prisma.rateLimitException.create({
				data: {
					ip,
					url,
					method,
					userId: req?.user?.id,
				},
			});
		},

		keyGenerator: function (request) {
			return (request?.user?.id || request.ip) + request.url; // fallback to default
		},
	});
};

// We need to wrap the plugin with fastify-plugin to make it globally accessible
// This is because Fastify encapsulates all plugins to the context they were created in
// https://www.fastify.io/docs/latest/Reference/Encapsulation/
// https://www.npmjs.com/package/fastify-plugin
export default fp(rateLimit);
