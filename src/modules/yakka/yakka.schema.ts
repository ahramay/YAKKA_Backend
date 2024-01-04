import { RequestStatus } from "@prisma/client";
import { z } from "zod";
import {
	coordinatesSchema,
	lazyLoadResponseSchema,
} from "../../types/globalSchemas";
import { basicProfileSchema } from "../user/user.schema";

const yakkaBaseSchema = z.object({
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
		.transform(date => new Date(date))
		.refine(date => date > new Date(), {
			message: "YAKKA date must be in the future",
		}),
	endTime: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
		.transform(date => new Date(date))
		.refine(date => date > new Date(), {
			message: "YAKKA date must be in the future",
		}),
	coordinates: coordinatesSchema,
	locationName: z.string(),
	inviteeId: z.number(),
});

export const createYakkaInputSchema = yakkaBaseSchema;
export type CreateYakka = z.infer<typeof createYakkaInputSchema>;

export const updateYakkaInputSchema = createYakkaInputSchema
	.partial()
	.omit({ inviteeId: true });
export type UpdateYakka = z.infer<typeof updateYakkaInputSchema>;

export const yakkaParamsSchema = z.object({
	yakkaId: z.string().transform(id => Number(id)),
});
export type YakkaParams = z.infer<typeof yakkaParamsSchema>;

export const yakkaResponseInputSchema = z.object({
	accept: z.boolean(),
});
export type YakkaResponse = z.infer<typeof yakkaResponseInputSchema>;

const yakkaSchema = z.object({
	id: z.number(),
	startTimestamp: z.date(),
	endTimestamp: z.date(),
	attendee: basicProfileSchema,
	status: z.enum([
		RequestStatus.ACCEPTED,
		RequestStatus.PENDING,
		RequestStatus.DECLINED,
	]),
	coordinates: coordinatesSchema,
	locationName: z.string(),
});

export const getPlannedYakkasResponseSchema = lazyLoadResponseSchema.extend({
	planned: z.array(yakkaSchema),
});

export const getRecentYakkasResponseSchema = lazyLoadResponseSchema.extend({
	recent: z.array(
		yakkaSchema.extend({
			yourReview: z
				.object({
					id: z.number(),
					rating: z.number(),
				})
				.nullable(),
		})
	),
});

export const getYakkaResponseSchema = z.object({
	yakka: yakkaSchema,
});
