import { z } from "zod";
import * as dotenv from "dotenv";
dotenv.config();
const envSchema = z.object({
	HOST: z.string().default("0.0.0.0"),
	PORT: z.number().default(4000),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	BASE_URL: z.string().url(),
	APP_URL_SCHEME: z.string(),
	DATABASE_URL: z.string(),
	SHADOW_DATABASE_URL: z.string(),
	RESET_PASSWORD_TOKEN_SECRET: z.string(),
	ENCRYPTION_SECRET: z.string(),
	GOOGLE_IOS_CLIENT_ID: z.string(),
	GOOGLE_ANDROID_CLIENT_ID: z.string(),
	APPLE_CLIENT_ID: z.string(),
	APPLE_TEAM_ID: z.string(),
	APPLE_KEY_ID: z.string(),
	APPLE_CLIENT_SECRET: z.string(),
	FACEBOOK_APP_SECRET: z.string(),
	LINKEDIN_CLIENT_ID: z.string(),
	LINKEDIN_CLIENT_SECRET: z.string(),
	TWILIO_ACCOUNT_SID: z.string(),
	TWILIO_AUTH_TOKEN: z.string(),
	TWILIO_VERIFY_SID: z.string(),
	MAILJET_API_KEY: z.string(),
	MAILJET_API_SECRET: z.string(),
	S3_BUCKET_NAME: z.string(),
	S3_REGION: z.string(),
	S3_ACCESS_KEY: z.string(),
	S3_SECRET_KEY: z.string(),
	KEY_ENCRYPTION_KEY: z.string(),
	GOOGLE_MAPS_API_KEY: z.string(),
	MAX_USER_PHOTOS: z.coerce.number(),
	MIN_USER_PHOTOS: z.coerce.number(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error(
		"❌ Invalid environment variables:",
		JSON.stringify(parsed.error.format(), null, 4)
	);
	process.exit(1);
}

export default parsed.data;
