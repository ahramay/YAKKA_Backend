import { Prisma } from "@prisma/client";
import axios from "axios";
import { subDays } from "date-fns";
import type { FastifyReply, FastifyRequest } from "fastify";
import { LazyLoad, UserParams } from "../../types/globalSchemas";
import {
	formatS3Url,
	removeS3Image,
	S3_URLs,
	uploadBase64ImageToS3,
} from "../../utils/aws";
import config from "../../utils/config";
import { formatBasicUser } from "../../utils/dataFormatting";
import { formatDate } from "../../utils/dates";
import gmapsClient from "../../utils/googlemaps";
import prisma from "../../utils/prisma";
import { decrypt } from "../auth/auth.service";
import { addFriend } from "../friends/friends.helper";
import {
	notificationText,
	sendPushNotifications,
} from "../notifications/notifications.helper";
import { basicProfileSelect } from "../yakka/yakka.service";
import {
	findUsersByPhone,
	formatFilteredUsers,
	milesToMetres,
} from "./user.helper";
import {
	AddUserHashtagsInput,
	AddUserInterestInput,
	CoverImageInput,
	EmergencyContactInput,
	FindContactsInput,
	ImageOrderInput,
	JobTitleSearchInput,
	ProfileInfoInput,
	RecommendedUsersFilter,
	RemoveImageParams,
	RemoveUserHashtagsInput,
	ReportUserInput,
	ReviewUserInputSchema,
	SearchHashtagsParams,
	SearchInterestsParams,
	UpdateProfileInput,
	UpdateUserLocationInput,
	UpdateUserStatusInputSchema,
	UploadVerificationImage,
	UserFilter,
	UserImageInput,
} from "./user.schema";
import { filterUsers, upsertLocation } from "./user.service";
import { sendSMSMessage } from "../../utils/twilio";
// import { parse } from "libphonenumber-js";
// * Image verification
export const getVerificationImageHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const gestureCount = await prisma.gesture.count();
	const randomGesture = await prisma.gesture.findFirst({
		skip: Math.floor(Math.random() * gestureCount),
	});

	if (!randomGesture) {
		return reply.status(500).send({ error: "Could not find a gesture." });
	}

	const { imageName, ...rest } = randomGesture;

	return reply.send({
		...rest,
		imageUrl: formatS3Url({
			fileName: randomGesture.imageName,
			path: S3_URLs.gestureExamples,
		}),
	});
};

export const uploadVerificationImageHandler = async (
	request: FastifyRequest<{
		Body: UploadVerificationImage;
	}>,
	reply: FastifyReply
) => {
	try {
		const { base64, gestureId } = request.body;

		const gesture = await prisma.gesture.findUnique({
			where: {
				id: gestureId,
			},
		});

		if (!gesture) {
			return reply.status(404).send({ message: "Gesture not found" });
		}

		const { url, fileName: imageName } = await uploadBase64ImageToS3({
			base64,
			path: S3_URLs.gestureUsers,
		});
		await prisma.userVerificationImage.create({
			data: {
				userId: request.user.id,
				gestureId,
				imageName,
			},
		});

		return reply.send({ message: "Image uploaded successfully" });
	} catch (error) {
		console.error(error);
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				return reply
					.status(409)
					.send({ message: "You have already uploaded an image." });
			}
		}
		return reply.status(500).send({ message: "Could not upload image" });
	}
};

export const getSignupProgressHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const user = await prisma.user.findUnique({
		where: {
			id: request.user.id,
		},

		include: {
			profile: true,
			images: true,
			hashtags: true,
			interests: true,
			UserVerificationImage: true,
			account: true,
		},
	});

	if (!user) {
		return reply.status(404).send({ message: "User not found" });
	}

	const progress = {
		phoneVerified: user.phoneVerified,
		verificationImageUploaded: !!user.UserVerificationImage,
		profileImagesUploaded: user.images.length >= 1,
		profileCompleted: !!user.profile,
		interestsCompleted: user.interests.length > 0,
		hashtagsCompleted: user.hashtags.length > 0,
		contactsScreenCompleted: user.contactsScreenCompleted,
	};

	return reply.send({
		progress,
		authType: user.account?.authType || null,
		autoFill: {
			firstName: user.firstName || "",
			lastName: user.lastName || "",
		},
	});
};

// * Profile

export const createProfileHandler = async (
	request: FastifyRequest<{ Body: ProfileInfoInput }>,
	reply: FastifyReply
) => {
	const { firstName, lastName, pushNotificationToken, bio, ...profileInfo} =
		request.body;

	try {
		const user = await prisma.user.update({
			where: {
				id: request.user.id,
			},
			data: {
				firstName,
				lastName,
				pushNotificationToken,
				profile: {
					create: {
						bio: bio.trim(),
						...profileInfo,
						// TODO: hard coding dob until db updated. Are we to remove this from DB?
						// currently we have removed the signup step to confirm DOB and instead click a "confirm over 18" button so this is no longer needed
						dateOfBirth:  new Date("1995-10-13T00:00:00.000Z"),
					},
				},
			},
		});

		return reply.code(201).send({
			message: "Profile created",
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2014") {
				return reply.status(409).send({ message: "Profile already exists" });
			}
		}

		console.error(error);
		throw error;
	}
};

export const coverImageUploadHandler = async (
	request: FastifyRequest<{
		Body: CoverImageInput;
	}>,
	reply: FastifyReply
) => {
	try {
		// Check for existing cover image
		const currentUser = await prisma.user.findUnique({
			where: {
				id: request.user.id,
			},
			select: {
				profile: {
					select: {
						coverPhoto: true,
					},
				},
			},
		});

		if (currentUser?.profile?.coverPhoto) {
			// Delete existing cover image
			await removeS3Image({
				path: S3_URLs.coverImage(request.user.id),
				fileName: currentUser.profile.coverPhoto,
			});
		}

		const { base64 } = request.body;
		const { url, fileName: imageName } = await uploadBase64ImageToS3({
			base64,
			path: S3_URLs.coverImage(request.user.id),
		});

		const user = await prisma.user.update({
			where: {
				id: request.user.id,
			},
			data: {
				profile: {
					update: {
						coverPhoto: imageName,
					},
				},
			},
		});

		return reply.send({
			url,
		});
	} catch (error) {
		console.error(error);
		return reply.status(500).send({ message: "Could not upload image" });
	}
};

export const coverImageDeleteHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const currentUser = await prisma.user.findUnique({
		where: {
			id: request.user.id,
		},
		select: {
			profile: {
				select: {
					coverPhoto: true,
				},
			},
		},
	});

	if (currentUser?.profile?.coverPhoto) {
		// Delete existing cover image

		await removeS3Image({
			path: S3_URLs.coverImage(request.user.id),
			fileName: currentUser.profile.coverPhoto,
		});

		const user = await prisma.user.update({
			where: {
				id: request.user.id,
			},
			data: {
				profile: {
					update: {
						coverPhoto: null,
					},
				},
			},
		});

		return reply.send({
			message: "Cover image deleted",
		});
	}

	return reply.status(404).send({
		message: "Cover image not found",
	});
};

export const userImageUploadHandler = async (
	request: FastifyRequest<{
		Body: UserImageInput;
	}>,
	reply: FastifyReply
) => {
	try {
		const { images } = request.body;
		const path = S3_URLs.userImages(request.user.id);
		const userImagesCount = await prisma.userImage.count({
			where: {
				userId: request.user.id,
			},
		});

		if (userImagesCount >= config.MAX_USER_PHOTOS) {
			return reply
				.status(403)
				.send({ message: "You have reached the maximum number of images" });
		}
		const userImages = await Promise.allSettled(
			images.map(async image => {
				// console.log("Base64:-", image)
				const { url, fileName: imageName } = await uploadBase64ImageToS3({
					base64: image,
					path,
				});
				return {
					imageName,
					url,
				};
			})
		);

		// check if any images failed
		let failedImages;
		if (userImages.some(image => image.status === "rejected")) {
			// find all the index of the images that failed
			failedImages = userImages
				.map((image, index) => {
					if (image.status === "rejected") {
						return index;
					}
				})
				.filter(image => image !== undefined) as number[];
		}
		let totalImages = await prisma.userImage.count({
			where: {
				userId: request.user.id,
			},
		});
		const userImageResults = userImages
			.filter(i => i.status === "fulfilled")
			.map(image => ({
				userId: request.user.id,
				// @ts-ignore
				imageName: image.value.imageName,
				sortOrder: ++totalImages,
			}));

		await prisma.userImage.createMany({
			data: userImageResults,
		});

		// if there are failed images, return them
		if (userImages.every(image => image.status === "rejected")) {
			return reply
				.status(500)
				.send({ message: "All images failed", failedImages });
		}

		const successfulImages = userImageResults.map(image =>
			formatS3Url({
				fileName: image.imageName,
				path,
			})
		);

		if (failedImages) {
			// some images failed, send back the failed images and the successful ones
			return reply.status(206).send({
				message: "Some images failed",
				failedImages,
				images: successfulImages,
			});
		}

		return reply.send({
			images: successfulImages,
		});
	} catch {
		return reply.status(500).send({ message: "Something went wrong" });
	}
};

export const removeUserImageHandler = async (
	request: FastifyRequest<{
		Params: RemoveImageParams;
	}>,
	reply: FastifyReply
) => {
	try {
		const { imageId } = request.params;
		const userImages = await prisma.userImage.count({
			where: {
				userId: request.user.id,
			},
		});

		if (userImages <= config.MIN_USER_PHOTOS) {
			return reply.status(403).send({ message: "You need at least 1 image" });
		}

		const image = await prisma.userImage.delete({
			where: {
				userId_id: {
					userId: request.user.id,
					id: imageId,
				},
			},
		});

		if (image.source === "YAKKA") {
			const path = S3_URLs.userImages(request.user.id);

			await removeS3Image({
				fileName: image.imageName,
				path,
			});
		}

		return reply.send({ message: "Image deleted" });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2025") {
				return reply.status(404).send({ message: "Image not found" });
			}
		}
		console.error(error);
		throw error;
	}
};

export const getProfileHandler = async (
	request: FastifyRequest<{
		Params: Partial<UserParams>;
	}>,
	reply: FastifyReply
) => {
	// ? Note: this handles both /me/profile and /:userId/profile
	// ? I've separated them into two routes to account for future changes but for now the logic is the same
	let userId = request.user.id;
	let isOwnProfile = true;
	if (request.params.userId) {
		userId = request.params.userId;
		isOwnProfile = request.params.userId === request.user.id;
	}
	const userPromise = prisma.user.findUnique({
		where: {
			id: userId,
		},

		include: {
			profile: true,
			images: {
				orderBy: {
					sortOrder: "asc",
				},
			},
			hashtags: {
				select: {
					hashtag: true,
				},
			},
			interests: {
				select: {
					interest: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			},
			location: {
				select: {
					locationName: true,
				},
			},
		},
	});

	const reviewPromise = prisma.yakkaReview.aggregate({
		where: {
			receiverId: userId,
		},
		_avg: {
			rating: true,
		},
		_count: {
			rating: true,
		},
	});

	const friendPromise = prisma.friends.findFirst({
		where: {
			OR: [
				{
					senderId: request.user.id,
					receiverId: userId,
				},
				{
					senderId: userId,
					receiverId: request.user.id,
				},
			],
		},
	});

	const yakkaPromise = prisma.yakka.aggregate({
		where: {
			status: "ACCEPTED",
			OR: [
				{
					organiserId: userId,
				},
				{
					inviteeId: userId,
				},
			],
		},
		_count: {
			id: true,
		},
	});

	const groupPromise = prisma.group.aggregate({
		where: {
					organiserId: userId,
		},
		_count: {
			id: true,
		},
	})

	const [user, review, friends, yakkas, groups] = await prisma.$transaction([
		userPromise,
		reviewPromise,
		friendPromise,
		yakkaPromise,
		groupPromise
	]);

	if (!user) {
		return reply.status(404).send({ message: "User not found" });
	}

	if (!user.profile) {
		return reply.status(404).send({ message: "Profile not found" });
	}

	// Since we are fetching entries from UserInterests then Interest,
	// The response will be like this:
	// {
	// 	interests: [
	// 		{
	// 			interest: {
	// 				id: 1,
	// 				...
	// 			}
	// 		},
	// 		...
	// 	]
	// So we map through each and pull out the interest object
	const userInterests = user.interests.map(interest => interest.interest);

	const verificationPending = isOwnProfile
		? await prisma.userVerificationImage.findUnique({
				where: {
					userId: request.user.id,
				},
		  })
		: null;

	return reply.send({
		...user.profile,
		...user,
		coverPhoto: user.profile.coverPhoto
			? formatS3Url({
					fileName: user.profile.coverPhoto,
					path: S3_URLs.coverImage(userId),
			  })
			: null,
		images: user.images.map(image => {
			if (image.source === "FACEBOOK") {
				return {
					url: image.imageName,
					id: image.id,
				};
			}
			return {
				url: formatS3Url({
					fileName: image.imageName,
					path: S3_URLs.userImages(userId),
				}),
				id: image.id,
			};
		}),
		reviews: {
			average: review._avg.rating,
			total: review._count.rating,
		},
		totalGroups: groups._count.id,
		totalYakkas: yakkas._count.id,
		hashtags: user.hashtags.map(hashtag => hashtag.hashtag),
		interests: userInterests,
		isOwnProfile,
		friendStatus: friends?.status || null,
		friendshipId: friends?.id || null,
		locationName: user.location?.locationName || null,
		verificationPending: verificationPending && !user.isVerified ? true : false,
	});
};

export const updateProfileHandler = async (
	request: FastifyRequest<{
		Body: UpdateProfileInput;
	}>,
	reply: FastifyReply
) => {
	const { firstName, lastName, pushNotificationToken, bio, ...profileInfo } =
		request.body;

	await prisma.user.update({
		where: {
			id: request.user.id,
		},
		data: {
			firstName,
			lastName,
			pushNotificationToken,
			profile: {
				update: {
					bio: bio?.trim(),
					...profileInfo,
				},
			},
		},
	});

	return reply.send({ message: "Profile updated" });
};

export const jobTitleSearchHandler = async (
	request: FastifyRequest<{
		Querystring: JobTitleSearchInput;
	}>,
	reply: FastifyReply
) => {
	const { jobtitle } = request.query;

	const jobTitles = await prisma.jobTitle.findMany({
		where: {
			name: {
				contains: jobtitle,
			},
		},
		select: {
			name: true,
		},
		take: 5,
	});

	return reply.send({
		jobTitles: jobTitles.map(jobTitle => jobTitle.name),
	});
};

// * Contacts
export const inviteContactsHandler = async (
	request: FastifyRequest<{
		Body: FindContactsInput;
	}>,
	reply: FastifyReply
) => {
	const { contacts } = request.body;

	const yakkaContacts = await findUsersByPhone(contacts);
	let promises = yakkaContacts.map(yakkaContact => {
		return addFriend({
			senderId: request.user.id,
			receiverId: yakkaContact.id,
		});
	});

	await Promise.allSettled(promises);

	const nonYakkaContacts = contacts.filter(
		contact =>
			!yakkaContacts.some(
				yakkaContact => yakkaContact.phoneNumber === contact.phoneNumber
			)
	);

	promises = nonYakkaContacts.map(contact => {
		return sendSMSMessage({
			to: `${contact.countryCode}${contact.phoneNumber}`,
			body: `Hey, I'm using YAKKA to connect with people in person and thought you would like to use it too. Download the app and connect with me here: https://www.yakkaworld.com/downloads/`,
		});
	});

	return reply.send({
		message: "Contacts invited",
	});
};

export const findContactsHandler = async (
	request: FastifyRequest<{
		Body: FindContactsInput;
	}>,
	reply: FastifyReply
) => {
	const { contacts, skip } = request.body;

	if (skip) {
		await prisma.user.update({
			where: {
				id: request.user.id,
			},
			data: {
				contactsScreenCompleted: true,
			},
		});
	}

	const yakkaContacts = await findUsersByPhone(contacts);

	const nonYakkaContacts = contacts.filter(
		contact =>
			!yakkaContacts.some(
				yakkaContact => yakkaContact.phoneNumber === contact.phoneNumber
			)
	);

	return reply.send({
		// Format basic profile info
		yakkaContacts: yakkaContacts.map(user => {
			return {
				...formatBasicUser(user),
				phoneNumber: user.phoneNumber,
				countryCode: user.phoneCountryCode,
			};
		}),
		nonYakkaContacts,
	});
};

// * Interests
export const getAllInterestsHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const interests = await prisma.interestCategory.findMany({
		include: {
			interests: true,
		},
	});

	return reply.code(200).send({ interests: interests });
};

export const searchInterestsHandler = async (
	request: FastifyRequest<{
		Querystring: SearchInterestsParams;
	}>,
	reply: FastifyReply
) => {
	const interests = await prisma.interest.findMany({
		select: {
			id: true,
			name: true,
			InterestCategory: {
				select: {
					id: true,
					name: true,
				},
			},
		},
		where: {
			name: {
				contains: request.query.q,
			},
		},
		take: 7,
	});

	return {
		interests: interests.map(interest => ({
			...interest,
			category: interest.InterestCategory,
		})),
	};
};

export const addUserInterestsHandler = async (
	request: FastifyRequest<{
		Body: AddUserInterestInput;
	}>,
	reply: FastifyReply
) => {
	try {
		const { interests } = request.body;

		const userInterests = interests.map(interest => ({
			userId: request.user.id,
			interestId: interest,
		}));

		await prisma.userInterest.createMany({
			data: userInterests,
			skipDuplicates: true,
		});

		return {
			message: "Interests added",
		};
	} catch (error) {
		throw error;
	}
};

export const removeUserInterestsHandler = async (
	request: FastifyRequest<{
		Body: AddUserInterestInput;
	}>,
	reply: FastifyReply
) => {
	try {
		const { interests } = request.body;

		await prisma.userInterest.deleteMany({
			where: {
				userId: request.user.id,
				interestId: {
					in: interests,
				},
			},
		});

		return {
			message: "Interests removed",
		};
	} catch (error) {
		throw error;
	}
};

// * Hashtags

export const getAllHashtagsHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const hashtags = await prisma.hashtag.findMany({
		select: {
			id: true,
			name: true,
		},
	});

	return { hashtags };
};

export const searchHashtagsHandler = async (
	request: FastifyRequest<{
		Querystring: SearchHashtagsParams;
	}>,
	reply: FastifyReply
) => {
	const hashtags = await prisma.hashtag.findMany({
		select: {
			id: true,
			name: true,
		},
		where: {
			name: {
				contains: request.query.q,
			},
		},
		take: 7,
	});

	return { hashtags };
};

export const addUserHashtagsHandler = async (
	request: FastifyRequest<{
		Body: AddUserHashtagsInput;
	}>,
	reply: FastifyReply
) => {
	try {
		const { hashtags } = request.body;

		// Unfortunately, prisma createMany() doesn't return the created items
		const dbHashtags = await prisma.$transaction(
			hashtags.map(hashtag =>
				prisma.hashtag.upsert({
					where: {
						name: hashtag,
					},
					update: {},
					create: {
						name: hashtag,
					},
				})
			)
		);

		const userHashtags = dbHashtags.map(hashtag => ({
			userId: request.user.id,
			hashtagId: hashtag.id,
		}));

		await prisma.userHashtag.createMany({
			data: userHashtags,
			skipDuplicates: true,
		});

		return {
			message: "HashTags added",
		};
	} catch (error) {
		throw error;
	}
};

export const removeUserHashtagsHandler = async (
	request: FastifyRequest<{
		Body: RemoveUserHashtagsInput;
	}>,
	reply: FastifyReply
) => {
	try {
		const { hashtags } = request.body;

		await prisma.userHashtag.deleteMany({
			where: {
				userId: request.user.id,
				hashtagId: {
					in: hashtags,
				},
			},
		});

		return {
			message: "HashTags removed",
		};
	} catch (error) {
		throw error;
	}
};

// * Status

export const updateUserStatusHandler = async (
	request: FastifyRequest<{
		Body: UpdateUserStatusInputSchema;
	}>,
	reply: FastifyReply
) => {
	try {
		const { status } = request.body;

		await prisma.user.update({
			where: {
				id: request.user.id,
			},
			data: {
				status,
			},
		});

		return {
			message: "Status updated",
		};
	} catch (error) {
		throw error;
	}
};

// * Reviews

export const reviewUserHandler = async (
	request: FastifyRequest<{
		Body: ReviewUserInputSchema;
		Params: UserParams;
	}>,
	reply: FastifyReply
) => {
	try {
		const { rating, comment, yakkaId } = request.body;
		const { userId } = request.params;

		if (userId === request.user.id) {
			return reply.status(403).send({ message: "You can't review yourself" });
		}

		// Check if the yakka exists and happened between the two users in the past
		const yakka = await prisma.yakka.findUnique({
			where: {
				id: yakkaId,
			},
			select: {
				id: true,
				inviteeId: true,
				organiserId: true,
				date: true,
				status: true,
			},
		});

		if (!yakka) {
			return reply.status(404).send({ message: "YAKKA not found" });
		}

		if (yakka.status !== "ACCEPTED") {
			return reply
				.status(403)
				.send({ message: "You didn't accept this YAKKA request" });
		}

		const users = [yakka.inviteeId, yakka.organiserId];
		if (!users.includes(userId) || !users.includes(request.user.id)) {
			return reply.status(403).send({ message: "You can't review this user" });
		}

		// If Yakka hasn't happened yet, don't allow review
		if (yakka.date > new Date()) {
			return reply.status(403).send({ message: "YAKKA hasn't happened yet" });
		}

		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
			select: {
				pushNotificationToken: true,
			},
		});

		if (!user) {
			return reply.status(404).send({ message: "User not found" });
		}

		// If user has written a review for this yakka already, don't allow another review
		const existingReview = await prisma.yakkaReview.findUnique({
			where: {
				authorId_receiverId_yakkaId: {
					authorId: request.user.id,
					receiverId: userId,
					yakkaId,
				},
			},
		});

		if (existingReview) {
			return reply
				.status(403)
				.send({ message: "You've already reviewed this YAKKA" });
		}

		// If the person has reviewed the user in the last 7 days, don't allow another review
		const lastReview = await prisma.yakkaReview.findFirst({
			where: {
				authorId: request.user.id,
				receiverId: userId,
				createdAt: {
					gt: subDays(new Date(), 7),
				},
			},
		});

		if (lastReview) {
			return reply.status(403).send({
				message: "You've already reviewed this user in the past 7 days",
			});
		}

		const review = await prisma.yakkaReview.create({
			data: {
				rating,
				comment,
				authorId: request.user.id,
				receiverId: userId,
				yakkaId,
			},
			select: {
				id: true,
				author: {
					select: {
						firstName: true,
					},
				},
			},
		});

		// Notify recipient

		const { clause, type } = notificationText.YAKKA_REVIEWED;
		await prisma.notification.create({
			data: {
				prepositionName: review.author?.firstName || "Someone",
				clause: ` ${clause} ${rating} ${rating === 1 ? "star" : "stars"}`,
				userId: userId,
				type,
				reviewId: review.id,
				senderId: request.user.id,
			},
		});
		await sendPushNotifications([
			{
				body: `${review.author?.firstName || "Someone"} ${clause} ${rating} ${
					rating === 1 ? "star" : "stars"
				}`,
				pushToken: user.pushNotificationToken,
				data: {
					type,
					reviewId: review.id,
				},
				incrementUnreadCount: true,
				userId: userId,
			},
		]);

		return {
			message: "Review created successfully",
		};
	} catch (error) {
		throw error;
	}
};

export const getReviewsHandler = async (
	request: FastifyRequest<{
		Params: Partial<UserParams>;
		Querystring: LazyLoad;
	}>,
	reply: FastifyReply
) => {
	try {
		let userId = request.user.id;
		if (request.params.userId) {
			userId = request.params.userId;
		}

		const { limit, page } = request.query;

		const reviews = await prisma.yakkaReview.findMany({
			where: {
				receiverId: userId,
			},
			select: {
				id: true,
				rating: true,
				comment: true,
				createdAt: true,
				author: basicProfileSelect,
			},
			orderBy: {
				createdAt: "desc",
			},

			take: limit,
			skip: page * limit,
		});

		return {
			reviews: reviews.map(r => ({
				...r,

				createdAt: formatDate(r.createdAt),
				reviewer: r.author
					? formatBasicUser(r.author)
					: formatBasicUser({
							status: "UNAVAILABLE",
							images: [],
							isVerified: false,
							firstName: "Former",
							lastName: "User",
							id: 0,
					  }),
			})),
			nextPage: reviews.length === limit ? page + 1 : null,
		};
	} catch (error) {
		throw error;
	}
};

export const blockUserHandler = async (
	request: FastifyRequest<{
		Params: UserParams;
	}>,
	reply: FastifyReply
) => {
	try {
		const { userId } = request.params;

		if (userId === request.user.id) {
			return reply.status(403).send({ message: "You can't block yourself" });
		}

		await prisma.blockedUser.create({
			data: {
				userId: request.user.id,
				blockedUserId: userId,
			},
		});

		// Remove friendship if exists
		const friendship = await prisma.friends.findFirst({
			where: {
				OR: [
					{
						senderId: request.user.id,
						receiverId: userId,
					},
					{
						senderId: userId,
						receiverId: request.user.id,
					},
				],
			},
		});

		if (friendship) {
			await prisma.friends.delete({
				where: {
					id: friendship.id,
				},
			});
		}

		// Remove upcoming Yakkas
		await prisma.yakka.deleteMany({
			where: {
				date: {
					gte: new Date(),
				},
				OR: [
					{
						organiserId: request.user.id,
						inviteeId: userId,
					},
					{
						organiserId: userId,
						inviteeId: request.user.id,
					},
				],
			},
		});

		return {
			message: "User blocked successfully",
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				return reply.status(409).send({ message: "User already blocked" });
			}
			if (error.code === "P2003") {
				return reply.status(404).send({ message: "User not found" });
			}
		}
		throw error;
	}
};

export const reportUserHandler = async (
	request: FastifyRequest<{
		Params: UserParams;
		Body: ReportUserInput;
	}>,
	reply: FastifyReply
) => {
	try {
		const { userId } = request.params;
		const { reason } = request.body;

		if (userId === request.user.id) {
			return reply.status(403).send({ message: "You can't report yourself" });
		}

		await prisma.report.create({
			data: {
				reason,
				authorId: request.user.id,
				reportedId: userId,
			},
		});

		return {
			message: "User reported successfully",
		};
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2003") {
				return reply.status(404).send({ message: "User not found" });
			}
		}
		throw error;
	}
};

export const imageOrderHandler = async (
	request: FastifyRequest<{
		Body: ImageOrderInput;
	}>,
	reply: FastifyReply
) => {
	try {
		const { imageOrder } = request.body;

		const userImages = await prisma.userImage.count({
			where: {
				userId: request.user.id,
			},
		});

		if (imageOrder.length !== userImages) {
			return reply.status(400).send({
				message: `You sent ${imageOrder.length} images but you have ${userImages} images in your account`,
			});
		}

		const promises = imageOrder.map((id, index) =>
			prisma.userImage.update({
				where: {
					userId_id: {
						userId: request.user.id,
						id,
					},
				},
				data: {
					sortOrder: index + 1,
				},
			})
		);

		await prisma.$transaction(promises);

		return {
			message: "Images order updated successfully",
		};
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError) {
			console.log(e);
			if (e.code === "P2002") {
				return reply
					.status(400)
					.send({ message: "You likely sent the same image ID twice" });
			}
			if (e.code === "P2025") {
				return reply.status(404).send({ message: "Image not found" });
			}
		}

		throw e;
	}
};

export const updateLocationHandler = async (
	request: FastifyRequest<{
		Body: UpdateUserLocationInput;
	}>,
	reply: FastifyReply
) => {
	try {
		// Check for existing location

		const { latitude, longitude } = request.body;
		// NOTE: MySQL Point is long/lat not lat/long
		const previousLocation =
			await prisma.$queryRaw`SELECT * FROM \`UserLocation\` WHERE \`userId\` = ${
				request.user.id
			} AND locationName IS NOT NULL AND
		ST_Distance_Sphere(point, POINT(${longitude}, ${latitude})) < ${milesToMetres(
				5
			)};`;
		let placeName;

		// If location doesn't exist or is more than 5 miles away
		if (Array.isArray(previousLocation) && previousLocation[0] === undefined) {
			const res = await gmapsClient.reverseGeocode({
				params: {
					key: config.GOOGLE_MAPS_API_KEY,
					latlng: `${latitude},${longitude}`,
					// @ts-ignore
					result_type: ["locality"],
				},
			});
			// The town / city name will be the component with localility and political types
			placeName = res.data.results[0].address_components.find(
				// @ts-ignore
				ac => ac.types.includes("locality") && ac.types.includes("political")
			);

			console.log("this is the place name", placeName?.short_name);

			console.log(
				"updating location",
				placeName?.short_name,
				placeName?.short_name || null
			);

			await upsertLocation({
				userId: request.user.id,
				latitude,
				longitude,
				locationName: placeName?.short_name || null,
			});
		} else {
			await upsertLocation({
				userId: request.user.id,
				latitude,
				longitude,
				// @ts-ignore
				locationName: previousLocation[0].locationName,
			});
		}

		return {
			message: "Location updated successfully",
		};
	} catch (error) {
		console.log(error);
		throw error;
	}
};

export const nearbyUsersHandler = async (
	request: FastifyRequest<{
		Querystring: UserFilter;
	}>,
	reply: FastifyReply
) => {
	try {
		const { maxDistanceMiles = 200, ...filters } = request.query;

		console.log(request.query);
		const userLocation = await prisma.userLocation.findUnique({
			where: {
				userId: request.user.id,
			},
		});

		if (!userLocation) {
			return reply.status(404).send({ message: "User location not found" });
		}

		const users = await filterUsers({
			userId: request.user.id,
			selectDistance: true,
			sortByDistance: true,
			maxDistanceMiles,
			...filters,
		});

		return formatFilteredUsers({ users, filters, keyName: "nearby" });
	} catch (error) {
		throw error;
	}
};

// Friends route for find Yakkas screen
export const findFriendsHandler = async (
	request: FastifyRequest<{
		Querystring: UserFilter;
	}>,
	reply: FastifyReply
) => {
	try {
		const { ...filters } = request.query;

		const userLocation = await prisma.userLocation.findUnique({
			where: {
				userId: request.user.id,
			},
		});

		if (!userLocation && filters.maxDistanceMiles) {
			return reply.status(404).send({ message: "User location not found" });
		}

		const friends = await filterUsers({
			userId: request.user.id,

			friendsOnly: true,
			selectDistance: false,

			...filters,
		});

		return formatFilteredUsers({ users: friends, filters, keyName: "friends" });
	} catch (error) {
		throw error;
	}
};

export const findRecommendedUsersHandler = async (
	request: FastifyRequest<{
		Querystring: RecommendedUsersFilter;
	}>,
	reply: FastifyReply
) => {
	try {
		const { ...filters } = request.query;

		const userLocation = await prisma.userLocation.findUnique({
			where: {
				userId: request.user.id,
			},
		});

		if (!userLocation) {
			return reply.status(404).send({ message: "User location not found" });
		}

		const userInterests = await prisma.userInterest.findMany({
			where: {
				userId: request.user.id,
			},
			select: {
				interestId: true,
			},
		});
		let interestsArray = userInterests.map(interest => interest.interestId);

		if (filters.interests !== undefined) {
			interestsArray = [...filters.interests, ...interestsArray];
		}

		const recommended = await filterUsers({
			userId: request.user.id,
			selectDistance: true,
			sortByDistance: false,
			maxDistanceMiles: 20,
			interests: interestsArray,
			...filters,
		});

		return formatFilteredUsers({
			users: recommended,
			filters,
			keyName: "recommended",
		});
	} catch (error) {
		throw error;
	}
};

export const updateOrCreateEmergencyContactHandler = async (
	request: FastifyRequest<{
		Body: EmergencyContactInput;
	}>,
	reply: FastifyReply
) => {
	try {
		const { ...emergencyContact } = request.body;

		const user = await prisma.user.findUnique({
			where: {
				id: request.user.id,
			},
			select: {
				firstName: true,
				lastName: true,
				phoneNumber: true,
			},
		});

		if (emergencyContact.phoneNumber === user?.phoneNumber) {
			return reply.status(403).send({
				message: "You cannot add yourself as an emergency contact",
			});
		}

		const existingContact = await prisma.userEmergencyContact.findUnique({
			where: {
				userId: request.user.id,
			},
		});

		await prisma.userEmergencyContact.upsert({
			where: {
				userId: request.user.id,
			},
			update: emergencyContact,
			create: {
				userId: request.user.id,
				...emergencyContact,
			},
		});

		// If the contact is new, send them a message
		if (
			!existingContact ||
			existingContact.phoneNumber !== emergencyContact.phoneNumber
		) {
			await sendSMSMessage({
				to: `${emergencyContact.phoneCountryCode}${emergencyContact.phoneNumber}`,
				body: `You have been added as an emergency contact for ${
					user?.firstName || ""
				} ${
					user?.lastName || ""
				} on YAKKA. You will be notified when they plan a meetup, and on the day of the meetup.`,
			});
		}

		return {
			message: "Emergency contact updated successfully",
		};
	} catch (error) {
		throw error;
	}
};

export const deleteEmergencyContactHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	await prisma.userEmergencyContact.delete({
		where: {
			userId: request.user.id,
		},
	});

	return {
		message: "Emergency contact deleted successfully",
	};
};

export const getEmergencyContactHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	try {
		const emergencyContact = await prisma.userEmergencyContact.findUnique({
			where: {
				userId: request.user.id,
			},
		});

		if (!emergencyContact) {
			return reply.status(404).send({
				message: "Emergency contact not found",
			});
		}

		return emergencyContact;
	} catch (error) {
		throw error;
	}
};

export const getFacebookPhotos = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const user = await prisma.user.findUnique({
		where: {
			id: request.user.id,
		},
		select: {
			account: {
				select: {
					authType: true,
					accessToken: true,
					providerAccountId: true,
				},
			},
			images: {
				select: {
					id: true,
					imageName: true,
					source: true,
				},
			},
		},
	});

	if (!user) {
		return reply.code(404).send({
			message: "Invalid user",
		});
	}

	if (user.images.length >= config.MAX_USER_PHOTOS) {
		return reply.code(403).send({
			message: "You have reached the maximum number of images",
		});
	}

	if (user?.account?.authType !== "FACEBOOK") {
		return reply.code(400).send({
			message: "You did not sign in with Facebook",
		});
	}

	// If they aready have facebook photos, return them

	if (user.images.some(image => image.source === "FACEBOOK")) {
		return {
			photos: user.images
				.filter(image => image.source === "FACEBOOK")
				.map(i => ({
					id: i.id,
					image: i.imageName,
				})),
		};
	}

	const { accessToken, providerAccountId } = user.account;

	const decryptedAccessToken = await decrypt(accessToken!);

	// To get the profile album, we need to make a request to get all of the albums
	// and then find the one with the type of profile and get the id
	let profileAlbumId: string | undefined;
	let nextUrl = `https://graph.facebook.com/v15.0/${providerAccountId}/albums`;
	let count = 0;
	// The albums endpoint paginates, so we need to loop through until we find the profile album
	while (true) {
		count++;
		const { data: albums, status } = await axios({
			url: nextUrl,
			method: "get",
			params: {
				access_token: decryptedAccessToken,
				// Grab the type and name and id
				fields: "type,name,id",
				// No limit to ensure we get all of them as we don't want to miss the profile album
				limit: 100,
			},
		});

		profileAlbumId = albums.data.find(
			(album: any) => album.type === "profile"
		)?.id;

		if (status !== 200) {
			return reply.code(400).send({
				message: "Something went wrong",
			});
		}

		if (profileAlbumId) break;

		if (!albums.paging.next) {
			return reply.code(404).send({
				message: "Could not find profile album",
			});
		}

		nextUrl = albums.paging.next;
	}

	// Get users profile pictures
	const { data: photos } = await axios({
		url: `https://graph.facebook.com/v15.0/${profileAlbumId}/photos`,
		method: "get",
		params: {
			access_token: decryptedAccessToken,
			// Grab the type and name and id
			fields: "images.type(square)",
			// Grab up to 3, depending on how many the user has
			limit: Math.min(config.MAX_USER_PHOTOS - user.images.length, 3),
		},
	});

	const previousPhoto = await prisma.userImage.findFirst({
		where: {
			userId: request.user.id,
		},
		orderBy: {
			sortOrder: "desc",
		},
	});
	// Grab the highest quality image and add it to the database
	// Order the images by the sortOrder of the previous image or 1 if there is no previous image
	let sortOrder = previousPhoto?.sortOrder ? previousPhoto.sortOrder + 1 : 1;
	const fbPhotos = (photos.data as { images: { source: string }[] }[]).flatMap(
		photoLinks => {
			if (photoLinks.images[0].source) {
				return {
					imageName: photoLinks.images[0].source,
					source: "FACEBOOK" as const,
					userId: request.user.id,
					sortOrder: sortOrder++,
				};
			}

			return [];
		}
	);

	const uploaded = [];
	for (const photo of fbPhotos) {
		const exists = await prisma.userImage.findFirst({
			where: {
				userId: request.user.id,
				imageName: photo.imageName,
			},
		});
		if (exists) continue;
		const p = await prisma.userImage.create({
			data: photo,
		});
		uploaded.push(p);
	}

	return reply.code(200).send({
		photos: uploaded.map(photo => ({ image: photo.imageName, id: photo.id })),
	});
};

export const getBlockedUsersHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const blockedUsers = await prisma.blockedUser.findMany({
		where: {
			userId: request.user.id,
		},
		select: {
			blockedUser: {
				...basicProfileSelect,
			},
		},
	});

	return {
		blockedUsers: blockedUsers.map(b => formatBasicUser(b.blockedUser)),
	};
};

export const unblockUserHandler = async (
	request: FastifyRequest<{
		Params: UserParams;
	}>,
	reply: FastifyReply
) => {
	const { userId } = request.params;

	const blockedUser = await prisma.blockedUser.findFirst({
		where: {
			userId: request.user.id,
			blockedUserId: userId,
		},
	});

	if (!blockedUser) {
		return reply.code(404).send({
			message: "Blocked user not found",
		});
	}

	await prisma.blockedUser.delete({
		where: {
			id: blockedUser.id,
		},
	});

	return {
		message: "User unblocked",
	};
};
