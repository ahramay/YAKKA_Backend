import { faker } from "@faker-js/faker";
import { test } from "tap";
import { ImportMock } from "ts-mock-imports";
import createServer from "../../../utils/createServer";
import * as authService from "../auth.service";
test("POST `/api/auth/credentials` - create user successfully with mock", async t => {
	const name = faker.name.firstName();
	const email = faker.internet.email();
	const password = faker.internet.password();
	const id = Number(faker.random.numeric());
	const fastify = await createServer();

	const accessToken = faker.random.alphaNumeric();
	const refreshToken = faker.random.alphaNumeric();
	const expiresAt = Number(faker.random.numeric());

	const createStub = ImportMock.mockFunction(authService, "createUser", {
		id,
		name,
		email,
	});

	const accessTokenStub = ImportMock.mockFunction(
		authService,
		"generateAccessRefreshTokens",
		{
			accessToken,
			refreshToken,
			expiresAt,
		}
	);
	t.teardown(() => {
		fastify.close();
		createStub.restore();
		accessTokenStub.restore();
	});

	const response = await fastify.inject({
		method: "POST",
		url: "/api/auth/credentials",
		payload: {
			email,
			name,
			password,
		},
	});

	t.equal(response.statusCode, 200);
	t.equal(response.headers["content-type"], "application/json; charset=utf-8");

	const json = response.json();
	t.equal(json.accessToken, accessToken);
	t.equal(json.refreshToken, refreshToken);
	t.equal(json.expiresAt, expiresAt);
});

test("POST `/api/auth/credentials` - create user successfully with test database", async t => {});

test("POST `/api/auth/credentials` - fail to create a user", async t => {});
