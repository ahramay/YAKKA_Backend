import { FastifyError, FastifyInstance, FastifyPluginOptions } from "fastify";
import {
	defaultResponseSchema,
	lazyLoadSchema,
	securitySchema,
} from "../../types/globalSchemas";
import {
	deleteNotificationHandler,
	getNotificationsHandler,
	readNotificationHandler,
} from "./notifications.controller";

import {
	getNotificationsResponseSchema,
	notificationParams,
	readNotificationInputSchema,
	readNotificationsResponseSchema,
} from "./notifications.schema";
const notificationRoutes = (
	app: FastifyInstance,
	_: FastifyPluginOptions,
	done: (err?: FastifyError) => void
) => {
	app.get(
		"/",
		{
			schema: {
				tags: ["Notifications"],
				response: {
					200: getNotificationsResponseSchema,
				},
				summary: "Get all notifications for a user",
				querystring: lazyLoadSchema,
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		getNotificationsHandler
	);

	app.put(
		"/read",
		{
			schema: {
				tags: ["Notifications"],
				summary: "Mark notifications as read",
				body: readNotificationInputSchema,
				response: {
					200: readNotificationsResponseSchema,
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		readNotificationHandler
	);

	app.delete(
		"/:notificationId",
		{
			schema: {
				tags: ["Notifications"],
				summary: "Delete a notification",
				params: notificationParams,
				...securitySchema,
				response: {
					200: defaultResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		deleteNotificationHandler
	);

	done();
};

export default notificationRoutes;
