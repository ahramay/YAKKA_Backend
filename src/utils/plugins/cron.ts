import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import fastifyCron from "fastify-cron";
import fp from "fastify-plugin";
import { checkForFlaggedMessages } from "../../modules/chat/chat.scheduled";
import {
	clearLocations,
	sendVerificationReminder,
} from "../../modules/user/user.scheduled";
import { scheduledAlertEmergencyContacts } from "../../modules/yakka/yakka.scheduled";
import config from "../config";

const cron = (
	app: FastifyInstance,
	options: FastifyPluginOptions,
	done: () => void
) => {
	app.register(fastifyCron, {
		jobs: [
			// {
			// 	cronTime: "0 * * * *", // Every hour at minute 0
			// 	onTick: clearLocations,
			// },
			{
				cronTime: "* * * * *", // Every minute
				onTick: scheduledAlertEmergencyContacts,
			},
			{
				cronTime: "* * * * *", // Every minute
				onTick: checkForFlaggedMessages,
			},
			{
				// every day at 12pm
				cronTime: "0 12 * * *",
				onTick: sendVerificationReminder,
			},
		],
	});
	app.ready().then(() => {
		if (config.NODE_ENV === "production") {
			app.cron.startAllJobs();
		}
	});

	// Call the done callback when you are finished
	done();
};

// We need to wrap the plugin with fastify-plugin to make it globally accessible
// This is because Fastify encapsulates all plugins to the context they were created in
// https://www.fastify.io/docs/latest/Reference/Encapsulation/
// https://www.npmjs.com/package/fastify-plugin
export default fp(cron);
