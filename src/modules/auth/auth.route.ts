import { FastifyError, FastifyInstance, FastifyPluginOptions } from "fastify";
import {
	defaultResponseSchema,
	errorResponseSchema,
} from "../../types/globalSchemas";
import config from "../../utils/config";
import {
	appleSignInHandler,
	credentialsLoginHandler,
	credentialsSignuphandler,
	deleteAccountHandler,
	facebookDeletionRequestHandler,
	facebookDeletionStatus,
	facebookSignInHandler,
	forgotPasswordHandler,
	getLinkedinLoginUrlHandler,
	googleSignInHandler,
	linkedinCallbackHandler,
	logoutHandler,
	refreshTokenHandler,
	requestNewOtpHandler,
	resetPasswordHandler,
	verifyOtpHandler,
} from "./auth.controller";
import {
	appleSignInSchema,
	credentialsRegisterSchema,
	credentialsSchema,
	credentialsSignInResponseSchema,
	facebookSignInSchema,
	forgotPasswordSchema,
	googleSignInSchema,
	linkedinLoginUrlResponseSchema,
	refreshTokenSchema,
	requestOtpSchema,
	resetPasswordSchema,
	signinResponseSchema,
	verifyOtpSchema,
} from "./auth.schema";
const authRoutes = (
	app: FastifyInstance,
	_: FastifyPluginOptions,
	done: (err?: FastifyError) => void
) => {
	// Credentials routes
	// TODO: This is for backwards compatibility, remove this in the future
	app.post(
		"/credentials",
		{
			schema: {
				summary: "Login with credentials",
				tags: ["Auth"],
				body: credentialsSchema,
				response: {
					200: credentialsSignInResponseSchema,
					400: errorResponseSchema.describe("Invalid credentials"),
					404: errorResponseSchema.describe("User not found"),
				},
				hide: true,
			},
		},
		credentialsLoginHandler
	);
	app.post(
		"/credentials/login",
		{
			schema: {
				summary: "Login with credentials",
				tags: ["Auth"],
				body: credentialsSchema,
				response: {
					200: credentialsSignInResponseSchema,
					400: errorResponseSchema.describe("Invalid credentials"),
					404: errorResponseSchema.describe("User not found"),
				},
			},
		},
		credentialsLoginHandler
	);

	app.post(
		"/credentials/signup",
		{
			schema: {
				summary: "Sign up with credentials, auto log in",
				tags: ["Auth"],
				body: credentialsSchema,
				response: {
					200: credentialsSignInResponseSchema,
					409: errorResponseSchema.describe(
						"User has signed up with a different provider."
					),
				},
			},
		},
		credentialsSignuphandler
	);

	// OTP Routes

	app.post(
		"/otp/verify",
		{
			config: {
				rateLimit: {
					max: 3,
					timeWindow: "1 minute",
				},
			},
			schema: {
				tags: ["Auth"],
				body: verifyOtpSchema,
				description: "Verify an OTP",
				response: {
					200: defaultResponseSchema.describe("OTP verified successfully"),
					400: errorResponseSchema.describe("Invalid OTP"),
					403: errorResponseSchema.describe("Already verified"),
					404: errorResponseSchema.describe(
						"User with that phone number not found"
					),
					410: errorResponseSchema.describe("OTP expired"),
				},
				security: [
					{
						bearerAuth: [],
					},
				],
				summary: "Verify an OTP",
			},
			onRequest: app.authenticate,
		},
		verifyOtpHandler
	);

	app.post(
		"/otp/request",
		{
			config: {
				rateLimit: {
					max: 3,
					timeWindow: "1 minute",
				},
			},
			schema: {
				summary: "Generate a new OTP",
				tags: ["Auth"],
				description:
					"Generate a new OTP, this will invalidate the previous OTP and will only work if the user has not already verified their number",
				body: requestOtpSchema,
				security: [
					{
						bearerAuth: [],
					},
				],
				response: {
					200: defaultResponseSchema.describe("OTP sent successfully"),
					403: errorResponseSchema.describe(
						"User has already verified their number"
					),
					404: errorResponseSchema.describe("User not found"),
					409: errorResponseSchema.describe("Phone number already in use"),
				},
			},
			onRequest: app.authenticate,
		},
		requestNewOtpHandler
	);

	// Token routes
	app.post(
		"/refresh",
		{
			schema: {
				summary: "Refresh a JWT",
				tags: ["Auth"],
				body: refreshTokenSchema,
				response: {
					200: signinResponseSchema.omit({
						isNewUser: true,
					}),
					401: errorResponseSchema.describe("Invalid refresh token"),
				},
				description:
					"Generate new access and refresh tokens, this will invalidate the previous refresh token. If you receive an error from this route, you should log the user out.",
			},
		},
		refreshTokenHandler
	);

	// OAUTH routes

	app.post(
		"/google",
		{
			schema: {
				tags: ["Auth"],
				body: googleSignInSchema,
				summary: "Login / Signup with Google",
				description:
					"Login / Sign up using Google. If an account does not exist, we make one and auto sign in.",
				response: {
					200: signinResponseSchema,
					400: errorResponseSchema.describe(
						"Invalid Google token or email not verified"
					),
					409: errorResponseSchema.describe(
						"User has singed up with a different provider."
					),
				},
			},
		},
		googleSignInHandler
	);

	app.post(
		"/apple",
		{
			schema: {
				tags: ["Auth"],
				body: appleSignInSchema,
				summary: "Login / Signup with Apple",
				description:
					"Login / Sign up using Apple. If an account does not exist, we make one and auto sign in.",
				response: {
					200: signinResponseSchema,
					400: errorResponseSchema.describe(
						"Invalid Apple token or email not verified"
					),
					409: errorResponseSchema.describe(
						"User has singed up with a different provider."
					),
				},
			},
		},
		appleSignInHandler
	);

	app.post(
		"/facebook",
		{
			schema: {
				tags: ["Auth"],
				summary: "Login / Signup with Facebook",
				description:
					"Login / Sign up using Facebook. If an account does not exist, we make one and auto sign in.",
				body: facebookSignInSchema,
				response: {
					200: signinResponseSchema,
					400: errorResponseSchema.describe("Invalid Facebook token"),
					409: errorResponseSchema.describe(
						"User has singed up with a different provider."
					),
				},
			},
		},
		facebookSignInHandler
	);

	app.get(
		"/linkedin/link",
		{
			schema: {
				tags: ["Auth"],
				summary: "Get a link to login with LinkedIn",
				description: `Generates the linkedin login URL for the app to open in the in-app browser. If the user is authenticated successfully, we will deep link back to the app with access/refresh tokens for Yakk
				\n
				The deep link will be like this ${config.APP_URL_SCHEME}://authRedirect?accessToken=JWT_TOKEN_HERE&refreshToken=JWT_TOKEN_HERE
				\n 
				If there was an error, the deep link will be like this ${config.APP_URL_SCHEME}://authRedirect?error=ERROR_HERE
				`,
				response: {
					200: linkedinLoginUrlResponseSchema,
				},
			},
		},
		getLinkedinLoginUrlHandler
	);

	app.get(
		"/linkedin/callback",
		{
			schema: {
				hide: true,
			},
		},
		linkedinCallbackHandler
	);

	// Forgot password routes

	app.post(
		"/credentials/forgot",
		{
			schema: {
				tags: ["Auth"],
				summary: "Forgot password",
				description:
					"Send the user an email with a link to reset their password. The email will contain a deep link to the app, it will look like this: yakka://forgotPassword?token=token&userId=userId",
				body: forgotPasswordSchema,
				response: {
					200: defaultResponseSchema.describe(
						"Email sent. NOTE: We also send this response back even if the email does not exist, this is to prevent email enumeration attacks."
					),
				},
			},
		},
		forgotPasswordHandler
	);

	app.post(
		"/credentials/reset",
		{
			schema: {
				tags: ["Auth"],
				summary: "Reset password",
				description: "Reset the password of a user",
				body: resetPasswordSchema,
				response: {
					200: defaultResponseSchema.describe("Password reset successfully"),
					400: errorResponseSchema.describe("Invalid token"),
				},
			},
		},
		resetPasswordHandler
	);

	// Delete account routes
	app.delete(
		"/",
		{
			schema: {
				tags: ["Auth"],
				summary: "Delete account",
				description:
					"Delete the account of the currently logged in user, this will revoke all OAUTH tokens and app sessions",
				response: {
					200: defaultResponseSchema.describe("Account deleted successfully"),
				},
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			onRequest: app.authenticate,
		},
		deleteAccountHandler
	);

	app.post(
		"/facebook/deletion",
		{
			schema: {
				hide: true,
			},
		},
		facebookDeletionRequestHandler
	);

	app.delete(
		"/logout",
		{
			schema: {
				tags: ["Auth"],
				summary: "Logout",
				description:
					"Logout the currently logged in user, this will revoke their refresh token. The app must discard the refresh token and access token.",
				security: [
					{
						bearerAuth: [],
					},
				],
				response: {
					200: defaultResponseSchema.describe("Logged out successfully"),
				},
			},
			onRequest: app.authenticate,
		},
		logoutHandler
	);

	app.get(
		"/facebook/deletion/status",
		{
			schema: {
				hide: true,
			},
		},
		facebookDeletionStatus
	);

	done();
};

export default authRoutes;
