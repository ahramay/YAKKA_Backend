import { Prisma, Group } from "@prisma/client";
import { format } from "date-fns";
import { formatBasicUser } from "../../utils/dataFormatting";
import { yakkaDateFormat } from "../../utils/dates";
import { createGoogleMapsLink } from "../../utils/googlemaps";

import {
	fetchPlannedGroupYakkas,
	fetchRecentGroupYakkas,
} from "./yakkaGroup.service";
import { sendSMSMessage } from "../../utils/twilio";
import prisma from "../../utils/prisma";

type PlannedGroupYakkas = Awaited<ReturnType<typeof fetchPlannedGroupYakkas>>;
type RecentGroupYakkas = Awaited<ReturnType<typeof fetchRecentGroupYakkas>>;

export const filterUsersWithinGivenMiles = async ({
	distance,
	longitude,
	latitude,
}: {
	distance: number;
	longitude: number;
	latitude: number;
}) => {
	const nearUsers: {
	userId: number,
    latitude: number,
    longitude: number,
    distance: number
	}[] = await prisma.$queryRaw`SELECT userId, latitude, longitude,
    (3958.8 * 2 * ASIN(SQRT(POW(SIN(RADIANS(latitude - ${latitude}) / 2), 2) +
    COS(RADIANS(${latitude})) * COS(RADIANS(latitude)) * POW(SIN(RADIANS(longitude - ${longitude}) / 2), 2)))) AS distance
FROM UserLocation
HAVING distance <= ${distance}
ORDER BY distance;`;

const userIds : number[] = nearUsers?.map(user => user?.userId)

return userIds;
};

export const filterUserAndGroupDistance = async ({
	max,
	min,
	longitude,
	latitude,
}: {
	max: number;
	min: number;
	longitude: number  | undefined;
	latitude: number | undefined;
}) => {
	const locationFilterGroups: {
	groupId: number,
    latitude: number,
    longitude: number,
    distance: number
	}[] = await prisma.$queryRaw`SELECT groupId, latitude, longitude,
    (3958.8 * 2 * ASIN(SQRT(POW(SIN(RADIANS(latitude - ${latitude}) / 2), 2) +
    COS(RADIANS(${latitude})) * COS(RADIANS(latitude)) * POW(SIN(RADIANS(longitude - ${longitude}) / 2), 2)))) AS distance
FROM GroupLocation
HAVING distance >= ${min} AND distance <= ${max}
ORDER BY distance;`;

const groupIds : number[] = locationFilterGroups?.map(user => user?.groupId)

return groupIds;
};

export const formatYakkaList = ({
	userId,
	groupYakkas,
}: {
	userId: number;
	groupYakkas: PlannedGroupYakkas | RecentGroupYakkas;
}) => {
	// 	// If it has reviews
	// 	// Check if property exists
	// 	// If it does, return
	// 	return groupYakkas;
	// 	// return groupYakkas.map(y => ({
	// 	// 	...y,
	// 	// 	startTimestamp: y.date,
	// 	// 	endTimestamp: y.endTime,
	// 	// 	coordinates: {
	// 	// 		latitude: Number(y.coordinates.split(",")[0]),
	// 	// 		longitude: Number(y.coordinates.split(",")[1]),
	// 	// 	},
	// 	// 	attendee: formatAttendee(y, userId),
	// 	// 	// If recent show reviews
	// 	// 	yourReview:
	// 	// 		"YakkaReview" in y
	// 	// 			? y.YakkaReview.find(yr => yr.authorId === userId) || null
	// 	// 			: null,
	// 	// }));
	// };
	// // export const formatAttendee = (y: PlannedGroupYakkas[number], userId: number) => {
	// // 	// When listing Yakkas, we need to show the info for the other party.
	// // 	// So we check which one the user is, and return the other.
	// // 	if (y.organiser.id === userId) {
	// // 		return formatBasicUser(y.invitee);
	// // 	}
	// // 	return formatBasicUser(y.organiser);
};

// const formatLocation = ({
// 	group,
// }: {
// 	group: res;
// 	groupYakkas: PlannedGroupYakkas | RecentGroupYakkas;
// }) {

// }

type YakkaPerson = {
	firstName: string | null;
	lastName: string | null;
	userEmergencyContact: {
		phoneCountryCode: string;
		phoneNumber: string;
	} | null;
};
type GroupInvite = {
	status: string;
	id: number;
	user: {
		firstName: string | null;
		lastName: string | null;
		userEmergencyContact: {
			phoneCountryCode: string;
			phoneNumber: string;
		} | null;
	};
};

export const alertTrustedContacts = async (
	group: Pick<Group, "locationName" | "coordinates" | "date"> & {
		organiser: YakkaPerson;
		invites: GroupInvite[];
	},
	messageVariant: "planned" | "reminder"
) => {
	const location = {
		name: group.locationName,
		coordinates: {
			latitude: Number(group.coordinates.split(",")[0]),
			longitude: Number(group.coordinates.split(",")[1]),
		},
		w3wLink: "",
	};

	location.w3wLink = createGoogleMapsLink(
		location.coordinates.latitude,
		location.coordinates.longitude
	);
	const time = format(group?.date!, "h:mm a");

	[
		{
			...group.organiser,
			...location,
			time,
			otherPersonName: {
				firstName: group.invites[0].user.firstName,
				lastName: group.invites[0].user.lastName,
			},
		},
		{
			...group.invites[0].user,
			...location,
			time,
			otherPersonName: {
				firstName: group.organiser.firstName,
				lastName: group.organiser.lastName,
			},
		},
	].forEach(async ({ firstName, userEmergencyContact, otherPersonName }) => {
		const messageVariants = {
			planned: `${firstName} has planned a YAKKA with ${
				otherPersonName.firstName || ""
			} ${otherPersonName.lastName || ""} ${
				location.name ? `at ${location.name}` : "."
			}.\n${location.w3wLink && `${location.w3wLink}`}`,
			// ----
			reminder: `${firstName} has a Yakka with ${
				otherPersonName.firstName || ""
			} ${otherPersonName.lastName || ""} ${
				location.name ? `at ${location.name}` : ""
			} today at ${time}.\n${location.w3wLink && `${location.w3wLink}`}`,
		};
		if (userEmergencyContact) {
			const { phoneNumber, phoneCountryCode } = userEmergencyContact;
			await sendSMSMessage({
				to: `${phoneCountryCode}${phoneNumber}`,
				body: messageVariants[messageVariant],
			});
		}
	});
};
