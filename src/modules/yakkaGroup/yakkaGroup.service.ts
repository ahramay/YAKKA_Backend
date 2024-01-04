import { Prisma } from "@prisma/client";
import { LazyLoad } from "../../types/globalSchemas";
import prisma from "../../utils/prisma";
import gmapsClient from "../../utils/googlemaps";
import config from "../../utils/config";
import { GroupFilter, UpdateGroupLocationInput } from "./yakkaGroup.schema";
import { milesToMetres } from "../user/user.helper";
import { upsertGroupLocation } from "../user/user.service";
import { FastifyReply, FastifyRequest } from "fastify";
import { S3_URLs, formatS3Url } from "../../utils/aws";

export const basicProfileSelect = {
	select: {
		id: true,
		firstName: true,
		lastName: true,
		status: true,
		images: {
			select: {
				id: true,
				imageName: true,
				source: true,
			},
			take: 1,
		},
		isVerified: true,
	},
};

interface GroupFetchParams extends LazyLoad {
	userId: number;
}

const yakkaGroupSelect = {
	id: true,
	name: true,
	description: true,
	groupGender: true,
	// organiser: basicProfileSelect,
	date: true,
	// status: true,
	// organiser: basicProfileSelect,
	// invitee: basicProfileSelect,
	coverImage: true,
	profileImage: true,
	locationName: true,
	endTime: true,
	isPrivate: true,
	paymentAmount: true,
	paymentUrl: true,
};

export const fetchPlannedGroupYakkas = async (params: GroupFetchParams) => {
	const groups = await prisma.group.findMany({
		orderBy: {
			// TODO: change this to group event occurance date when implemented
			createdAt: "asc",
		},
		where: {
			date: {
				gte: new Date(),
			},
			OR: [
				{
					organiserId: params.userId,
				},
				{
					invites: {
						some: {
							userId: params.userId,
							NOT: {
								status: "DECLINED",
							},
						},
					},
				},
			],
		},
		include: {
			organiser: true,
			invites: {
				select: {
					userId: true,
					status: true,
				},
			},
			groupLocation: {
				select: {
					locationName: true,
				}
			},
			categories: {
				select: {
					category: {
						select: {
							name: true
						}
					}
				}
			},
			hashtags: {
				select:{
					hashTags:{
						select: {
							name: true
						}
					}
				}
			} 
		},
		// status: {
		// not: "DECLINED",
		// },
		// },
		// select: yakkaGroupSelect,
		// take: params.limit,
		// skip: params.page * params.limit,
	});

	// console.log("GroupGetTest", groups);

	let formattedGroups = [] as any;
	for (const group of groups) {
		const isOrganiser = group.organiserId === params.userId;
		const isInvited = true;
		const isMember = group.invites.length
			? group.invites[0].status === "ACCEPTED"
			: isOrganiser;

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
			isOrganiser,
			isInvited,
			isMember,
			// coordinates: {
			// 	latitude: Number(group.coordinates.split(",")[0]) || 0,
			// 	longitude: Number(group.coordinates.split(",")[1]) || 0,
			// },
		});
	}

	return formattedGroups;
};

// export const filterGroups = async ({
// 	limit,
// 	page,
// 	maxDistanceMiles,
// 	userId,
// 	selectDistance,
// 	sortByDistance,
// 	search,
// 	verifiedOnly,
// }: GroupFilter & {
// 	userId: number;
// 	friendsOnly?: boolean;
// } & (
// 		| {
// 				selectDistance: true;
// 				sortByDistance: boolean;
// 		  }
// 		| {
// 				selectDistance: false;
// 				sortByDistance?: never;
// 		  }
// 	)) => {
// 	const maxMeters = maxDistanceMiles ? milesToMetres(maxDistanceMiles) : null;

// 	// TODO:  this raw query needs to be updated for groups
// 	const groups = await prisma.$queryRaw<
// 		Pick<Group, "id" | "name" | "description" | "date" | "organiserId">[]
// 	>`
// 		SELECT DISTINCT
// 			u.id,
// 			u.name,
// 			u.description,
// 			u.date,
// 			up.organiserId,
		

// 			(SELECT COUNT(*) FROM \`Yakka\` WHERE (\`organiserId\` = u.id OR \`inviteeId\` = u.id)  AND \`status\` = 'ACCEPTED') as yakkaCount,
			
// 			(SELECT AVG(rating) FROM \`YakkaReview\` WHERE \`receiverId\` = u.id) as rating
// 			${
// 				selectDistance
// 					? Prisma.sql`, ST_Distance_Sphere((SELECT point FROM UserLocation WHERE \`userId\` = ${userId}), ul.point) as distance`
// 					: Prisma.empty
// 			}
			
			
// 		FROM \`User\` u
// 		${
// 			selectDistance
// 				? Prisma.sql`
// 		INNER JOIN \`UserLocation\` ul ON u.id = ul.userId
// 		`
// 				: Prisma.empty
// 		}
// 		INNER JOIN \`UserProfile\` up ON u.id = up.userId
// 		${
// 			search
// 				? Prisma.sql`LEFT JOIN \`UserInterest\` uint ON u.id = uint.userId
// 		LEFT JOIN \`Interest\` i ON uint.interestId = i.id`
// 				: Prisma.empty
// 		}


// 		WHERE u.id != ${userId} 
// 		AND u.id NOT IN (SELECT \`userId\` FROM \`BannedUsers\`)
		
// 		AND u.id NOT IN (SELECT \`blockedUserId\` FROM \`BlockedUser\` WHERE \`userId\` = ${userId})
// 		AND u.id NOT IN (SELECT \`userId\` FROM \`BlockedUser\` WHERE \`blockedUserId\` = ${userId})
// 		${verifiedOnly ? Prisma.sql` AND u.isVerified = 1` : Prisma.empty}
// 		${
// 			friendsOnly
// 				? // Friends table can either be senderId or receiverId
// 				  Prisma.sql` AND u.id IN (SELECT \`senderId\` FROM \`Friends\` WHERE \`receiverId\` = ${userId} AND \`status\` = 'ACCEPTED' UNION SELECT \`receiverId\` FROM \`Friends\` WHERE \`senderId\` = ${userId} AND \`status\` = 'ACCEPTED')`
// 				: Prisma.empty
// 		}
		
// 			${
// 				maxMeters
// 					? Prisma.sql` AND ST_Distance_Sphere((SELECT point FROM UserLocation WHERE \`userId\` = ${userId}), ul.point) <= ${maxMeters}`
// 					: Prisma.empty
// 			}
		
// 		${
// 			genders
// 				? Prisma.sql` AND up.gender IN (${Prisma.join(genders)})`
// 				: Prisma.empty
// 		}

// 		${
// 			statuses
// 				? Prisma.sql` AND u.status IN (${Prisma.join(statuses)})`
// 				: Prisma.empty
// 		}
// 		${
// 			minStarRating !== undefined
// 				? Prisma.sql` AND (SELECT AVG(rating) FROM \`YakkaReview\` WHERE \`receiverId\` = u.id) >= ${minStarRating}`
// 				: Prisma.empty
// 		}
// 		${
// 			interests
// 				? Prisma.sql` AND u.id IN (SELECT \`userId\` FROM \`UserInterest\` WHERE \`interestId\` IN (${Prisma.join(
// 						interests
// 				  )}))`
// 				: Prisma.empty
// 		}
// 		${
// 			hashtags
// 				? Prisma.sql` AND u.id IN (SELECT \`userId\` FROM \`UserHashtag\` WHERE \`hashtagId\` IN (${Prisma.join(
// 						hashtags
// 				  )}))`
// 				: Prisma.empty
// 		}
// 		${
// 			search
// 				? Prisma.sql` AND (${Prisma.join(
// 						search.split(" ").map(word => {
// 							return Prisma.sql`(
// 						u.firstName LIKE ${`%${word}%`} OR
// 						u.lastName LIKE ${`%${word}%`} OR
// 						i.name LIKE ${`%${word}%`}
// 					)`;
// 						}),
// 						" OR "
// 				  )}) `
// 				: Prisma.empty
// 		}

// 		${
// 			sortByDistance
// 				? Prisma.sql` ORDER BY distance ASC `
// 				: friendsOnly
// 				? Prisma.sql` ORDER BY u.firstName ASC, u.lastName ASC `
// 				: Prisma.sql` ORDER BY rating DESC `
// 		}
// 		LIMIT ${limit} OFFSET ${page * limit};
// 		`;

// 	return groups;
// };

export const fetchRecentGroupYakkas = async (params: GroupFetchParams) => {
	const yakkaRecentGroups = await prisma.group.findMany({
		orderBy: {
			createdAt: "desc",
		},
		where: {
			date: {
				lte: new Date(),
			},
			OR: [
				{
					organiserId: params.userId,
				},
				{
					invites: {
						some: {
							userId: params.userId,
							status: "ACCEPTED",
						},
					},
				},
			],
		},
		select: {
			groupLocation: {
				select: {
					locationName: true,
				}
			},
			categories: {
				select: {
					category: {
						select: {
							name: true
						}
					}
				}
			},
			hashtags: {
				select:{
					hashTags:{
						select: {
							name: true
						}
					}
				}
			} ,
			...yakkaGroupSelect,
		},
		take: params.limit,
		skip: params.page * params.limit,
	});
	if(yakkaRecentGroups){

		console.log("🚀🚀🚀 Yakka Recent Groups: ", yakkaRecentGroups);

		let yakkaRecents = [] as any;
		for(let group of yakkaRecentGroups){
			const locationName = group?.groupLocation.map(location => location?.locationName)
			const formattedCategories = group?.categories?.map(
			categoryName => categoryName?.category.name
		);
		const HashTagsName = group?.hashtags.map(hashtags => hashtags?.hashTags.name)

			yakkaRecents.push({
				...group,
				hashtags: HashTagsName,
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
			})
		}
		
		return yakkaRecents;
	}else {
		return yakkaRecentGroups;
	}
};

export const fetchGroup = async (groupId: number) => {
	return prisma.group.findFirst({
		where: {
			id: groupId,
		},
		select: { ...yakkaGroupSelect, organiserId: true, organiser: true, groupLocation: {
			select: {
				locationName: true,
			}
		}, categories: {
			select: {
				category: {
					select:{
						name: true
					}
				}
			}
		},
		hashtags: {
			select:{
				hashTags:{
					select: {
						name: true
					}
				}
			}
		} 
	},
	});
};