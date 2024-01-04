import { string, z } from "zod";
import {
	coordinatesSchema,
	lazyLoadResponseSchema,
	lazyLoadSchema,
} from "../../types/globalSchemas";
import { basicProfileSchema } from "../user/user.schema";

const yakkaGroupBaseSchema = z.object({
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
		.transform(date => new Date(date))
		.refine(date => date > new Date(), {
			message: "Group date must be in the future",
		}),
	endTime: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
		.transform(date => new Date(date))
		.refine(date => date > new Date(), {
			message: "Group end time must be in the future",
		}),
	coordinates: z.object({
		longitude: z.number(),
		latitude: z.number(),
	}).optional(),
	frequency : z.array(z.string()),
	repeatFor: z.array(z.string()),
	locationName: z.string().optional(),
	groupGender: z.array(z.string()),
	profileImage: z.string().nullable().optional(),
	coverImage: z.string().nullable().optional(),
	categories: z.array(z.string({
		required_error: "Categories are required"
	})),
	name: z.string(),
	description: z.string().optional(),
	isPrivate: z.boolean(),
	paymentAmount: z.number().optional(),
	paymentUrl: z.string().optional(),
	hashtags: z.array(z.string()).optional(),
});

export const groupFilterSchema = lazyLoadSchema.extend({
	verifiedOnly: z
		.enum(["true", "false"])
		.transform(b => b === "true")
		.pipe(z.boolean())
		.optional(),
	search: z.string().optional(),
	maxDistanceMiles: z
		.string()
		.transform(s => Number(s))
		.pipe(z.number().min(5).max(200))
		.optional(),
});



const categorySchema = z.array(
	z.object({
		id: z.string(),
		name: z.string(),
	})
);

export const getAllCategoriesResponseSchema = z.object({
	categories: categorySchema,
});

export const groupFilterSchemaDefaultDistance = groupFilterSchema.extend({
	maxDistanceMiles: z
		.string()
		.transform(s => Number(s))
		.pipe(z.number().min(5).max(200).default(200))
		.optional(),
});

export type GroupFilter = z.infer<typeof groupFilterSchema>;

export const createGroupYakkaInputSchema = yakkaGroupBaseSchema;
export type CreateGroupYakka = z.infer<typeof createGroupYakkaInputSchema>;

export const createInviteInputSchema = z.object({
	userId: z.number(),
	groupId: z.number(),
});
export type CreateInvite = z.infer<typeof createInviteInputSchema>;

export type GroupFilteration = z.infer<typeof groupFiltrationSchema>;


export const findNearbyGroupsSchema = lazyLoadResponseSchema.extend({
	nearby: z.array(yakkaGroupBaseSchema),
});

export const updateGroupYakkaInputSchema = createGroupYakkaInputSchema.partial();

// .partial()
// .omit({ inviteeId: true });
export type UpdateYakka = z.infer<typeof updateGroupYakkaInputSchema>;

export const yakkaGroupParamsSchema = z.object({
	groupId: z.string().transform(id => Number(id)),
});
export type GroupParams = z.infer<typeof yakkaGroupParamsSchema>;

export const groupYakkaResponseInputSchema = z.object({
	accept: z.boolean(),
});


export type GroupYakkaResponse = z.infer<typeof groupYakkaResponseInputSchema>;

const groupYakkaSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
	date: z.date().nullable(),
	endTime: z.date().nullable(),
	organiser: basicProfileSchema.optional(),
	locationName: z.array(z.string()), 
	isPrivate: z.boolean().default(false),
	paymentAmount: z.number().nullable().optional(),
	paymentUrl: z.string().nullable().optional(),
	groupGender: z.string().nullish(),
	coverImage: z.string().nullable().optional(),
	profileImage:  z.string().nullable(),
	categories: z.array(z.string()),
	frequency : z.string().nullish(),
	repeatFor: z.string().nullish(),
	hashtags: z.array(z.string()).optional(),
});

export const newCreateGroupSchema =  z.object({
	id: z.number(),
	message: z.string()
});

/*=================Filtration Schema===============*/

export const groupFiltrationSchema = z.object({
	genders: z.array(z.string()).optional(),

	distance: z.object({
		min: z.number().optional(),
		max: z.number().optional()
	}).optional(),

	isFavourite: z.boolean().optional(),
	
	rating: z.number().refine((n) => n >= 0 && n <= 5, {
		message: 'Rating Should be between 0 to 5'
	}).optional(),
	
	date: z.string()
		.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
		.transform(date => new Date(date)).optional(),
	
	categories: z.array(z.string()).optional(),
	
	hashTags: z.array(z.object({})).optional()

})

export const getPlannedGroupYakkasResponseSchema =
	lazyLoadResponseSchema.extend({
		planned: z.array(
			groupYakkaSchema.extend({
				isOrganiser: z.boolean(),
				isMember: z.boolean(),
				isInvited: z.boolean(),
			})
		),
	});
	export const getFilterYakkaGroupSchema =
	lazyLoadResponseSchema.extend({
		filteredGroups: z.array(
			groupYakkaSchema.extend({
				groupMiles: z.number().optional()
			})
		),
		message: z.string()
	});

export const getRecentGroupYakkasResponseSchema = lazyLoadResponseSchema.extend(
	{
		recent: z.array(
			groupYakkaSchema.extend({
				isOrganiser: z.boolean().optional(),
				isInvited: z.boolean().optional(),
			})
			// groupYakkaSchema.extend({
			// yourReview: z
			// .object({
			// id: z.number(),
			// rating: z.number(),
			// })
			// .nullable(),
			// })
		),
	}
);

// export const groupProfileImageInputSchema = z.object({
// 	base64: z.string(),
// });
// export type CoverImageInput = z.infer<typeof groupProfileImageInputSchema>;

// export const coverImageResponseSchema = z.object({
// 	url: z.string().url(),
// });

export const getGroupYakkaResponseSchema = z.object({
	groupYakka: groupYakkaSchema.extend({
		isOrganiser: z.boolean(),
		isInvited: z.boolean(),
		isMember: z.boolean(),
	}),
});

export const updateGroupLocationInputSchema = coordinatesSchema.extend({
	locationName: z.string().nullish(),
	groupId: z.number()
});
export type UpdateGroupLocationInput = z.infer<
	typeof updateGroupLocationInputSchema
>;