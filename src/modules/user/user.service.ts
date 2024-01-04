import {
	Prisma,
	User,
	UserImage,
	UserLocation,
	UserProfile,
} from "@prisma/client";
import { verify } from "crypto";
import prisma from "../../utils/prisma";
import { milesToMetres } from "./user.helper";
import { UserFilter } from "./user.schema";
export const upsertLocation = async ({
	latitude,
	longitude,
	userId,
	locationName,
}: {
	latitude: number;
	longitude: number;
	userId: number;
	locationName?: string | null;
}) => {
	// NOTE: Mysql point is backwards, needs to be long/lat
	return prisma.$queryRaw`
		INSERT INTO \`UserLocation\` (\`userId\`, \`latitude\`, \`longitude\`, \`createdAt\`,\`updatedAt\`, 
										\`locationName\`, \`point\`) 
		VALUES (${userId}, ${latitude}, ${longitude}, ${new Date()}, ${new Date()}, ${locationName}, 
				point(${longitude}, ${latitude})) 
		ON DUPLICATE KEY UPDATE \`latitude\`=${latitude}, \`longitude\`=${longitude}, 
		\`updatedAt\`=${new Date()}, \`locationName\`=${locationName}, 
		\`point\` = point(${longitude}, ${latitude});
	`;
};

export const upsertGroupLocation = async ({
	latitude,
	longitude,
	groupId,
	locationName,
}: {
	latitude: number;
	longitude: number;
	groupId: number;
	locationName?: string;
}) => {
	// NOTE: Mysql point is backwards, needs to be long/lat
	return prisma.$queryRaw`
		INSERT INTO \`GroupLocation\` (\`groupId\`, \`latitude\`, \`longitude\`, \`createdAt\`,\`updatedAt\`, 
										\`locationName\`, \`point\`) 
		VALUES (${groupId}, ${latitude}, ${longitude}, ${new Date()}, ${new Date()}, ${locationName}, 
				point(${longitude}, ${latitude})) 
		ON DUPLICATE KEY UPDATE \`latitude\`=${latitude}, \`longitude\`=${longitude}, 
		\`updatedAt\`=${new Date()}, \`locationName\`=${locationName}, 
		\`point\` = point(${longitude}, ${latitude});
	`;
};

export const filterUsers = async ({
	limit,
	page,
	genders,
	hashtags,
	interests,
	maxDistanceMiles,
	minStarRating,
	statuses,
	userId,
	friendsOnly = false,
	selectDistance,
	sortByDistance,
	search,
	verifiedOnly,
}: UserFilter & {
	userId: number;
	friendsOnly?: boolean;
} & (
		| {
				selectDistance: true;
				sortByDistance: boolean;
		  }
		| {
				selectDistance: false;
				sortByDistance?: never;
		  }
	)) => {
	const maxMeters = maxDistanceMiles ? milesToMetres(maxDistanceMiles) : null;
	// Unfortunately because we are using Spatial indexing, we can't use the Prisma client to query the database
	// So there is quite a complex raw query here, but it essentially just returns the users that match the filters
	// and are not blocked by the user or vice versa

	const users = await prisma.$queryRaw<
		(Pick<User, "id" | "firstName" | "lastName" | "status" | "isVerified"> &
			Pick<UserProfile, "gender"> & {
				imageName: string;
				distance: number;
				rating: number;
				imageSource: UserImage["source"];
			})[]
	>`
		SELECT DISTINCT
			u.id,
			u.firstName,
			u.lastName,
			u.status,
			u.isVerified,
			up.gender,
			up.bio,
		


			(SELECT \`imageName\` from UserImage WHERE userId = u.id ORDER BY sortOrder ASC LIMIT 1) as imageName,
			(SELECT \`source\` from UserImage WHERE userId = u.id ORDER BY sortOrder ASC LIMIT 1) as imageSource,


			(SELECT COUNT(*) FROM \`Yakka\` WHERE (\`organiserId\` = u.id OR \`inviteeId\` = u.id)  AND \`status\` = 'ACCEPTED') as yakkaCount,
			
			(SELECT AVG(rating) FROM \`YakkaReview\` WHERE \`receiverId\` = u.id) as rating
			${
				selectDistance
					? Prisma.sql`, ST_Distance_Sphere((SELECT point FROM UserLocation WHERE \`userId\` = ${userId}), ul.point) as distance`
					: Prisma.empty
			}
			
			
		FROM \`User\` u
		${
			selectDistance
				? Prisma.sql`
		INNER JOIN \`UserLocation\` ul ON u.id = ul.userId
		`
				: Prisma.empty
		}
		INNER JOIN \`UserProfile\` up ON u.id = up.userId
		${
			search
				? Prisma.sql`LEFT JOIN \`UserInterest\` uint ON u.id = uint.userId
		LEFT JOIN \`Interest\` i ON uint.interestId = i.id`
				: Prisma.empty
		}


		WHERE u.id != ${userId} 
		AND u.id NOT IN (SELECT \`userId\` FROM \`BannedUsers\`)
		
		AND u.id NOT IN (SELECT \`blockedUserId\` FROM \`BlockedUser\` WHERE \`userId\` = ${userId})
		AND u.id NOT IN (SELECT \`userId\` FROM \`BlockedUser\` WHERE \`blockedUserId\` = ${userId})
		${verifiedOnly ? Prisma.sql` AND u.isVerified = 1` : Prisma.empty}
		${
			friendsOnly
				? // Friends table can either be senderId or receiverId
				  Prisma.sql` AND u.id IN (SELECT \`senderId\` FROM \`Friends\` WHERE \`receiverId\` = ${userId} AND \`status\` = 'ACCEPTED' UNION SELECT \`receiverId\` FROM \`Friends\` WHERE \`senderId\` = ${userId} AND \`status\` = 'ACCEPTED')`
				: Prisma.empty
		}
		
			${
				maxMeters
					? Prisma.sql` AND ST_Distance_Sphere((SELECT point FROM UserLocation WHERE \`userId\` = ${userId}), ul.point) <= ${maxMeters}`
					: Prisma.empty
			}
		
		${
			genders
				? Prisma.sql` AND up.gender IN (${Prisma.join(genders)})`
				: Prisma.empty
		}

		${
			statuses
				? Prisma.sql` AND u.status IN (${Prisma.join(statuses)})`
				: Prisma.empty
		}
		${
			minStarRating !== undefined
				? Prisma.sql` AND (SELECT AVG(rating) FROM \`YakkaReview\` WHERE \`receiverId\` = u.id) >= ${minStarRating}`
				: Prisma.empty
		}
		${
			interests
				? Prisma.sql` AND u.id IN (SELECT \`userId\` FROM \`UserInterest\` WHERE \`interestId\` IN (${Prisma.join(
						interests
				  )}))`
				: Prisma.empty
		}
		${
			hashtags
				? Prisma.sql` AND u.id IN (SELECT \`userId\` FROM \`UserHashtag\` WHERE \`hashtagId\` IN (${Prisma.join(
						hashtags
				  )}))`
				: Prisma.empty
		}
		${
			search
				? Prisma.sql` AND (${Prisma.join(
						search.split(" ").map(word => {
							return Prisma.sql`(
						u.firstName LIKE ${`%${word}%`} OR
						u.lastName LIKE ${`%${word}%`} OR
						i.name LIKE ${`%${word}%`}
					)`;
						}),
						" OR "
				  )}) `
				: Prisma.empty
		}

		${
			sortByDistance
				? Prisma.sql` ORDER BY distance ASC `
				: friendsOnly
				? Prisma.sql` ORDER BY u.firstName ASC, u.lastName ASC `
				: Prisma.sql` ORDER BY rating DESC `
		}
		LIMIT ${limit} OFFSET ${page * limit};
		`;

	return users;
};
