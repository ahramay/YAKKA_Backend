import type {
	FastifyInstance,
	FastifyRequest,
	FastifyReply,
	FastifyError,
	FastifyPluginOptions,
} from "fastify";
import jwt from "@fastify/jwt";
import fp from "fastify-plugin";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { JwtSchema } from "../../modules/auth/auth.schema";

// Export a zod schema so we can strip out any unwanted properties
// And ensure the user object is of the type we expect

export type JWTUser = JwtSchema & {
	sessionId: number;
	iat: number;
	exp: number;
};

const fjwt = (
	app: FastifyInstance,
	options: FastifyPluginOptions,
	done: () => void
) => {
	// Configuration for @fastify/jwt

	app.register(jwt, {
		secret: {
			private: fs.readFileSync(
				`${(path.join(process.cwd()), "certs")}/private.key`
			),
			public: fs.readFileSync(
				`${(path.join(process.cwd()), "certs")}/public.key`
			),
		},
		sign: { algorithm: "RS256" },
	});

	// Add a 'decorator' to the fastify instance
	// A decorator is just a function that is attached to the fastify instance#
	// This decorator simply calls jwt verify
	// https://www.fastify.io/docs/latest/Reference/Decorators/
	// We also need to tell typescript about this decorator, I do in types.d.ts
	app.decorate(
		"authenticate",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const payload = await request.jwtVerify<JWTUser>();

				// Check if it is an access token or a refresh token
				if (!payload.id && payload.sessionId) {
					//throw error with code
					throw {
						code: "FST_JWT_USING_REFRESH_TOKEN_AS_ACCESS_TOKEN",
						message: "You are using a refresh token as an access token",
						statusCode: 403,
					};
				}

				// If they haven't verified and are not on the verify route, throw an error

				if (
					// if they haven't verified, and they are not on the verify route
					!payload.phoneVerified &&
					![
						"/api/users/image-verification",
						"/api/auth/otp/request",
						"/api/auth/otp/verify",
						"/api/users/signup/progress",
						"/api/auth/logout",
					].includes(request.url)
				) {
					request.log.info("User has not verified");
					return reply.code(403).send({
						message:
							"You need to verify your phone number before you can use the app",
						errorCode: request.url,
						// request,
					});
				}
			} catch (err) {
				request.log.error(err);
				throw err;
			}
		}
	);

	// I want the jwt methods be available on the request object
	// so we can use them in the controllers, therefore I am going to
	// add a preHandler hook to all routes which adds the jwt methods
	// Fastify allows us to hook in to the request lifecycle at many points
	// https://www.fastify.io/docs/latest/Reference/Hooks/
	app.addHook("preHandler", (req, reply, next) => {
		// NOTE: We also need to inform TypeScript that we
		// have modified the request object, I'm doing that in
		// types.d.ts
		req.jwt = app.jwt;
		return next();
	});

	// Call the done callback when you are finished
	done();
};

// We need to wrap the plugin with fastify-plugin to make it globally accessible
// This is because Fastify encapsulates all plugins to the context they were created in
// https://www.fastify.io/docs/latest/Reference/Encapsulation/
// https://www.npmjs.com/package/fastify-plugin
export default fp(fjwt);
