import { z } from "zod";

// OTP schemas
export const requestOtpSchema = z.object({
	phoneNumber: z.string(),
	phoneCountryCode: z.string(),
});
export type RequestOtpSchema = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
	otp: z.string(),
});
export type VerifyOtpSchema = z.infer<typeof verifyOtpSchema>;

// Credentials schemas
export const credentialsSchema = z.object({
	email: z.string().email(),
	password: z.string(),
});
export type CredentialsSchema = z.infer<typeof credentialsSchema>;

export const credentialsRegisterSchema =
	credentialsSchema.merge(requestOtpSchema);
export type CredentialsRegisterSchema = z.infer<
	typeof credentialsRegisterSchema
>;

const jwtInputSchema = z.object({
	id: z.number(),
	email: z.string().email().nullish(),
	firstName: z.string().nullish(),
});
export type JwtInputSchema = z.infer<typeof jwtInputSchema>;

export const jwtSchema = jwtInputSchema.extend({
	phoneVerified: z.boolean().default(false),
});
export type JwtSchema = z.infer<typeof jwtSchema>;

export const refreshTokenSchema = z.object({
	refreshToken: z.string(),
});
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;

export const signinResponseSchema = z.object({
	accessToken: z.string(),
	refreshToken: z.string(),
	isNewUser: z.boolean(),
});

export const credentialsSignInResponseSchema = signinResponseSchema.omit({
	isNewUser: true,
});

// OAUTH schemas
export const googleSignInSchema = z.object({
	idToken: z.string(),
	refreshToken: z.string(),
});
export type GoogleSignInSchema = z.infer<typeof googleSignInSchema>;

export const appleSignInSchema = z.object({
	authToken: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
});
export type AppleSignInSchema = z.infer<typeof appleSignInSchema>;

export const facebookSignInSchema = z.object({
	accessToken: z.string(),
});
export type FacebookSignInSchema = z.infer<typeof facebookSignInSchema>;

export const linkedinLoginUrlResponseSchema = z.object({
	url: z.string().url(),
	redirectUrl: z.string().url(),
});

export const linkedinCallbackSchema = z.object({
	code: z.string(),
	state: z.string(),
});
export type LinkedinCallbackSchema = z.infer<typeof linkedinCallbackSchema>;

// Forgot password schemas
export const forgotPasswordSchema = z.object({
	email: z.string().email(),
});
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
	newPassword: z.string().min(8),
	token: z.string(),
	userId: z.number(),
});
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
