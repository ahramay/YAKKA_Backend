import { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import prisma from "../../utils/prisma";
import {
	AppleSignInSchema,
	CredentialsRegisterSchema,
	CredentialsSchema,
	FacebookSignInSchema,
	ForgotPasswordSchema,
	GoogleSignInSchema,
	LinkedinCallbackSchema,
	RefreshTokenSchema,
	RequestOtpSchema,
	ResetPasswordSchema,
	VerifyOtpSchema,
} from "./auth.schema";
import {
	createOauthState,
	createUser,
	decrypt,
	deleteSession,
	deleteUser,
	encrypt,
	findOauthState,
	findUserAccount,
	findUserByEmail,
	findUserById,
	generateAccessRefreshTokens,
	generateJWT,
	generateOTP,
	generateRefreshPasswordToken,
	revokeAppleToken,
	revokeFacebookToken,
	revokeGoogleToken,
	signAppleToken,
	updateUserAccount,
	validateAppleAuthCode,
	validateGoogleJWT,
	verifyResetPasswordToken,
} from "./auth.service";
import { isAfter } from "date-fns";
import crypto from "crypto";
import verifyAppleToken from "verify-apple-id-token";
import axios from "axios";
import sendMail from "../../utils/mail";
import config from "../../utils/config";
import { compareHash, generateHash } from "../../utils/bcrypt";
import { JWTUser } from "../../utils/plugins/jwt";
import { nanoid } from "nanoid";
import { generateDeepLink } from "../../utils/deeplink";
import { sendSMSVerification, verifySMSCode } from "../../utils/twilio";

export const credentialsSignuphandler = async (
	request: FastifyRequest<{
		Body: CredentialsSchema;
	}>,
	reply: FastifyReply
) => {
	const { email, password } = request.body;

	try {
		const existingUser = await findUserByEmail(email);

		if (existingUser) {
			return reply.code(409).send({
				message: "User already exists",
			});
		}

		const hashedPassword = await generateHash(password);

		const user = await createUser({
			email,
			account: {
				create: {
					authType: "CREDENTIALS",
					password: hashedPassword,
				},
			},
		});

		return await generateAccessRefreshTokens({
			req: request,
			reply,
			payload: {
				id: user.id,
				email: user.email,
				phoneVerified: false,
			},
		});
	} catch (error) {
		// Handle specific errors here, rethrow the error to catch it in the global hander
		throw error;
	}
};

export const credentialsLoginHandler = async (
	request: FastifyRequest<{
		Body: CredentialsSchema;
	}>,
	reply: FastifyReply
) => {
	// This route is used to login a user using their credentials or create a new user if they don't exist

	const { email, password } = request.body;
	try {
		request.log.info("Attempting to login user");
		const existingUser = await findUserByEmail(email);
		request.log.info(existingUser);

		if (existingUser && existingUser.account?.authType !== "CREDENTIALS") {
			return reply.code(409).send({
				message: "You have not registered with credentials",
			});
		}
		let user;
		if (!existingUser) {
			return reply.code(404).send({
				message: "User not found",
			});
		}
		const passwordsMatch = await compareHash(
			password,
			existingUser.account?.password!
		);

		if (!passwordsMatch) {
			return reply.code(400).send({
				message: "Your username or password is incorrect",
			});
		}

		user = existingUser;

		return await generateAccessRefreshTokens({
			req: request,
			reply,
			payload: {
				id: user.id,
				email: user.email || undefined,
				phoneVerified: user.phoneVerified,
				firstName: existingUser ? existingUser.firstName : undefined,
			},
		});
	} catch (error) {
		// Handle specific errors here, rethrow the error to catch it in the global hander
		throw error;
	}
};

// OTP
export const verifyOtpHandler = async (
	request: FastifyRequest<{
		Body: VerifyOtpSchema;
	}>,
	reply: FastifyReply
) => {
	const { otp } = request.body;

	const user = await prisma.user.findUnique({
		where: {
			id: request.user.id,
		},
	});

	// Check if user exists
	if (!user) {
		return reply.status(404).send({
			message: "User not found",
		});
	}

	if (user.phoneVerified) {
		return reply.status(403).send({
			message: "Phone number already verified",
		});
	}

	// Compare OTP
	const isValid = await verifySMSCode({
		to: `${user.phoneCountryCode}${user.phoneNumber}`,
		code: otp,
	});

	if (!isValid) {
		return reply.status(400).send({
			message: "SMS verification failed",
		});
	}

	// Update user
	const updatedUser = await prisma.user.update({
		where: {
			id: user.id,
		},
		data: {
			phoneVerified: true,
		},
	});

	return {
		message: "Phone number verified",
	};
};

export const requestNewOtpHandler = async (
	request: FastifyRequest<{
		Body: RequestOtpSchema;
	}>,
	reply: FastifyReply
) => {
	const { phoneNumber, phoneCountryCode } = request.body;

	// Generate and hash OTP

	try {
		const user = await prisma.user.findUnique({
			where: {
				id: request.user.id,
			},
		});

		// If we have no user or the user is already verified
		if (!user) {
			return reply.status(404).send({
				message: "User not found",
			});
		}

		if (user.phoneVerified) {
			return reply.status(403).send({
				message: "Phone number already verified",
			});
		}

		// Update user
		await prisma.user.update({
			where: {
				id: user.id,
			},
			data: {
				phoneCountryCode,
				// phoneVerificationCode: hashedOtp,
				phoneNumber,
				// phoneVerificationCodeExpiry: expiresAt,
				phoneVerified: false,
			},
		});

		const verification = await sendSMSVerification({
			to: `${phoneCountryCode}${phoneNumber}`,
		});

		if (verification.status !== "pending") {
			return reply.status(500).send({
				message: "An error occurred while sending the OTP",
			});
		}

		return reply.status(200).send({
			message: "An OTP has been sent to your phone number",
		});
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError) {
			if (e.code === "P2002") {
				return reply.status(409).send({
					message: "Phone number already in use",
				});
			}
		}
		throw e;
	}
};

export const refreshTokenHandler = async (
	request: FastifyRequest<{
		Body: RefreshTokenSchema;
	}>,
	reply: FastifyReply
) => {
	const { refreshToken } = request.body;

	try {
		const payload = request.jwt.verify<JWTUser>(refreshToken);

		if (!payload.sessionId) {
			throw new Error("Session not found");
		}
		const session = await prisma.session.findUnique({
			where: {
				id: payload.sessionId,
			},
			include: {
				user: true,
			},
		});

		if (!session) {
			throw new Error("Session not found");
		}
		// Invalidate old refresh token
		await deleteSession(session.id);

		return await generateAccessRefreshTokens({
			noReply: true,
			req: request,
			reply,
			payload: {
				id: session.userId,
				phoneVerified: session.user.phoneVerified,
			},
		});
	} catch (error) {
		return reply.status(401).send({
			message: "Please login again",
		});
	}
};

// OAUTH

export const googleSignInHandler = async (
	request: FastifyRequest<{
		Body: GoogleSignInSchema;
	}>,
	reply: FastifyReply
) => {
	try {
		const { idToken, refreshToken } = request.body;
		let userInfo;
		try {
			userInfo = await validateGoogleJWT(idToken);
		} catch (error) {
			return reply.code(400).send({
				message: "Invalid token",
			});
		}

		if (!userInfo || !userInfo.email) {
			return reply.code(400).send({
				message: "Invalid token",
			});
		}

		if (!userInfo.email_verified) {
			return reply.code(400).send({
				message: "Please verify your email with Google",
			});
		}

		// Check if the user exists in the database
		const existingUser = await findUserByEmail(userInfo.email);

		if (existingUser && existingUser.account?.authType !== "GOOGLE") {
			return reply.code(409).send({
				message: "You have already signed up with a different provider",
			});
		}

		// If the user does exist, update their refresh token
		// If not, create them
		const encryptedRefreshToken = await encrypt(refreshToken);
		const user = await prisma.user.upsert({
			where: {
				email: userInfo.email,
			},
			update: {
				account: {
					update: {
						refreshToken: encryptedRefreshToken,
					},
				},
			},
			create: {
				email: userInfo.email,
				firstName: userInfo.given_name,
				lastName: userInfo.family_name,
				account: {
					create: {
						authType: "GOOGLE",
						providerAccountId: userInfo.sub,
						refreshToken: encryptedRefreshToken,
					},
				},
			},
		});

		// Generate a JWT for the user

		const tokens = await generateAccessRefreshTokens({
			req: request,
			reply,
			payload: {
				id: user.id,
				email: user.email,
				phoneVerified: user.phoneVerified,
			},
			noReply: true,
		});

		return {
			...tokens,
			isNewUser: !existingUser,
		};
	} catch (error) {
		throw error;
	}
};

export const appleSignInHandler = async (
	request: FastifyRequest<{
		Body: AppleSignInSchema;
	}>,
	reply: FastifyReply
) => {
	// https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/authenticating_users_with_sign_in_with_apple
	// The app uses https://docs.expo.dev/versions/latest/sdk/apple-authentication/
	// to do the whole client side flow and retrives the id_token and auth_code
	// note: we actually retrieve the id_token again here because we also want the refresh_token
	// so we can revoke access later

	try {
		const { authToken, firstName, lastName } = request.body;

		// generate a client secret so we can use it to validate the auth code and id token
		const appleClientSecret = await signAppleToken();
		const { id_token, refresh_token } = await validateAppleAuthCode(
			authToken,
			appleClientSecret
		).catch(() => {
			// invalid token
			throw new Error("invalid");
		});
		const userInfo = await verifyAppleToken({
			idToken: id_token,
			clientId: config.APPLE_CLIENT_ID,
		});

		if (!userInfo || !userInfo.email) {
			throw new Error("invalid");
		}

		// Token is valid

		// Check that the user has verified their email
		if (!userInfo.email_verified) {
			throw new Error("unverified");
		}

		// Check if the user exists in the database

		const existingUser = await findUserByEmail(userInfo.email);

		if (existingUser && existingUser.account?.authType !== "APPLE") {
			return reply.code(409).send({
				message: "You have already signed up with a different provider",
			});
		}

		// If the user does exist, update their refresh token
		// If not, create them
		const encryptedRefreshToken = await encrypt(refresh_token);
		const user = await prisma.user.upsert({
			where: {
				email: userInfo.email,
			},
			update: {
				account: {
					update: {
						refreshToken: encryptedRefreshToken,
					},
				},
			},
			create: {
				firstName,
				lastName,
				email: userInfo.email,
				account: {
					create: {
						authType: "APPLE",
						refreshToken: encryptedRefreshToken,
						providerAccountId: userInfo.sub,
					},
				},
			},
		});

		// Generate a JWT for the user

		const tokens = await generateAccessRefreshTokens({
			req: request,
			reply,
			payload: {
				id: user.id,
				email: user.email,
				phoneVerified: user.phoneVerified,
			},
			noReply: true,
		});

		return {
			...tokens,
			isNewUser: !existingUser,
		};
	} catch (error: any) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// With apple, the user can choose not to send their email address
			// Which means if we are not careful we can end up with multiple accounts
			// For the same user. However, we also store the user's apple id in the account
			// So in this case Prisma will throw an error as it violates our unique constraint
			if (error.code === "P2002") {
				return reply.code(409).send({
					message: "You have already signed up",
				});
			}
		}
		if (error?.message === "invalid") {
			return reply.code(400).send({
				message: "Invalid token",
			});
		}
		if (error?.message === "unverified") {
			return reply.code(400).send({
				message: "Please verify your email address with Apple",
			});
		}
		if (error) request.log.error(error);
		return reply.code(500).send({
			message: "Something went wrong",
		});
	}
};

export const facebookSignInHandler = async (
	request: FastifyRequest<{
		Body: FacebookSignInSchema;
	}>,
	reply: FastifyReply
) => {
	try {
		const { accessToken } = request.body;
		const { data: userInfo } = await axios({
			url: "https://graph.facebook.com/me",
			method: "get",
			params: {
				fields: ["id", "email", "first_name", "last_name"].join(","),
				access_token: accessToken,
			},
		});

		// Token is valid
		// Facebook's email won't be returned if it's not verified

		if (!userInfo || !userInfo.email) {
			return reply.code(400).send({
				message: "Invalid token",
			});
		}

		// Encrypt the access token so we can store it in the database
		// We will use this to revoke access later

		// Check if the user exists in the database

		const existingUser = await findUserByEmail(userInfo.email);

		if (existingUser && existingUser.account?.authType !== "FACEBOOK") {
			return reply.code(409).send({
				message: "You have already signed up with a different provider",
			});
		}

		// If the user does exist, update their access token
		// If not, create them
		const encryptedAccessToken = await encrypt(accessToken);

		const user = await prisma.user.upsert({
			where: {
				email: userInfo.email,
			},
			update: {
				account: {
					update: {
						accessToken: encryptedAccessToken,
					},
				},
			},
			create: {
				firstName: userInfo.first_name,
				lastName: userInfo.last_name,
				email: userInfo.email,
				account: {
					create: {
						authType: "FACEBOOK",
						accessToken: encryptedAccessToken,
						providerAccountId: userInfo.id,
					},
				},
			},
		});

		// Generate a JWT for the user

		const tokens = await generateAccessRefreshTokens({
			noReply: true,
			req: request,
			reply,
			payload: {
				id: user.id,
				email: user.email,
				phoneVerified: user.phoneVerified,
			},
		});

		return {
			...tokens,
			isNewUser: !existingUser,
		};
	} catch (error) {
		return reply.code(500).send({
			message: "Something went wrong",
		});
	}
};

export const getLinkedinLoginUrlHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	// Generate a random string for the state parameter
	// To mitigate CSRF attacks
	const state = nanoid();
	const stateToken = request.jwt.sign(
		{
			state: state,
		},
		{
			expiresIn: "30m", //linkedins authorization code also expires in 30 minutes
		}
	);

	// Save the state token in the database
	// So we can verify it when the user is redirected back to our app

	await createOauthState({
		state,
	});
	const rootUrl = "https://www.linkedin.com/oauth/v2/authorization";
	const options = {
		response_type: "code",
		client_id: config.LINKEDIN_CLIENT_ID,
		redirect_uri: config.BASE_URL + "/auth/linkedin/callback",
		state: stateToken,
		scope: ["r_liteprofile", "r_emailaddress"].join(" "),
	};

	const qs = new URLSearchParams(options).toString();

	const url = `${rootUrl}?${qs}`;
	return {
		url,
		redirectUrl: config.BASE_URL + "/auth/linkedin/callback",
	};
};

export const linkedinCallbackHandler = async (
	request: FastifyRequest<{
		Querystring: LinkedinCallbackSchema;
	}>,
	reply: FastifyReply
) => {
	try {
		const { code, state } = request.query;

		// Verify the state parameter
		let token;
		let validState;
		try {
			token = request.jwt.verify<{
				state: string;
			}>(state);
			validState = await prisma.oauthState.delete({
				where: {
					state: token.state,
				},
			});
		} catch {
			throw new Error("invalid");
		}

		if (!validState) {
			throw new Error("invalid");
		}

		// Exchange the code for an access token

		const { data: accessTokenResponse } = await axios({
			url: "https://www.linkedin.com/oauth/v2/accessToken",
			method: "POST",
			params: {
				client_id: config.LINKEDIN_CLIENT_ID,
				client_secret: config.LINKEDIN_CLIENT_SECRET,
				grant_type: "authorization_code",
				redirect_uri: config.BASE_URL + "/auth/linkedin/callback",
				code,
			},
		});

		// Get the user's profile

		// console.log(qs);
		const { data: profile } = await axios({
			url: "https://api.linkedin.com/v2/me",
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessTokenResponse.access_token}`,
			},
			// params: qs.toString(),
		});

		// Get the user's email address

		const { data: email } = await axios({
			url: "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessTokenResponse.access_token}`,
			},
		});

		// Check if the user exists in the database

		const existingUser = await findUserByEmail(
			email.elements[0]["handle~"].emailAddress
		);

		if (existingUser && existingUser.account?.authType !== "LINKEDIN") {
			throw new Error("conflict");
		}

		// If the user does exist, update their access token

		// If not, create them

		const encryptedAccessToken = await encrypt(
			accessTokenResponse.access_token
		);

		const user = await prisma.user.upsert({
			where: {
				email: email.elements[0]["handle~"].emailAddress,
			},
			update: {
				account: {
					update: {
						accessToken: accessTokenResponse.access_token,
					},
				},
			},
			create: {
				firstName: profile.localizedFirstName,
				lastName: profile.localizedLastName,
				email: email.elements[0]["handle~"].emailAddress,
				account: {
					create: {
						authType: "LINKEDIN",
						accessToken: encryptedAccessToken,
						providerAccountId: profile.id,
					},
				},
			},
		});

		// Generate a JWT for the user

		const tokens = await generateAccessRefreshTokens({
			req: request,
			reply,
			payload: {
				id: user.id,
				email: user.email!,
				phoneVerified: user.phoneVerified,
			},
			noReply: true,
		});

		// Deeplink the user back to the app

		const redirectUrl = generateDeepLink("authRedirect", {
			...tokens,
			isNewUser: !existingUser,
		});

		return reply.redirect(redirectUrl);
	} catch (error: any) {
		// We need to deeplink the user back to the app with an error
		let message = "Something went wrong";
		if (error.message === "invalid") {
			message = "Invalid link, please try again";
		} else if (error.message === "conflict") {
			message = "Email already in use";
		}
		const redirectUrl = generateDeepLink("authRedirect", {
			error: error.message,
		});

		return reply.redirect(redirectUrl);
	}
};

// Forgot password

export const forgotPasswordHandler = async (
	request: FastifyRequest<{
		Body: ForgotPasswordSchema;
	}>,
	reply: FastifyReply
) => {
	try {
		console.log("forgot password");
		const { email } = request.body;

		// 1. Check if this user exists

		const user = await findUserByEmail(email);

		// If the user doesn't exist, return a 200 response anyway
		// This is to prevent people from using this endpoint to find out if a user exists or not

		if (!user) {
			throw new Error("notfound");
		}

		// 2. Check if user actually has a password

		if (
			user.account?.authType !== "CREDENTIALS" ||
			!user.account?.password ||
			!user.email
		) {
			throw new Error("notfound");
		}

		// 3. Create a one time link that expires in 15 minutes

		// We use the user's hashed password as the key for the JWT
		// This way, if the user changes their password, the JWT will be invalidated
		const token = await generateRefreshPasswordToken({
			id: user.id,
			email: user.email,
			key: user.account.password,
		});

		// 4. Send an email with the link
		const name =
			user.firstName === null
				? "YAKKA User"
				: `${user.firstName} ${user.lastName ?? ""}`;
		await sendMail({
			to: {
				name: name,
				email: user.email,
			},
			button: {
				text: "Reset Password",
				link: `${config.BASE_URL}/redirect?routeName=resetPassword&token=${token}&userId=${user.id}`,
			},
			subject: "Forgot Password",
			title: "Forgot your password?",
			body: `No worries, it happens! Please click the link below to reset your password.`,
		});
		return reply.code(200).send({
			message: "If this email exists, you will receive an email shortly",
			token,
			userId: user.id,
		});
	} catch (e: any) {
		if (e.message === "notfound") {
			// Wait for random time so that it takes similar amount of time to respond
			await new Promise(resolve =>
				setTimeout(resolve, Math.floor(Math.random() * 60) + 30)
			);
			return reply.code(200).send({
				message: "If this email exists, you will receive an email shortly",
			});
		}

		throw e;
	}
};

export const resetPasswordHandler = async (
	request: FastifyRequest<{
		Body: ResetPasswordSchema;
	}>,
	reply: FastifyReply
) => {
	try {
		const { newPassword, token, userId } = request.body;

		// 1. Check if user exists
		const user = await findUserById(userId);

		if (!user || !user.account?.password) {
			throw new Error("invalid");
		}

		// 2. Verify the token

		const decoded = await verifyResetPasswordToken({
			token,
			key: user.account.password,
		}).catch(() => {
			throw new Error("invalid");
		});

		// 3. Update the password
		const hashedPassword = await generateHash(newPassword);

		await updateUserAccount(user.account.id, {
			password: hashedPassword,
		});

		return reply.code(200).send({
			message: "Password updated",
		});
	} catch (error: any) {
		if (error.message === "invalid") {
			return reply.code(400).send({
				message: "Invalid reset password link",
			});
		}
		throw error;
	}
};

// Delete account handlers

export const deleteAccountHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const { id } = request.user;
	let user;
	try {
		// Deleting the account will also cascade and delete sessions / profile / etc
		user = await deleteUser(Number(id));
	} catch {
		return reply.code(500).send({
			message: "An error occured while deleting your account",
		});
	}

	try {
		// Revoke all OAUTH tokens
		if (user.account?.refreshToken) {
			const decryptedRefreshToken = await decrypt(user.account.refreshToken);
			if (user.account.authType === "APPLE") {
				const clientSecret = await signAppleToken();
				await revokeAppleToken(decryptedRefreshToken, clientSecret);
			}

			if (user.account.authType === "GOOGLE") {
				await revokeGoogleToken(decryptedRefreshToken);
			}
		}
		if (user.account?.accessToken) {
			const decryptedAccessToken = await decrypt(user.account.accessToken);
			if (user.account.authType === "FACEBOOK") {
				await revokeFacebookToken(
					decryptedAccessToken,
					user.account.providerAccountId!
				);
			}
		}

		return reply.code(200).send({
			message: "Account deleted",
		});
	} catch (error: any) {
		request.log.error(error);
		return reply.code(500).send({
			message: "Something went while revoking Social Sign in access",
		});
	}
};

export const facebookDeletionRequestHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	// Parse url encoded body
	// @ts-ignore
	const signedRequest = request.body.signed_request;
	const [encodedSignature, payload] = signedRequest.split(".", 2);
	if (!encodedSignature || !payload) {
		return reply.code(400).send({
			message: "Signed request has invalid format",
		});
	}
	//  decode base64 url
	const signature = Buffer.from(encodedSignature, "base64").toString("utf8");

	const expectedSignature = crypto
		.createHmac("sha256", config.FACEBOOK_APP_SECRET)
		.update(payload)
		.digest("base64");

	if (signature !== expectedSignature) {
		return reply.code(400).send({
			message: "Invalid signature",
		});
	}

	const data = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));

	if (data.algorithm !== "HMAC-SHA256") {
		return reply.code(400).send({
			message: "Invalid algorithm",
		});
	}

	const { user_id } = data;

	if (!user_id) {
		return reply.code(400).send({
			message: "Invalid payload",
		});
	}

	const userAccount = await findUserAccount({
		authType: "FACEBOOK",
		providerAccountId: user_id,
	});

	if (!userAccount) {
		return reply.code(400).send({
			message: "Invalid user",
		});
	}

	await deleteUser(userAccount.user.id);
	const confirmationCode = userAccount.user.id;

	const url = `${config.BASE_URL}/auth/facebook/deletion/status?code=${confirmationCode}`;
	// Facebook requires the JSON to be non-quoted and formatted like this, so we need to create the JSON by hand:
	return reply
		.type("json")
		.send(`{url: '${url}', confirmation_code: '${confirmationCode}'}`);
};

export const logoutHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const { sessionId } = request.user;
	try {
		console.log("Logging out", sessionId);
		// Deleting the session will invalidate the refresh token
		await prisma.session.delete({
			where: {
				id: sessionId,
			},
		});
		// Delete the push notification token so they don't get notified while logged out
		await prisma.user.update({
			where: {
				id: request.user.id,
			},
			data: {
				pushNotificationToken: null,
			},
		});
		return reply.code(200).send({
			message: "Logged out",
		});
	} catch (e) {
		throw e;
	}
};

export const facebookDeletionStatus = async (
	request: FastifyRequest<{
		Querystring: {
			code: string;
		};
	}>,
	reply: FastifyReply
) => {
	try {
		// Facebook requires us to show a confirmation page with a confirmation code
		// We use the user id as the confirmation code
		// And check if the user still exists
		const { code } = request.query;
		reply.type("text/html");

		if (!code) {
			return reply.send(`Invalid code`);
		}

		const userAccount = await findUserAccount({
			authType: "FACEBOOK",
			providerAccountId: code,
		});

		// if user render html saying deletion in progress
		if (userAccount) {
			return reply.send(`
      <html>
        <head>
          <title>Deletion in progress</title>
        </head>
        <body>
          <h1>Deletion in progress</h1>
          <p>Your account is being deleted. This may take a few minutes.</p>
        </body>
      </html>
    `);
		}
		// else render html saying deletion complete
		return reply.send(`
    <html>
      <head>
        <title>Deletion complete</title>
      </head>
      <body>
        <h1>Deletion complete</h1>
        <p>Your account has been deleted.</p>
      </body>
    </html>
  `);
	} catch {
		return reply.send(`
          <html>
            <head>
              <title>Something went wrong</title>
            </head>
            <body>
              <h1>Something went wrong</h1>
              <p>Something went wrong, please try again later.</p>
            </body>
          </html>
        `);
	}
};
