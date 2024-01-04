import { FastifyError, FastifyInstance, FastifyPluginOptions } from "fastify";
import {
	defaultResponseSchema,
	errorResponseSchema,
	lazyLoadSchema,
	securitySchema,
	userParamsSchema,
} from "../../types/globalSchemas";
import {
	addUserHashtagsHandler,
	addUserInterestsHandler,
	blockUserHandler,
	coverImageDeleteHandler,
	coverImageUploadHandler,
	createProfileHandler,
	deleteEmergencyContactHandler,
	findContactsHandler,
	findFriendsHandler,
	findRecommendedUsersHandler,
	getAllHashtagsHandler,
	getAllInterestsHandler,
	getBlockedUsersHandler,
	getEmergencyContactHandler,
	getFacebookPhotos,
	getProfileHandler,
	getReviewsHandler,
	getSignupProgressHandler,
	getVerificationImageHandler,
	imageOrderHandler,
	inviteContactsHandler,
	jobTitleSearchHandler,
	nearbyUsersHandler,
	removeUserHashtagsHandler,
	removeUserImageHandler,
	removeUserInterestsHandler,
	reportUserHandler,
	reviewUserHandler,
	searchHashtagsHandler,
	searchInterestsHandler,
	unblockUserHandler,
	updateLocationHandler,
	updateOrCreateEmergencyContactHandler,
	updateProfileHandler,
	updateUserStatusHandler,
	uploadVerificationImageHandler,
	userImageUploadHandler,
} from "./user.controller";
import {
	addUserHashtagsInputSchema,
	addUserInterestInputSchema,
	coverImageInputSchema,
	coverImageResponseSchema,
	emergencyContactInputSchema,
	findContactsInputSchema,
	findContactsResponseSchema,
	findFriendsResponseSchema,
	findNearbyUsersSchema,
	findRecommendedUsersResponseSchema,
	getAllHashtagsResponseSchema,
	getAllInterestsResponseSchema,
	getBlockedUsersResponseSchema,
	getEmergencyContactResponseSchema,
	getFacebookPhotosResponseSchema,
	getMyProfileResponseSchema,
	getProfileResponseSchema,
	getReviewsResponseSchema,
	getVerificationImageSchema,
	imageOrderInputSchema,
	jobTitleSearchInputSchema,
	profileInfoInputSchema,
	recommendedUsersFilterSchema,
	removeImageParamsSchema,
	removeUserHashtagsInputSchema,
	reportUserInputSchema,
	reviewUserInputSchema,
	searchHashtagsParamsSchema,
	searchInterestsParamsSchema,
	searchInterestsResponseSchema,
	signupProgressResponseSchema,
	updateProfileInputSchema,
	updateUserLocationInputSchema,
	UpdateUserStatusInputSchema,
	uploadVerificationImageSchema,
	userFilterScemaDefaultDistance,
	userFilterSchema,
	userImageInputSchema,
	userImagePartialResponseSchema,
	userImageResponseSchema,
} from "./user.schema";

const userRoutes = (
	app: FastifyInstance,
	_: FastifyPluginOptions,
	done: (err?: FastifyError) => void
) => {
	app.get(
		"/image-verification",
		{
			schema: {
				tags: ["Users"],

				summary: "Get a random gesture example image.",
				response: {
					200: getVerificationImageSchema,
				},
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			onRequest: app.authenticate,
		},
		getVerificationImageHandler
	);

	app.post(
		"/image-verification",
		{
			schema: {
				tags: ["Users"],

				summary: "Upload a verification image",
				body: uploadVerificationImageSchema,
				response: {
					200: defaultResponseSchema,
					404: errorResponseSchema.describe("Gesture not found"),
					409: errorResponseSchema.describe(
						"User has already uploaded an image"
					),
					500: errorResponseSchema.describe("Could not upload image"),
				},
				security: [
					{
						bearerAuth: [],
					},
				],
			},
			onRequest: app.authenticate,
		},
		uploadVerificationImageHandler
	);

	app.get(
		"/signup/progress",
		{
			schema: {
				tags: ["Users"],
				summary: "Get the progress of the user's signup",
				response: {
					200: signupProgressResponseSchema,
					404: errorResponseSchema.describe("User not found"),
				},
			},
			onRequest: app.authenticate,
		},
		getSignupProgressHandler
	);

	// Profiles
	// Create a profile
	app.post(
		"/me/profile",
		{
			schema: {
				tags: ["Users"],

				summary: "Create the user's profile",
				body: profileInfoInputSchema,
				...securitySchema,
				response: {
					200: defaultResponseSchema,
					409: errorResponseSchema.describe(
						"User has already created a profile"
					),
				},
			},
			onRequest: app.authenticate,
		},
		createProfileHandler
	);

	app.patch(
		"/me/profile",
		{
			schema: {
				tags: ["Users"],
				summary: "Update the user's profile",
				body: updateProfileInputSchema,
				...securitySchema,
				response: {
					200: defaultResponseSchema,
					404: errorResponseSchema.describe("User not found"),
				},
			},
			onRequest: app.authenticate,
		},
		updateProfileHandler
	);

	// Keep them separate for now, but we can merge them later
	app.get(
		"/me/profile",
		{
			schema: {
				tags: ["Users"],
				summary: "Get the user's profile.",
				description:
					"NOTE: Unlike the /:userId/profile route, this returns the hashtag IDs so the user can edit / delete.",
				...securitySchema,
				response: {
					200: getMyProfileResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getProfileHandler
	);

	app.get(
		"/jobs",
		{
			schema: {
				tags: ["Users"],
				summary: "Autocomplete job titles",
				querystring: jobTitleSearchInputSchema,
				// response: {
				// }
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		jobTitleSearchHandler
	);

	app.get(
		"/:userId/profile",
		{
			schema: {
				tags: ["Users"],
				summary: "Get a user's profile",
				params: userParamsSchema,
				response: {
					200: getProfileResponseSchema,
					404: errorResponseSchema.describe(
						"User not found or profile not found"
					),
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		getProfileHandler
	);

	app.get(
		"/me/reviews",
		{
			schema: {
				querystring: lazyLoadSchema,
				tags: ["Users"],
				summary: "Get all reviews for the current user",
				...securitySchema,
				response: {
					200: getReviewsResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getReviewsHandler
	);

	app.get(
		"/:userId/reviews",
		{
			schema: {
				tags: ["Users"],
				summary: "Get all reviews for a user",
				querystring: lazyLoadSchema,

				params: userParamsSchema,
				...securitySchema,
				response: {
					200: getReviewsResponseSchema,
				},
			},
			onRequest: app.authenticate,
			preHandler: app.checkBlockList,
		},
		getReviewsHandler
	);

	app.post(
		"/:userId/review",
		{
			schema: {
				tags: ["Users"],
				summary: "Review a user",
				body: reviewUserInputSchema,
				params: userParamsSchema,
				...securitySchema,
				response: {
					201: defaultResponseSchema,
					404: errorResponseSchema.describe("User not found"),
					403: errorResponseSchema.describe("User cannot review themselves"),
				},
			},
			onRequest: app.authenticate,
		},
		reviewUserHandler
	);

	// upload images route
	app.post(
		"/me/images",
		{
			schema: {
				tags: ["Users"],
				summary: "Upload images for the user's profile",
				body: userImageInputSchema,
				...securitySchema,
				response: {
					200: userImageResponseSchema,
					206: userImagePartialResponseSchema,
					403: errorResponseSchema.describe(
						"Reached the maximum number of images"
					),
					500: errorResponseSchema.describe("Could not upload images"),
				},
			},
			onRequest: app.authenticate,
		},
		userImageUploadHandler
	);

	app.post(
		"/me/images/cover",
		{
			schema: {
				tags: ["Users"],
				summary: "Upload a cover image for the user's profile",
				body: coverImageInputSchema,
				...securitySchema,
				response: {
					200: coverImageResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		coverImageUploadHandler
	);

	app.delete(
		"/me/images/cover",
		{
			schema: {
				tags: ["Users"],
				summary: "Delete the user's cover image",
				...securitySchema,
				response: {
					200: defaultResponseSchema,
					404: errorResponseSchema.describe("No cover image found"),
				},
			},
			onRequest: app.authenticate,
		},
		coverImageDeleteHandler
	);

	app.get(
		"/me/images/facebook",
		{
			schema: {
				tags: ["Users"],
				summary: "Get the user's facebook images",
				description:
					"Pull the users previous 3 profile images from facebook and save them to the database. Can only be used if the user has previously logged in with facebook",
				...securitySchema,
				response: {
					200: getFacebookPhotosResponseSchema,
					404: errorResponseSchema.describe("No facebook images found"),
				},
			},
			onRequest: app.authenticate,
		},
		getFacebookPhotos
	);

	app.put(
		"/me/images/order",
		{
			schema: {
				tags: ["Users"],
				summary: "Update the order of the user's profile images",
				description:
					"Send an array of image IDs in the order you want them to be displayed. NOTE: You must send all image IDs, not just the ones you want to change.",
				body: imageOrderInputSchema,
				...securitySchema,
				response: {
					200: defaultResponseSchema,
					400: errorResponseSchema.describe("Invalid image order"),
					404: errorResponseSchema.describe("Image not found"),
				},
			},
			onRequest: app.authenticate,
		},
		imageOrderHandler
	);

	app.delete(
		"/me/images/:imageId",
		{
			schema: {
				tags: ["Users"],
				summary: "Delete an image from the user's profile",
				params: removeImageParamsSchema,

				...securitySchema,
				response: {
					200: defaultResponseSchema,
					403: errorResponseSchema.describe(
						"User must have at least two images"
					),
					404: errorResponseSchema.describe("Image not found"),
				},
			},
			onRequest: app.authenticate,
		},
		removeUserImageHandler
	);

	app.post(
		"/contacts/find",
		{
			schema: {
				tags: ["Users"],
				summary: "Find contacts with YAKKA accounts",
				description:
					"Find contacts with YAKKA accounts by their phone numbers. This will return a list of users to display",
				body: findContactsInputSchema,
				response: {
					200: findContactsResponseSchema,
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		findContactsHandler
	);

	app.post(
		"/contacts/invite",
		{
			schema: {
				tags: ["Users"],
				summary: "Send an SMS invite to contacts",
				body: findContactsInputSchema,
				response: {
					200: defaultResponseSchema,
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		inviteContactsHandler
	);

	app.get(
		"/interests",
		{
			schema: {
				tags: ["Users"],
				summary: "Get all interests",
				response: {
					200: getAllInterestsResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getAllInterestsHandler
	);

	app.get(
		"/interests/search",
		{
			schema: {
				tags: ["Users"],
				summary: "Search interests",
				querystring: searchInterestsParamsSchema,
				response: {
					200: searchInterestsResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		searchInterestsHandler
	);

	app.post(
		"/me/interests",
		{
			schema: {
				tags: ["Users"],
				summary: "Add interests to the user's profile",
				description:
					"Takes a list of interest ids and adds them to the user's profile",
				...securitySchema,
				body: addUserInterestInputSchema,
				response: {
					200: defaultResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		addUserInterestsHandler
	);

	app.delete(
		"/me/interests",
		{
			schema: {
				tags: ["Users"],
				summary: "Remove interests from the user's profile",
				description:
					"Takes a list of interest ids and removes them from the user's profile",
				...securitySchema,
				body: addUserInterestInputSchema,
				response: {
					200: defaultResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		removeUserInterestsHandler
	);

	app.post(
		"/me/hashtags",
		{
			schema: {
				tags: ["Users"],
				summary: "Add hashtags to the user's profile",
				description:
					"Takes a list of hashtags and adds them to the user's profile",
				...securitySchema,
				body: addUserHashtagsInputSchema,
			},
			onRequest: app.authenticate,
		},

		addUserHashtagsHandler
	);

	app.delete(
		"/me/hashtags",
		{
			schema: {
				tags: ["Users"],
				summary: "Remove hashtags from the user's profile",
				description:
					"Takes a list of hashtag IDs and removes them from the user's profile",
				...securitySchema,
				body: removeUserHashtagsInputSchema,
			},
			onRequest: app.authenticate,
		},
		removeUserHashtagsHandler
	);

	app.get(
		"/hashtags",
		{
			schema: {
				tags: ["Users"],
				summary: "Get all hashtags",
				...securitySchema,
				response: {
					200: getAllHashtagsResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getAllHashtagsHandler
	);

	app.get(
		"/hashtags/search",
		{
			schema: {
				tags: ["Users"],
				summary: "Search hashtags",
				...securitySchema,
				querystring: searchHashtagsParamsSchema,
				response: {
					200: getAllHashtagsResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		searchHashtagsHandler
	);

	app.put(
		"/me/status",
		{
			schema: {
				tags: ["Users"],
				summary: "Update the user's status",
				...securitySchema,
				body: UpdateUserStatusInputSchema,
				response: {
					200: defaultResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		updateUserStatusHandler
	);

	// Block user route
	app.post(
		"/:userId/block",
		{
			schema: {
				tags: ["Users"],
				summary: "Block a user",
				...securitySchema,
				params: userParamsSchema,
				response: {
					200: defaultResponseSchema,
					403: errorResponseSchema.describe("User cannot block themselves"),
					404: errorResponseSchema.describe("User not found"),
					409: errorResponseSchema.describe("User is already blocked"),
				},
			},
			onRequest: app.authenticate,
		},
		blockUserHandler
	);

	app.post(
		"/:userId/report",
		{
			schema: {
				tags: ["Users"],
				summary: "Report a user",
				...securitySchema,
				params: userParamsSchema,
				body: reportUserInputSchema,
				response: {
					200: defaultResponseSchema,
					403: errorResponseSchema.describe("User cannot report themselves"),
				},
			},
			onRequest: app.authenticate,
		},
		reportUserHandler
	);

	app.put(
		"/me/location",
		{
			schema: {
				tags: ["Users"],
				summary: "Update the user's location",
				...securitySchema,
				body: updateUserLocationInputSchema,
			},
			onRequest: app.authenticate,
		},
		updateLocationHandler
	);

	app.get(
		"/find/nearby",
		{
			schema: {
				tags: ["Users"],
				summary: "Get nearby users",
				querystring: userFilterScemaDefaultDistance,
				description:
					"Find all users within a certain radius of the user's location. Defaults to a max radius of 200 miles, however this is sorted by distance and lazy loaded.",
				response: {
					200: findNearbyUsersSchema,
					404: errorResponseSchema.describe(
						"You attempted to filter by location without providing your location"
					),
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		nearbyUsersHandler
	);

	app.get(
		"/find/friends",
		{
			schema: {
				tags: ["Users"],
				summary: "Get your friends for the find Yakkas page",
				querystring: userFilterSchema,
				response: {
					200: findFriendsResponseSchema,
					404: errorResponseSchema.describe(
						"You attempted to filter by location without providing your location"
					),
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		findFriendsHandler
	);

	app.get(
		"/find/recommended",
		{
			schema: {
				tags: ["Users"],
				summary: "Get your recommended users",
				description:
					"A recommended user is a user that has similar hashtags / interests to you",
				querystring: recommendedUsersFilterSchema,
				response: {
					200: findRecommendedUsersResponseSchema,
					404: errorResponseSchema.describe(
						"You attempted to filter by location without providing your location"
					),
				},
				...securitySchema,
			},
			onRequest: app.authenticate,
		},
		findRecommendedUsersHandler
	);

	app.put(
		"/me/emergencyContact",
		{
			schema: {
				tags: ["Users"],
				summary: "Update or create the user's emergency contact",
				description: "Update or create the user's emergency contact",
				body: emergencyContactInputSchema,
				...securitySchema,
				response: {
					200: defaultResponseSchema,
					403: errorResponseSchema.describe(
						"You cannot add yourself as an emergency contact"
					),
				},
			},
			onRequest: app.authenticate,
		},
		updateOrCreateEmergencyContactHandler
	);

	app.delete(
		"/me/emergencyContact",
		{
			schema: {
				tags: ["Users"],
				summary: "Delete the user's emergency contact",
				description: "Delete the user's emergency contact",
				...securitySchema,
				response: {
					200: defaultResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		deleteEmergencyContactHandler
	);

	app.get(
		"/me/emergencyContact",
		{
			schema: {
				tags: ["Users"],
				summary: "Get the user's emergency contact",
				...securitySchema,
				response: {
					200: getEmergencyContactResponseSchema,
					404: errorResponseSchema.describe("No emergency contact found"),
				},
			},
			onRequest: app.authenticate,
		},
		getEmergencyContactHandler
	);

	app.get(
		"/blocked",
		{
			schema: {
				tags: ["Users"],
				summary: "Get the user's blocked users",
				...securitySchema,
				response: {
					200: getBlockedUsersResponseSchema,
				},
			},
			onRequest: app.authenticate,
		},
		getBlockedUsersHandler
	);

	app.delete(
		"/blocked/:userId",
		{
			schema: {
				tags: ["Users"],
				summary: "Unblock a user",
				...securitySchema,
				response: {
					200: defaultResponseSchema,
				},
				params: userParamsSchema,
			},
			onRequest: app.authenticate,
		},

		unblockUserHandler
	);

	done();
};

export default userRoutes;
