import { z } from "zod";

export const defaultResponseSchema = z.object({
	message: z.string(),
});

export const errorResponseSchema = defaultResponseSchema.extend({
	errorCode: z.string().optional(),
});

export const securitySchema = {
	security: [
		{
			bearerAuth: [],
		},
	],
};

export const userParamsSchema = z.object({
	// userId comes in as string, but is converted to number
	userId: z.string().transform(arg => Number(arg)),
});
export type UserParams = z.infer<typeof userParamsSchema>;

export const lazyLoadSchema = z.object({
	limit: z
		.string()
		.default("12")
		.transform(s => Number(s))
		.refine(n => n > 1, {
			message: "Limit must be greater than 1",
		}),
	page: z
		.string()
		.default("0")
		.transform(s => Number(s))
		.refine(n => n >= 0, {
			message: "Page must be greater than or equal to 0",
		}),
});
export type LazyLoad = z.infer<typeof lazyLoadSchema>;

export const lazyLoadResponseSchema = z.object({
	nextPage: z.number().nullish(),
});

export const coordinatesSchema = z.object({
	latitude: z.number().transform(lat => Number(lat.toFixed(6))),
	longitude: z.number().transform(lng => Number(lng.toFixed(6))),
});

export const inviteResponseSchema = z.object({
	message: z.string(),
	inviteId: z.number(),
});
