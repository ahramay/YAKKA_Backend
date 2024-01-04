import {
	Prisma,
	UserStatus,
	ReportedReason,
	Genders,
	RequestStatus,
	AuthType,
} from "@prisma/client";
import { z } from "zod";
import {
	coordinatesSchema,
	lazyLoadResponseSchema,
	lazyLoadSchema,
} from "../../types/globalSchemas";

const statuses = z.enum([
	UserStatus.AVAILABLE_TO_CHAT,
	UserStatus.AVAILABLE_TO_YAKKA,
	UserStatus.UNAVAILABLE,
]);
export const basicProfileSchema = z.object({
	id: z.number(),
	firstName: z.string(),
	lastName: z.string(),
	image: z.string().url().nullable().optional(),
	status: statuses,
	isVerified: z.boolean(),
});

const genders = z.enum([
	Genders.Man,
	Genders.Woman,
	Genders.Nonbinary,
	Genders.Other,
]);

const baseProfileSchema = basicProfileSchema.omit({ image: true }).extend({
	gender: genders,
	jobTitle: z.string(),
	bio: z.string().max(150),
});

export const profileInfoInputSchema = baseProfileSchema
	.omit({ id: true, status: true, isVerified: true})
	.extend({
		pushNotificationToken: z.string().nullish(),
		// DOB has been removed from the app as a requirement currently
		// dateOfBirth: z
		// .string()
		// .regex(/^\d{4}-\d{2}-\d{2}$/)
		// .transform(date => new Date(date)),
	});
export type ProfileInfoInput = z.infer<typeof profileInfoInputSchema>;

export const updateProfileInputSchema = profileInfoInputSchema.partial();
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

const imageSchema = z.object({
	url: z.string(),
	id: z.number(),
});

export const removeImageParamsSchema = z.object({
	imageId: z.string().transform(arg => Number(arg)),
});
export type RemoveImageParams = z.infer<typeof removeImageParamsSchema>;

const interestsSchema = z.array(
	z.object({
		id: z.string(),
		name: z.string(),
		interests: z.array(
			z.object({
				id: z.number(),
				name: z.string(),
			})
		),
	})
);

export const getProfileResponseSchema = baseProfileSchema.extend({
	id: z.number(),
	images: z.array(imageSchema),
	reviews: z.object({
		average: z.number().nullable(),
		total: z.number(),
	}),
	totalYakkas: z.number(),
	totalGroups: z.number(),
	hashtags: z.array(
		z.object({
			id: z.number(),
			name: z.string(),
		})
	),
	interests: z.array(
		z.object({
			id: z.number(),
			name: z.string(),
		})
	),

	status: z.enum([
		UserStatus.AVAILABLE_TO_CHAT,
		UserStatus.AVAILABLE_TO_YAKKA,
		UserStatus.UNAVAILABLE,
	]),
	isOwnProfile: z.boolean(),
	friendStatus: z
		.enum([RequestStatus.ACCEPTED, RequestStatus.PENDING])
		.nullable(),
	friendshipId: z.number().nullable(),
	coverPhoto: z.string().nullable(),
});

export const getMyProfileResponseSchema = getProfileResponseSchema.extend({
	locationName: z.string().nullable(),
	verificationPending: z.boolean(),
});

export const userImageInputSchema = z.object({
	images: z.array(z.string()),
});
export type UserImageInput = z.infer<typeof userImageInputSchema>;
export const userImageResponseSchema = z.object({
	images: z.array(z.string().url()),
});

export const userImagePartialResponseSchema = userImageResponseSchema
	.extend({
		failedImages: z.array(z.number()),
		message: z.string(),
	})
	.describe("Some images failed, returns the indexes of the failed images");

export const getVerificationImageSchema = z.object({
	imageUrl: z.string().url(),
	id: z.number(),
	description: z.string().nullable(),
});

export const uploadVerificationImageSchema = z.object({
	base64: z.string(),
	gestureId: z.number(),
});
export type UploadVerificationImage = z.infer<
	typeof uploadVerificationImageSchema
>;

const contactsInput = z.object({
	phoneNumber: z.string(),
	countryCode: z.string(),
});
export const findContactsInputSchema = z.object({
	contacts: z.array(contactsInput).describe("Array of phone numbers"),
	skip: z.boolean().optional(),
});
export type FindContactsInput = z.infer<typeof findContactsInputSchema>;

export const findContactsResponseSchema = z.object({
	yakkaContacts: z.array(basicProfileSchema.merge(contactsInput)),
	nonYakkaContacts: z.array(contactsInput),
});

export const searchInterestsParamsSchema = z.object({
	q: z.string().optional(),
});
export type SearchInterestsParams = z.infer<typeof searchInterestsParamsSchema>;

export const searchHashtagsParamsSchema = z.object({
	q: z.string().optional(),
});
export type SearchHashtagsParams = z.infer<typeof searchHashtagsParamsSchema>;

export const searchInterestsResponseSchema = z.object({
	interests: z.array(
		z.object({
			id: z.number(),
			name: z.string(),
			category: z.object({
				id: z.string(),
				name: z.string(),
			}),
		})
	),
});

export const getAllInterestsResponseSchema = z.object({
	interests: interestsSchema,
});

export const addUserInterestInputSchema = z
	.object({
		interests: z.array(z.number()),
	})
	.describe("Array of interest ids");
export type AddUserInterestInput = z.infer<typeof addUserInterestInputSchema>;

export const addUserHashtagsInputSchema = z.object({
	hashtags: z.array(z.string()),
});
export type AddUserHashtagsInput = z.infer<typeof addUserHashtagsInputSchema>;

export const removeUserHashtagsInputSchema = z.object({
	hashtags: z.array(z.number()).describe("Array of hashtag ids"),
});
export type RemoveUserHashtagsInput = z.infer<
	typeof removeUserHashtagsInputSchema
>;

const hashtag = z.object({
	id: z.number(),
	name: z.string(),
});
export const getAllHashtagsResponseSchema = z.object({
	hashtags: z.array(hashtag),
});

export const UpdateUserStatusInputSchema = z
	.object({
		status: z.enum([
			UserStatus.AVAILABLE_TO_CHAT,
			UserStatus.AVAILABLE_TO_YAKKA,
			UserStatus.UNAVAILABLE,
		]),
	})
	.describe("One of the three possible statuses");
export type UpdateUserStatusInputSchema = z.infer<
	typeof UpdateUserStatusInputSchema
>;

export const reviewUserInputSchema = z.object({
	yakkaId: z.number(),
	rating: z.number().min(1).max(5),
	comment: z.string(),
});
export type ReviewUserInputSchema = z.infer<typeof reviewUserInputSchema>;

export const getReviewsResponseSchema = lazyLoadResponseSchema.extend({
	reviews: z.array(
		reviewUserInputSchema
			.omit({
				yakkaId: true,
			})
			.extend({
				id: z.number(),
				createdAt: z.string(),
				reviewer: getProfileResponseSchema
					.pick({
						id: true,
						firstName: true,
						lastName: true,
					})
					.extend({
						image: z.string().url().nullable(),
					}),
			})
			.nullable()
			.describe("Reviewer can be null if the user has deleted their account")
	),
});

export const signupProgressResponseSchema = z.object({
	progress: z.object({
		phoneVerified: z.boolean(),
		verificationImageUploaded: z.boolean(),
		profileImagesUploaded: z.boolean(),
		profileCompleted: z.boolean(),
		interestsCompleted: z.boolean(),
		hashtagsCompleted: z.boolean(),
		contactsScreenCompleted: z.boolean(),
	}),
	autoFill: z.object({
		firstName: z.string(),
		lastName: z.string(),
	}),

	authType: z.enum([
		AuthType.APPLE,
		AuthType.GOOGLE,
		AuthType.LINKEDIN,
		AuthType.FACEBOOK,
		AuthType.CREDENTIALS,
	]),
});

export const reportUserInputSchema = z.object({
	reason: z.enum([
		ReportedReason.HARASSMENT,
		ReportedReason.BIO,
		ReportedReason.PICTURE,
		ReportedReason.SAFETY,
	]),
});
export type ReportUserInput = z.infer<typeof reportUserInputSchema>;

export const imageOrderInputSchema = z.object({
	imageOrder: z
		.array(z.number())
		.describe("Array of image ids in the desired order"),
});
export type ImageOrderInput = z.infer<typeof imageOrderInputSchema>;

export const updateUserLocationInputSchema = coordinatesSchema.extend({
	locationName: z.string().nullish(),
});
export type UpdateUserLocationInput = z.infer<
	typeof updateUserLocationInputSchema
>;

export const jobTitleSearchInputSchema = z.object({
	jobtitle: z.string(),
});
export type JobTitleSearchInput = z.infer<typeof jobTitleSearchInputSchema>;

export const userFilterSchema = lazyLoadSchema.extend({
	// Genders will be string from query params. We need it to be an array
	// Make sure it is an array of enum
	genders: z
		.string()
		.transform(s => s.split(",").map(g => g.trim()))
		.pipe(z.array(genders))
		.optional(),

	statuses: z
		.string()
		.transform(s => s.split(",").map(g => g.trim()))
		.pipe(z.array(statuses))
		.optional(),

	minStarRating: z
		.string()
		.transform(s => Number(s))
		.pipe(z.number().min(1).max(5))
		.optional(),

	maxDistanceMiles: z
		.string()
		.transform(s => Number(s))
		.pipe(z.number().min(5).max(200))
		.optional(),
	interests: z
		.string()
		.transform(s => s.split(",").map(g => Number(g.trim())))
		.pipe(z.array(z.number()))
		.optional(),
	hashtags: z
		.string()
		.transform(s => s.split(",").map(g => Number(g.trim())))
		.pipe(z.array(z.number()))
		.optional(),

	search: z.string().optional(),

	verifiedOnly: z
		.enum(["true", "false"])
		.transform(b => b === "true")
		.pipe(z.boolean())
		.optional(),
});

export const userFilterScemaDefaultDistance = userFilterSchema.extend({
	maxDistanceMiles: z
		.string()
		.transform(s => Number(s))
		.pipe(z.number().min(5).max(200).default(200))
		.optional(),
});

export const recommendedUsersFilterSchema = userFilterSchema.omit({
	maxDistanceMiles: true,
});
export type RecommendedUsersFilter = z.infer<
	typeof recommendedUsersFilterSchema
>;

export type UserFilter = z.infer<typeof userFilterSchema>;

export const userFilterResponseSchema = z.object({
	id: z.number(),
	firstName: z.string(),
	lastName: z.string(),
	status: statuses,
	bio: z.string(),
	image: z.string().url().nullable(),
	gender: genders,
	averageRating: z.coerce.number().nullable(),
	distanceMiles: z.number(),
	yakkaCount: z.coerce.number(),
	isVerified: z.boolean(),
});

export const findNearbyUsersSchema = lazyLoadResponseSchema.extend({
	nearby: z.array(userFilterResponseSchema),
});

export const findRecommendedUsersResponseSchema = lazyLoadResponseSchema.extend(
	{
		recommended: z.array(userFilterResponseSchema),
	}
);

export const findFriendsResponseSchema = lazyLoadResponseSchema.extend({
	friends: z.array(
		userFilterResponseSchema.omit({
			distanceMiles: true,
			// averageRating: true,
		})
	),
});

export const emergencyContactInputSchema = z.object({
	name: z.string(),
	phoneCountryCode: z.string(),
	phoneNumber: z.string(),
});
export type EmergencyContactInput = z.infer<typeof emergencyContactInputSchema>;

export const getEmergencyContactResponseSchema = z.object({
	id: z.number(),
	name: z.string(),
	phoneCountryCode: z.string(),
	phoneNumber: z.string(),
});

export const coverImageInputSchema = z.object({
	base64: z.string(),
});
export type CoverImageInput = z.infer<typeof coverImageInputSchema>;

export const coverImageResponseSchema = z.object({
	url: z.string().url(),
});

export const getFacebookPhotosResponseSchema = z.object({
	photos: z.array(
		z.object({
			id: z.number(),
			image: z.string(),
		})
	),
});

export const getBlockedUsersResponseSchema = z.object({
	blockedUsers: z.array(basicProfileSchema),
});
