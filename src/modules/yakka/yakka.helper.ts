import { Prisma, Yakka } from "@prisma/client";
import { format } from "date-fns";
import { formatBasicUser } from "../../utils/dataFormatting";
import { yakkaDateFormat } from "../../utils/dates";
import { createGoogleMapsLink } from "../../utils/googlemaps";

import { fetchPlannedYakkas, fetchRecentYakkas } from "./yakka.service";
import { sendSMSMessage } from "../../utils/twilio";

type PlannedYakkas = Awaited<ReturnType<typeof fetchPlannedYakkas>>;
type RecentYakkas = Awaited<ReturnType<typeof fetchRecentYakkas>>;

export const formatYakkaList = ({
	userId,
	yakkas,
}: {
	userId: number;
	yakkas: PlannedYakkas | RecentYakkas;
}) => {
	// If it has reviews
	// Check if property exists
	// If it does, return

	return yakkas.map(y => ({
		...y,

		startTimestamp: y.date,
		endTimestamp: y.endTime,
		coordinates: {
			latitude: Number(y.coordinates.split(",")[0]),
			longitude: Number(y.coordinates.split(",")[1]),
		},
		attendee: formatAttendee(y, userId),

		// If recent show reviews

		yourReview:
			"YakkaReview" in y
				? y.YakkaReview.find(yr => yr.authorId === userId) || null
				: null,
	}));
};

export const formatAttendee = (y: PlannedYakkas[number], userId: number) => {
	// When listing Yakkas, we need to show the info for the other party.
	// So we check which one the user is, and return the other.
	if (y.organiser.id === userId) {
		return formatBasicUser(y.invitee);
	}
	return formatBasicUser(y.organiser);
};

type YakkaPerson = {
	firstName: string | null;
	lastName: string | null;
	userEmergencyContact: {
		phoneCountryCode: string;
		phoneNumber: string;
	} | null;
};

export const alertTrustedContacts = async (
	yakka: Pick<Yakka, "locationName" | "coordinates" | "date"> & {
		organiser: YakkaPerson;
		invitee: YakkaPerson;
	},
	messageVariant: "planned" | "reminder"
) => {
	const location = {
		name: yakka.locationName,
		coordinates: {
			latitude: Number(yakka.coordinates.split(",")[0]),
			longitude: Number(yakka.coordinates.split(",")[1]),
		},
		w3wLink: "",
	};

	location.w3wLink = createGoogleMapsLink(
		location.coordinates.latitude,
		location.coordinates.longitude
	);
	const time = format(yakka.date, "h:mm a");

	[
		{
			...yakka.organiser,
			...location,
			time,
			otherPersonName: {
				firstName: yakka.invitee.firstName,
				lastName: yakka.invitee.lastName,
			},
		},
		{
			...yakka.invitee,
			...location,
			time,
			otherPersonName: {
				firstName: yakka.organiser.firstName,
				lastName: yakka.organiser.lastName,
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
