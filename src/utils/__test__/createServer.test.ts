import { test } from "tap";
import createServer from "../createServer";
test("requests the `/version` route", async t => {
	const fastify = await createServer();

	// Close the server when we're done
	t.teardown(() => fastify.close());
	const response = await fastify.inject({
		method: "GET",
		url: "/api/version",
	});

	t.equal(response.statusCode, 200);
});
