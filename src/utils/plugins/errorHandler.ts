import type {
	FastifyError,
	FastifyInstance,
	FastifyPluginOptions,
} from "fastify";
import fp from "fastify-plugin";
import { ZodError, ZodIssue } from "zod";
import { ERROR_MESSAGES } from "../../constants/errorMessages";

const errorHandler = (
	app: FastifyInstance,
	options: FastifyPluginOptions,
	done: () => void
) => {
	app.setErrorHandler(
		(error: (FastifyError & { type?: string }) | ZodError, request, reply) => {
			request.log.error(error, "Error handler");

			if ("statusCode" in error) {
				if (error.statusCode === 429) {
					return reply.code(429).send({
						errorCode: error.message,
					});
				}
			}

			// If we catch a ZodError, return a 400 and the error message
			// I like to format the erors with .flatten() so they are easier to parse on the frotnend
			// Then, I add the error code as well so the frontend can handle it
			// https://github.com/colinhacks/zod/blob/master/ERROR_HANDLING.md#error-handling-in-zod

			if (error instanceof ZodError) {
				// get error or error.err

				request.log.error("It is a zod error");
				request.log.error(error.flatten().fieldErrors);
				return reply.code(400).send({
					errors: (error as ZodError).flatten((issue: ZodIssue) => ({
						message: issue.message || "Error with this field",
						errorCode: issue.code,
					})).fieldErrors,
				});
			}

			// Handle JWT errors
			if (error.code?.startsWith?.("FST_JWT_")) {
				return reply.code(error.statusCode || 401).send({
					errorCode: error.code,
					message: error.message,
				});
			}

			if (Object.keys(ERROR_MESSAGES).includes(error.message)) {
				return reply.code(403).send({
					errorCode: error.message,
					// @ts-ignore
					message: ERROR_MESSAGES[error.message] || "Error",
				});
			}

			// Otherwise, return a 500
			reply.status(500).send({
				errorCode: error.code,
				message: "Internal server error",
			});
		}
	);

	done();
};

export default fp(errorHandler);
