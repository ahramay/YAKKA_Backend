import { Prisma } from "@prisma/client";
import { add } from "date-fns";
import { FastifyRequest, FastifyReply } from "fastify";
import otpGenerator from "otp-generator";
import { JwtInputSchema, JwtSchema } from "./auth.schema";
import { getUnixTime } from "date-fns";
import prisma from "../../utils/prisma";
import { OAuth2Client } from "google-auth-library";
import * as jwt from "jsonwebtoken";
import axios from "axios";
import config from "../../utils/config";
import { createCipheriv, randomBytes, createDecipheriv } from "crypto";
import { generateHash } from "../../utils/bcrypt";
import { userInfo } from "os";

// DB Calls

export const findUserByEmail = async (email: string) => {
	return await prisma.user.findUnique({
		where: {
			email,
		},
		include: {
			account: true,
		},
	});
};

export const findUserById = async (id: number) => {
	return prisma.user.findUnique({
		where: {
			id,
		},
		include: {
			account: true,
		},
	});
};

export const findUserAccount = async ({
	authType,
	providerAccountId,
}: Prisma.UserAccountAuthTypeProviderAccountIdCompoundUniqueInput) => {
	return prisma.userAccount.findUnique({
		where: {
			authType_providerAccountId: {
				authType,
				providerAccountId,
			},
		},
		include: {
			user: true,
		},
	});
};

export const createUser = async (params: Prisma.UserCreateInput) => {
	return prisma.user.create({
		data: params,

		select: {
			id: true,
			email: true,
			phoneVerified: true,
		},
	});
};

export const updateUserAccount = async (
	id: number,
	data: Prisma.UserAccountUpdateArgs["data"]
) => {
	return prisma.userAccount.update({
		where: {
			id,
		},
		data,
	});
};

export const deleteSession = async (sessionId: number) => {
	return prisma.session.delete({
		where: {
			id: sessionId,
		},
	});
};

export const deleteUser = async (id: number) => {
	return prisma.user.delete({
		where: {
			id,
		},
		include: {
			account: true,
		},
	});
};

export const updateUser = async (id: number, data: object) => {
	return prisma.user.update({
		where: {
			id,
		},
		data: {},
	});
};

export const createOauthState = async (data: Prisma.OauthStateCreateInput) => {
	return prisma.oauthState.create({
		data,
	});
};

export const findOauthState = async (state: string) => {
	return prisma.oauthState.findUnique({
		where: {
			state,
		},
	});
};

interface JWTParams {
	req: FastifyRequest;
	expiresIn?: "5m" | "15m" | "1h" | "4h" | "1y";
	payload: object;
}

export const generateJWT = ({ req, payload, expiresIn = "1h" }: JWTParams) => {
	return req.jwt.sign(payload, {
		expiresIn,
	});
};

interface AccessTokenParams extends Omit<JWTParams, "expiresIn"> {
	reply: FastifyReply;
	payload: JwtSchema;
	responseCode?: 200 | 201;
	noReply?: boolean;
}

export const generateAccessRefreshTokens = async ({
	req,
	reply,
	payload,
	responseCode = 200,
	noReply = false,
}: AccessTokenParams) => {
	// Generate refresh and access tokens
	// Store the encrypted refresh token in the db
	// Respond with the tokens
	// Create new session

	// Check if banned
console.log("Before Ban")
	const user = await prisma.user.findUnique({
		where: {
			id: payload.id,
		},
		select: {
			isBanned: true,
		},
	});

	if (!user) {
		return reply.code(404).send({
			message: "User not found",
		});
	}

	if (user.isBanned) {
		return reply.code(403).send({
			message: "You are banned",
		});
	}

	const session = await prisma.session.create({
		data: {
			userId: payload.id,
		},
	});

	console.log("After Session")
	const accessToken = generateJWT({
		req,
		payload: {
			...payload,

			sessionId: session.id,
		},
		expiresIn: config.NODE_ENV === "development" ? "4h" : "15m",
	});
	const refreshToken = generateJWT({
		req,
		payload: {
			sessionId: session.id,
		},
		expiresIn: "1y",
	});

	if (noReply) {
		return {
			accessToken,
			refreshToken,
		};
	}

	return reply.code(responseCode).send({
		accessToken,
		refreshToken,
	});
};

export const generateOTP = async () => {
	const otp = otpGenerator.generate(6, {
		lowerCaseAlphabets: false,
		specialChars: false,
		upperCaseAlphabets: false,
	});
	const hashedOtp = await generateHash(otp);
	const expiresAt = add(new Date(), { minutes: 15 });

	return { otp, hashedOtp, expiresAt };
};

// OAUTH Helpers

export const validateGoogleJWT = async (idToken: string) => {
	const client = new OAuth2Client(config.GOOGLE_IOS_CLIENT_ID);

	const ticket = await client.verifyIdToken({
		idToken,
		audience: [config.GOOGLE_IOS_CLIENT_ID, config.GOOGLE_ANDROID_CLIENT_ID], // Specify the CLIENT_ID of the app that accesses the backend
	});
	const payload = ticket.getPayload();

	return payload;
};
export const revokeGoogleToken = async (token: string) => {
	try {
		const client = new OAuth2Client(config.GOOGLE_IOS_CLIENT_ID);

		await client.revokeToken(token);
	} catch (error) {}
};

export const validateAppleAuthCode = async (
	authCode: string,
	appleClientSecret: string
) => {
	const headers = {
		"Content-Type": "application/x-www-form-urlencoded",
	};

	// Get refresh token from authorization code
	const authTokenBody = new URLSearchParams({
		client_id: config.APPLE_CLIENT_ID,
		client_secret: appleClientSecret,
		code: authCode,
		grant_type: "authorization_code",
	});

	const authTokenResponse = await axios.post(
		"https://appleid.apple.com/auth/token",
		authTokenBody,
		{ headers }
	);

	const { id_token, refresh_token } = authTokenResponse.data;

	return { id_token, refresh_token };
};

// *
// * Sign a JWT as per Apple's guidelines
// * https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
export const signAppleToken = async () => {
	// Apple requires a JWT to be signed with a private key
	// NOTE: I'm using the jsonwebtokens package here
	// Because I need to provide the apple private key as a string

	const clientSecretJwt = jwt.sign(
		{
			iss: config.APPLE_TEAM_ID, //NOTE: You get this by going to developer.apple.com > Account > Membership
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 12000,
			aud: "https://appleid.apple.com",
			sub: config.APPLE_CLIENT_ID, //NOTE: Your apple client ID is just the bundle id of the app
		},
		config.APPLE_CLIENT_SECRET!.replace(/\\n/g, "\n"),
		// NOTE: The private key is provided as a string with \n characters hence the weird replace
		// You get this by going to developer.apple.com > Certificates, Identifiers & Profiles > Keys
		// Then generate a new key for apple sign in and select the app.
		// Then download is a .p8 and copy the contents to the .env
		// You only get to download it once
		{
			algorithm: "ES256",
			header: {
				alg: "ES256",
				kid: config.APPLE_KEY_ID, // Key ID from apple sign in key - literally in the name of the file it downloads if you can't find it
			},
		}
	);
	return clientSecretJwt;
};

export const revokeAppleToken = async (
	token: string,
	appleClientSecret: string
) => {
	const headers = {
		"Content-Type": "application/x-www-form-urlencoded",
	};

	// Revoke token
	const revokeTokenBody = new URLSearchParams({
		client_id: config.APPLE_CLIENT_ID,
		client_secret: appleClientSecret,
		token: token,
		token_type_hint: "refresh_token",
	});

	const res = await axios.post(
		"https://appleid.apple.com/auth/revoke",
		revokeTokenBody,
		{
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		}
	);

	if (res.status != 200) {
		throw new Error(res.statusText);
	}
};

export const revokeFacebookToken = async (token: string, accountId: string) => {
	// https://developers.facebook.com/docs/facebook-login/guides/permissions/request-revoke/
	const data = await axios({
		url: "https://graph.facebook.com/" + accountId + "/permissions",
		method: "delete",
		params: {
			access_token: token,
		},
	});
};

// export const

interface GenerateRefreshTokenParams extends JwtInputSchema {
	key: string;
}

export const generateRefreshPasswordToken = async ({
	id,
	key,
	email,
}: GenerateRefreshTokenParams) => {
	const token = await jwt.sign(
		{ id, email },
		`${config.RESET_PASSWORD_TOKEN_SECRET}${key}`,
		{
			algorithm: "HS256",
			expiresIn: "15m",
		}
	);
	return token;
};
interface VerifyRefreshTokenParams {
	token: string;
	key: string;
}
export const verifyResetPasswordToken = async ({
	key,
	token,
}: VerifyRefreshTokenParams) => {
	const decoded = jwt.verify(
		token,
		`${config.RESET_PASSWORD_TOKEN_SECRET}${key}`
	);
	return decoded;
};

export const encrypt = async (text: string) => {
	const iv = randomBytes(16);

	const cipher = createCipheriv("aes-256-cbc", config.ENCRYPTION_SECRET, iv);

	const encryptedString =
		cipher.update(text, "utf8", "hex") + cipher.final("hex");

	return iv.toString("hex") + ":" + encryptedString;
};

export const decrypt = async (text: string) => {
	const textParts = text.split(":");
	const iv = Buffer.from(textParts.shift() as string, "hex");
	const encryptedText = Buffer.from(textParts.join(":"), "hex");
	const decipher = createDecipheriv(
		"aes-256-cbc",
		config.ENCRYPTION_SECRET,
		iv
	);
	const decrypted = decipher.update(encryptedText) + decipher.final("utf-8");
	return decrypted;
};
