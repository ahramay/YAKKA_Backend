import { FastifyReply, FastifyRequest } from "fastify";
import { LazyLoad } from "../../types/globalSchemas";
import { calculateDistanceInMilesCustom, checkIsBlocked, nextPage } from "../../utils/globalHelpers";
import prisma from "../../utils/prisma";
import {
	notificationText,
	sendPushNotifications,
} from "../notifications/notifications.helper";
import {
	filterUserAndGroupDistance,
	filterUsersWithinGivenMiles,
	//  alertTrustedContacts,
	formatYakkaList,
} from "./yakkaGroup.helper";
import {
	CreateGroupYakka,
	UpdateYakka,
	GroupParams,
	GroupYakkaResponse,
	CreateInvite,
	GroupFilteration,
} from "./yakkaGroup.schema";
import {
	fetchPlannedGroupYakkas,
	fetchRecentGroupYakkas,
	fetchGroup,
	// filterGroups,
} from "./yakkaGroup.service";
import { alertTrustedContacts } from "./yakkaGroup.helper";
import { GroupFilter } from "./yakkaGroup.schema";
import {
	S3_URLs,
	formatS3Url,
	removeS3Image,
	uploadBase64ImageToS3,
} from "../../utils/aws";
import { upsertGroupLocation } from "../user/user.service";

export const createGroupHandler = async (
	request: FastifyRequest<{ Body: CreateGroupYakka }>,
	reply: FastifyReply
) => {
	const {
		name,
		description,
		date,
		endTime,
		categories,
		isPrivate,
		profileImage,
		paymentAmount,
		paymentUrl,
		coordinates,
		locationName,
		coverImage,
		groupGender,
		frequency,
		repeatFor,
		hashtags,
	} = request.body;

	const user = await prisma.user.findUnique({
		where: {
			id: request.user.id,
		},
		select: {
			isVerified: true,
		},
	});
	if (!user) {
		throw new Error("User not found");
	}
	if (!user.isVerified) {
		return reply
			.status(403)
			.send({ message: "You need to verify your account first" });
	}

	const formattedStartTime = new Date(date).setSeconds(0, 0);
	const formattedEndTime = new Date(endTime).setSeconds(0, 0);

	const group = await prisma.group.create({
		data: {
			organiserId: request.user.id,
			name,
			description,
			date: new Date(formattedStartTime),
			endTime: new Date(formattedEndTime),
			isPrivate,
			paymentAmount,
			paymentUrl,
			groupGender: groupGender[0],
			frequency: frequency[0],
			repeatFor: repeatFor[0],
		},
		select: {
			id: true,
			organiser: {
				select: {
					firstName: true,
				},
			},
		},
	});

	if (group) {
		let groupId: number = group.id;

		console.log("Cates", categories);
		if (categories) {
			try {
				categories.map(async category => {
					console.log(category);
					await prisma.groupCategory.createMany({
						data: {
							groupId: groupId,
							categoryId: category,
						},
					});
				});
				console.log("🚀 Categories Updated Success 🚀");
			} catch (error) {
				console.log("❌ Group Categories Failed ❌");
			}
		}

		if (coordinates) {
			try {
				await upsertGroupLocation({ ...coordinates, groupId, locationName });
				console.log("🚀 Group Location Updated Success 🚀");
			} catch (error) {
				console.error("❌ Group Location Updated Failed ❌", error);
			}
		}

		if (profileImage) {
			try {
				const { url, fileName: imageName } = await uploadBase64ImageToS3({
					base64: profileImage,
					path: S3_URLs.groupImage(groupId),
				});
				if (imageName) {
					await prisma.group.update({
						where: {
							id: groupId,
						},
						data: {
							profileImage: imageName,
						},
					});
				}
				console.log("🚀 Group Profile Upload Success 🚀");
			} catch (error) {
				console.error("❌ Group Profile Failed ❌", error);
			}
		}

		if (coverImage) {
			try {
				const { url, fileName: imageName } = await uploadBase64ImageToS3({
					base64: coverImage,
					path: S3_URLs.groupCover(groupId),
				});

				if (imageName) {
					await prisma.group.update({
						where: {
							id: groupId,
						},
						data: {
							coverImage: imageName,
						},
					});
				}
				console.log("🚀 Group Cover Upload Success 🚀");
			} catch (error) {
				console.error("❌ Group Cover Failed ❌", error);
			}
		}

		if (hashtags) {
			try {
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

				const groupHashtags = dbHashtags.map(hashtag => ({
					groupId: group.id,
					hashtagId: hashtag.id,
				}));

				await prisma.groupHashtag.createMany({
					data: groupHashtags,
					skipDuplicates: true,
				});
			} catch (error) {
				throw error;
			}
		}

		/*  Calculation Distance of User from Group Location */
		if (coordinates && isPrivate === false) {
			const findNearByUsers = await filterUsersWithinGivenMiles({
				distance: 30,
				longitude: coordinates.longitude,
				latitude: coordinates.latitude,
			});
			console.log("Users  LOCATION BASED", findNearByUsers);

			if (findNearByUsers) {
				const users = await prisma.user.findMany({
					where: {
						id: {
							in: findNearByUsers,
						},
					},
				});

				console.log("CHECK NOTIFY USER", users);

				// console.log("Sending 30 Miles Group created Notification");
				// const users = await prisma.user.findMany({
				// 	where: {
				// 		id: {
				// 		  in: f,
				// 		},
				// 	  },
				// });

				/*  Saving Notofication to DB Below */
				const {clause, type} = notificationText.NEARBY_GROUP_CREATED
				try {
					await prisma.notification.createMany({
						data: users.map(user => ({
							userId: user.id,
							prepositionName: 'Someone',
							type,
							clause,
							yakkaId: groupId,
							senderId: request.user.id,
						})),
					});
				} catch (error) {
					console.log("ERROR FROM CREATION", error);
				}

				/*  Sending Notification Here */

				try {
					await sendPushNotifications(
						users.map(user => ({
							body: "Match Found: New YAKKA Group is created In your Area",
							pushToken: user.pushNotificationToken,
							incrementUnreadCount: true,
							userId: user.id,
							data: {
								type: "NEARBY_GROUP_CREATED",
								groupId: groupId,
							},
						}))
					);
				} catch (error) {
					console.log("EXPO NOTIFY", error);
				}
			}
		}

		return reply.status(201).send({
			id: group.id,
			message: "Group created successfully",
		});
	} else {
		return reply.status(400).send({
			message: "Failed to create Group",
		});
	}
};

export const getAllCategoriesHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	const categories = await prisma.interestCategory.findMany();
	if (!categories) {
		return reply.code(404).send({
			message: "Failed to fetch Categories",
		});
	}

	return reply.code(200).send({ categories: categories });
};

/** NEW API FILTER */


export const filterGroupsOnKeys = async (
	request: FastifyRequest<{ Body: GroupFilteration }>,
	replay: FastifyReply
) => {
	const { genders, date, distance, hashTags, categories, rating , isFavourite} =
		request.body;


	const formatedDate =  date?.toISOString().split('T')[0]
	// console.log("CHECK QUERY", genders, date, distance, hashTags,isFavourite,rating )

	// TODO: Add rating, isFavourite base filtration when rating is implemented

	const user = await prisma.user.findFirst({
		where: {
			id: request.user.id
		},
		include: {
			location: true
		}
	})

	if(!user){
		return replay.code(404).send({
			message: "User Not Found!",
		});
	}
	const filters:any = {
		isPrivate: false
	}
	// console.log("Check Distance ",distance?.max, distance?.min, "AND", user.location)

	if (distance?.max !== undefined && distance?.min !== undefined) {
		const groupLocationBase = await filterUserAndGroupDistance({
			max: distance?.max,
			min: distance?.min,
			longitude: user.location?.longitude,
			latitude: user.location?.latitude
		})
		if(groupLocationBase && groupLocationBase.length > 0){
			filters.id = { in: (groupLocationBase as number[]) }
		}
	}
	
if (genders && genders.length > 0) filters.groupGender = { in: (genders as string[]) };
if (date) filters.date = {gte: new Date(`${formatedDate}T00:00:00.000Z`), 
lt: new Date(`${formatedDate}T23:59:59.999Z`), };


if (categories && categories?.length > 0) {
    filters.categories = {
				some: {
					categoryId: {
						in : (categories as string[])
					}
				}
			}
    };

console.log("filters Check", filters)

  const groups = await prisma.group.findMany(
	{ 
		where: filters, 
		include:{
			categories:{
				select:{
					category: true
					}
				},
				groupLocation: true,
				hashtags:{
					select:{
						hashTags: true
					}
				}
				}
		}
	);

	let formattedGroups = [] as any;
	for (const group of groups) {

		const groupMiles = calculateDistanceInMilesCustom({
			givenLatitude: user.location?.latitude,
			givenLongitude: user.location?.longitude,
			toCompareWithLatitude: group.groupLocation.map(lat => lat.latitude)[0],
			toCompareWithLongitude: group.groupLocation.map(long => long.longitude)[0]

		})
		const locationName = group?.groupLocation.map(location => location?.locationName)
		const HashTagsName = group?.hashtags.map(hashtags => hashtags?.hashTags.name)
		const formattedCategories = group?.categories?.map(
			categoryName => categoryName?.category.name
		);
		formattedGroups.push({
			...group,
			hashtags: HashTagsName,
			groupMiles: groupMiles >= 0 ? Math.round(groupMiles) : 0,
			locationName: locationName,
			categories: formattedCategories,
			coverImage: group.coverImage ? formatS3Url({
					fileName: group.coverImage,
					path: S3_URLs.groupCover(group.id),
			  })
			: null,
			profileImage: group.profileImage ? formatS3Url({
				fileName: group.profileImage,
				path: S3_URLs.groupImage(group.id),
		  })
		: null,
			
		});
	}

	console.log(formattedGroups)
	return {
		filteredGroups: formattedGroups,
		message: "Filteration Successfull"
	}
};

export const createInviteHandler = async (
	request: FastifyRequest<{ Body: CreateInvite }>,
	reply: FastifyReply
) => {
	const { groupId, userId } = request.body;
	const group = await prisma.group.findUnique({
		where: { id: groupId },
		include: { organiser: true, invites: { where: { userId } } },
	});
	if (!group) {
		return reply.status(404).send({ message: "Group request not found" });
	}
	// only two cases are possible to allow users to invite other users
	// user is the organiser
	// user is invited AND status is accepted

	console.log("😶‍🌫️ FOUND TEH GROUP", group);
	if (
		request.user.id !== group.organiserId &&
		(!group.invites[0] || group.invites[0].status !== "ACCEPTED")
	) {
		return reply
			.status(404)
			.send({ message: "Invitations not allowed for this user." });
	}
	// check if there is already an invite for this user to this group
	const existingInvite = await prisma.groupInvite.findFirst({
		where: { userId, groupId },
	});
	if (existingInvite) {
		return reply
			.status(409)
			.send({ message: "User already invited to this group." });
	}
	// group exists and user is allowed to send invites, lets create the invite
	try {
		const invite = await prisma.groupInvite.create({
			data: {
				groupId: group.id,
				userId: userId,
				status: "PENDING",
			},
			select: {
				id: true,
				user: {
					select: {
						pushNotificationToken: true,
						firstName: true,
						userEmergencyContact: {
							select: {
								phoneNumber: true,
								phoneCountryCode: true,
							},
						},
					},
				},
			},
		});
		const { clause, type } = notificationText.GROUP_INVITE;
		console.log("😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️ CREATING NOTIFICATION", {
			prepositionName: group.organiser.firstName || "Someone",
			clause,
			userId,
			type,
			yakkaId: group.id,
			senderId: request.user.id,
		});
		await prisma.notification.create({
			data: {
				prepositionName: group.organiser.firstName || "Someone",
				clause,
				userId,

				type,
				groupId,
				senderId: request.user.id,
			},
		});
		console.log("😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️ SENDING PUSH NOTIFICATION", {
			body: `${group.organiser.firstName || "Someone"} ${clause}`,
			data: {
				type,
				yakkaId: group.id,
			},
			pushToken: invite.user.pushNotificationToken,
			incrementUnreadCount: true,
			userId,
		});
		await sendPushNotifications([
			{
				body: `${group.organiser.firstName || "Someone"} ${clause}`,
				data: {
					type,
					yakkaId: group.id,
				},
				pushToken: invite.user.pushNotificationToken,
				incrementUnreadCount: true,
				userId,
			},
		]);
		return { message: "Invite issued successfully.", inviteId: invite.id };
	} catch (error) {
		throw error;
	}
};

export const groupResponseHandler = async (
	request: FastifyRequest<{ Params: GroupParams; Body: GroupYakkaResponse }>,
	reply: FastifyReply
) => {
	const { groupId } = request.params;
	const { accept } = request.body;

	try {
		const GroupYakkaRequest = await prisma.group.findUnique({
			where: {
				id: groupId,
			},
			include: {
				organiser: {
					select: {
						firstName: true,
						lastName: true,
						pushNotificationToken: true,
						userEmergencyContact: {
							select: {
								phoneNumber: true,
								phoneCountryCode: true,
							},
						},
					},
				},
				invites: {
					where: {
						userId: request.user.id,
					},
					select: {
						status: true,
						id: true,
						user: {
							select: {
								firstName: true,
								lastName: true,
								pushNotificationToken: true,
								userEmergencyContact: {
									select: {
										phoneNumber: true,
										phoneCountryCode: true,
									},
								},
							},
						},
					},
				},
			},
		});

		// Sanity checks

		if (!GroupYakkaRequest || !GroupYakkaRequest?.invites[0]) {
			return reply.status(404).send({ message: "Group request not found" });
		}
		if (GroupYakkaRequest.organiserId === request.user.id) {
			return reply
				.status(403)
				.send({ message: "You can't respond to a request that you sent." });
		}
		if (GroupYakkaRequest.invites[0].status !== "PENDING") {
			return reply
				.status(409)
				.send({ message: "You have already responded to this request" });
		}
		// this will have to be left out based on the fact groups will be able to be recurring.
		// if (!GroupYakkaRequest.date || GroupYakkaRequest.date < new Date()) {
		// return reply.status(409).send({
		// message: "You can't respond to a Group that has already happened",
		// });
		// }

		// Update the yakka

		await prisma.groupInvite.update({
			where: {
				id: GroupYakkaRequest?.invites[0].id,
			},
			data: {
				status: accept ? "ACCEPTED" : "DECLINED",
			},
		});

		// Clear the invite notification
		const notification = await prisma.notification.findFirst({
			where: {
				yakkaId: GroupYakkaRequest.id,
				type: "YAKKA_INVITE",
			},
		});
		if (notification) {
			await prisma.notification.update({
				where: {
					id: notification.id,
				},
				data: {
					isActioned: true,
				},
			});
		}
		//  send a notification to the organiser
		// and send a text to both emergency contacts if the yakka is accepted

		const { type, clause } =
			notificationText[accept ? "YAKKA_ACCEPTED" : "YAKKA_DECLINED"];
		// Send the response notification

		await prisma.notification.create({
			data: {
				clause,
				prepositionName:
					GroupYakkaRequest.invites[0].user.firstName || "Someone",
				type,
				yakkaId: GroupYakkaRequest.id,
				userId: GroupYakkaRequest.organiserId,
				senderId: request.user.id,
			},
		});

		await sendPushNotifications([
			{
				body: `${
					GroupYakkaRequest.invites[0].user.firstName || "Someone"
				} ${clause}`,
				data: {
					type,
					yakkaId: GroupYakkaRequest.id,
				},
				pushToken: GroupYakkaRequest.organiser.pushNotificationToken,
				incrementUnreadCount: true,
				userId: GroupYakkaRequest.organiserId,
			},
		]);
		if (accept) {
			await alertTrustedContacts(GroupYakkaRequest, "planned");
		}

		return reply.send({ message: "Group request updated" });
	} catch (error) {
		throw error;
	}
};

export const getPlannedGroupYakkasHandler = async (
	request: FastifyRequest<{
		Querystring: LazyLoad;
	}>,
	reply: FastifyReply
) => {
	const { limit, page } = request.query;

	// console.log("PlannedGroupsTest=>", limit, page);

	const groups = await fetchPlannedGroupYakkas({
		userId: request.user.id,
		limit,
		page,
	});
	console.log("❌❌❌❌ sending", groups);
	return { planned: groups };
};

// export const nearbyGroupsHandler = async (
// 	request: FastifyRequest<{
// Querystring: GroupFilter;
// 	}>,
// 	reply: FastifyReply
// ) => {
// 	try {
// 		const { maxDistanceMiles = 200, ...filters } = request.query;

// 		console.log(request.query);
// 		const userLocation = await prisma.userLocation.findUnique({
// 			where: {
// 				// TODO: come up with a solution for getting the groups
// 				userId: request.user.id,
// 			},
// 		});

// 		if (!userLocation) {
// 			return reply.status(400).send({ message: "User location not found" });
// 		}
// 		// TODO: finish this api
// 		const groups = await filterGroups({
// 			userId: request.user.id,
// 			selectDistance: true,
// 			sortByDistance: true,
// 			maxDistanceMiles,
// 			...filters,
// 		});

// 		return formatFilteredGroups({ groups, filters, keyName: "nearby" });
// 	} catch (error) {
// 		throw error;
// 	}
// };

export const getRecentGroupYakkasHandler = async (
	request: FastifyRequest<{
		Querystring: LazyLoad;
	}>,
	reply: FastifyReply
) => {
	const { limit, page } = request.query;
	const groupYakkas = await fetchRecentGroupYakkas({
		userId: request.user.id,
		limit,
		page,
	});

	console.log("CheckRecentYakkas", groupYakkas);

	return {
		recent: groupYakkas,
		nextPage: nextPage(groupYakkas, limit, page),
	};
};

export const getGroupYakkaHandler = async (
	request: FastifyRequest<{
		Params: GroupParams;
	}>,
	reply: FastifyReply
) => {
	console.log("❤️❤️❤️❤️ THIS IS THE QUERY PARAMS", request.params);
	const { groupId } = request.params;
	const groupYakka = await fetchGroup(groupId);
	// const longitude : number = 71.4627676
	// const latitude : number = 30.9735115

	// try {
	// 	const checkUsers = await filterUsersWithinGivenMiles({distance: 30, longitude, latitude })

	// 	console.log("❤️ 30 Miles Users ❤️",checkUsers )

	// } catch (error) {
	// 	console.log("😶‍🌫️😶‍🌫️😶‍🌫️ Miles Error", error)

	// }

	console.log("❤️😶‍🌫️😶‍🌫️😶‍🌫️❤️ AND THIS IS THE FOUND GROUP", groupYakka);

	if (!groupYakka) {
		return reply.status(404).send({ message: "Group not found" });
	}

	const invite = await prisma.groupInvite.findMany({
		where: {
			userId: request.user.id,
		},
	});

	console.log("this is the Invites 😶‍🌫️❤️😶‍🌫️❤️😶‍🌫️❤️😶‍🌫️😶‍🌫️", invite);

	// const groupHashtags = await prisma.groupHashtag.findMany({
	// 	where: {
	// 		groupId: groupYakka.id,
	// 	},
	// 	include: {
	// 		hashTags: true,
	// 	},
	// });

	const locationName = groupYakka?.groupLocation.map(
		location => location?.locationName
	);

	const formattedHashtags = groupYakka?.hashtags.map(
		hashtag => hashtag.hashTags.name
	);
	console.log("This is HashTags 😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️", formattedHashtags);

	const formattedCategories = groupYakka?.categories?.map(
		categoryName => categoryName?.category.name
	);

	console.log("This is the Categories 😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️", formattedCategories);

	// // if (
	// // groupYakka.organiser.id !== request.user.id
	// // ) {
	// // return reply.status(403).send({ message: "You can't view this YAKKA" });
	// // }
	const groupResponse = {
		...groupYakka,
		hashtags: formattedHashtags,
		categories: formattedCategories,
		locationName: locationName,
		coverImage: groupYakka?.coverImage
			? formatS3Url({
					fileName: groupYakka?.coverImage,
					path: S3_URLs.groupCover(groupYakka.id),
			  })
			: null,
		profileImage: groupYakka?.profileImage
			? formatS3Url({
					fileName: groupYakka?.profileImage,
					path: S3_URLs.groupImage(groupYakka?.id),
			  })
			: null,
	};

	console.log({
		...groupResponse,
		isOrganiser: groupYakka.organiserId === request.user.id,
		isMember: invite[0] && invite[0].status === "ACCEPTED" ? true : false,
		isInvited: invite[0] ? true : false,
	});
	return {
		groupYakka: {
			...groupResponse,
			isOrganiser: groupYakka.organiserId === request.user.id,
			isMember: invite[0] && invite[0].status === "ACCEPTED" ? true : false,
			isInvited: invite[0] ? true : false,
		},
	};
};

export const updateGroupYakkaHandler = async (
	request: FastifyRequest<{ Params: GroupParams; Body: UpdateYakka }>,
	reply: FastifyReply
) => {
	const { groupId } = request.params;
	const { hashtags, ...rest } = request.body;

	const groupYakka = await prisma.group.findFirst({
		where: {
			id: groupId,
		},
	});

	if (!groupYakka) {
		return reply.status(404).send({ message: "Group not found" });
	}

	if (groupYakka?.organiserId !== request.user.id) {
		return reply.status(403).send({ message: "Access Denied" });
	}

	if (Object.keys(rest).length === 0) {
		return reply.status(204).send({ message: "Nothing to Update" });
	}
	/*=============> new location logic ==================*/

	if (Object.keys(rest).length !== 0) {
		if (rest?.categories) {
			rest.categories.map(async category => {
				console.log(category);
				await prisma.groupCategory.updateMany({
					where: {
						groupId: groupId,
					},
					data: {
						categoryId: category,
					},
				});
			});
		}

		/*=============> new location logic ==================*/

		if (rest?.coordinates && rest?.locationName) {
			const cords = rest.coordinates;
			await upsertGroupLocation({
				...cords,
				groupId,
				locationName: rest.locationName,
			});
		}

		if (rest?.profileImage) {
			if (groupYakka.profileImage) {
				const deleteProfile = await removeS3Image({
					path: S3_URLs.groupImage(groupYakka.id),
					fileName: groupYakka.profileImage,
				});
				console.log(
					"❌❌ Previous Group Profile Deleted Successfull ❌❌",
					deleteProfile
				);
			}
			const { fileName: imageName } = await uploadBase64ImageToS3({
				base64: rest?.profileImage,
				path: S3_URLs.groupImage(groupId),
			});
			if (imageName) {
				await prisma.group.update({
					where: {
						id: groupId,
					},
					data: {
						profileImage: imageName,
					},
				});
			}
		}

		if (rest?.coverImage) {
			if (groupYakka.coverImage) {
				const deleteCover = await removeS3Image({
					path: S3_URLs.groupCover(groupYakka.id),
					fileName: groupYakka.coverImage,
				});
				console.log(
					"❌❌ Previous Group Cover Deleted Successfull ❌❌",
					deleteCover
				);
			}
			const { fileName: imageName } = await uploadBase64ImageToS3({
				base64: rest?.coverImage,
				path: S3_URLs.groupCover(groupId),
			});

			if (imageName) {
				await prisma.group.update({
					where: {
						id: groupId,
					},
					data: {
						coverImage: imageName,
					},
				});
			}
		}

		await prisma.group.update({
			where: {
				id: groupYakka.id,
			},
			data: {
				...rest,
			},
		});
	}

	//  Notify the other user

	// const notificationRecipient =
	// 	groupYakka.organiser.id === request.user.id
	// 		? groupYakka.invites[0].user
	// 		: groupYakka.organiser;
	// const notificationSender =
	// 	groupYakka.organiser.id === request.user.id
	// 		? groupYakka.organiser
	// 		: groupYakka.invites[0].user;
	// const { clause, type } = notificationText.YAKKA_UPDATED;
	// await prisma.notification.create({
	// 	data: {
	// 		clause,
	// 		prepositionName: notificationSender.firstName || "Someone",
	// 		type,
	// 		yakkaId: groupYakka.id,
	// 		userId: notificationRecipient.id,
	// 		senderId: request.user.id,
	// 	},
	// });

	// await sendPushNotifications([
	// 	{
	// 		body: `${notificationSender.firstName || "Someone"} ${clause}`,
	// 		data: {
	// 			type,
	// 			yakkaId: groupYakka.id,
	// 		},
	// 		pushToken: notificationRecipient.pushNotificationToken,
	// 		incrementUnreadCount: true,
	// 		userId: notificationRecipient.id,
	// 	},
	// ]);

	return reply.status(200).send({ message: "Group updated successfully" });
};

export const cancelGroupYakkaHandler = async (
	request: FastifyRequest<{ Params: GroupParams }>,
	reply: FastifyReply
) => {
	const { groupId } = request.params;

	const groupYakka = await prisma.group.findFirst({
		where: {
			id: groupId,
			// date: {
			// gte: new Date(),
			// },
			// OR: [
			// 	{
			// 		organiserId: request.user.id,
			// 	},
			// 	{
			// 		inviteeId: request.user.id,
			// 	},
			// ],
		},
		select: {
			id: true,
			// date: true,
			// locationName: true,
			organiser: {
				select: {
					id: true,
					firstName: true,
					pushNotificationToken: true,
				},
			},
			// invitee: {
			// select: {
			// id: true,
			// firstName: true,
			// pushNotificationToken: true,
			// },
		},
		// },
	});

	if (groupYakka && groupYakka?.organiser.id !== request.user.id) {
		return reply.status(403).send({ message: "Access Denied" });
	}
	if (!groupYakka) {
		return reply.status(404).send({ message: "Group not found" });
	}

	await prisma.group.delete({
		where: {
			id: groupYakka.id,
		},
	});

	//  Notify the other user

	// const notificationRecipient =
	// 	yakka.organiser.id === request.user.id ? yakka.invitee : yakka.organiser;
	// const notificationSender =
	// 	yakka.organiser.id === request.user.id ? yakka.organiser : yakka.invitee;
	// const { clause, type } = notificationText.YAKKA_CANCELLED;
	// await prisma.notification.create({
	// 	data: {
	// 		clause: `cancelled your YAKKA at ${yakka.locationName} on ${format(
	// 			new Date(yakka.date),
	// 			"do MMMM HH:mma"
	// 		)}`,
	// 		prepositionName: notificationSender.firstName || "Someone",
	// 		type,
	// 		// yakkaId: yakkaId,
	// 		userId: notificationRecipient.id,
	// 		senderId: request.user.id,
	// 	},
	// });

	// await sendPushNotifications([
	// 	{
	// 		body: `${notificationSender.firstName || "Someone"} ${clause}`,
	// 		data: {
	// 			type,
	// 			yakkaId,
	// 		},
	// 		pushToken: notificationRecipient.pushNotificationToken,
	// 		incrementUnreadCount: true,
	// 		userId: notificationRecipient.id,
	// 	},
	// ]);

	return reply.send({ message: "Group cancelled successfully" });
};



