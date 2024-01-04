import pino from "pino";
import config from "./config";
// https://www.fastify.io/docs/latest/Reference/Logging/
export const loggerConfig = {
	// Provide pretty logs in development
	// Format the time and ignore hostname and process id
	development: {
		transport: {
			target: "pino-pretty",
			options: {
				translateTime: "HH:MM:ss Z",
				ignore: "pid,hostname",
			},
		},
	},
	// Provide normal logs in production
	production: true,
	// Don't log in test
	test: false,
};

// Fastify will use a built in logger and automatically log events
// The logger is attatched the the fastify instance and request objects
// So we can use it in our routes
// However, we also export a global logger here to use it in other places
// where we don't have access to the fastify instance
const selectedConfig = loggerConfig[config.NODE_ENV];
const logger = pino(
	typeof selectedConfig === "boolean"
		? {
				enabled: selectedConfig,
		  }
		: selectedConfig
);

export default logger;
