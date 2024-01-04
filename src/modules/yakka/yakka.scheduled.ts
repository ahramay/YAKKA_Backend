import prisma from "../../utils/prisma";
import { alertTrustedContacts } from "./yakka.helper";

export const scheduledAlertEmergencyContacts = async () => {
	console.log("scheduledAlertEmergencyContacts");
	// Grab all Yakkas that start one hour from the current minute
	const yakkas = await prisma.yakka.findMany({
		where: {
			date: {
				// Get all yakas that start today in the next hour
				gte: new Date(),
				lte: new Date(new Date().getTime() + 60 * 60 * 1000),
			},
			status: "ACCEPTED",
			emergencyContactAlerted: false,
		},
		select: {
			id: true,
			date: true,
			locationName: true,
			coordinates: true,
			invitee: {
				select: {
					firstName: true,
					lastName: true,
					userEmergencyContact: true,
				},
			},
			organiser: {
				select: {
					firstName: true,
					lastName: true,
					userEmergencyContact: true,
				},
			},
		},
	});

	// For each yakka, send a push notification to the emergency contact
	// of the invitee and organiser

	const promises = [];

	for (const yakka of yakkas) {
		promises.push(alertTrustedContacts(yakka, "reminder"));
	}
	promises.push(
		prisma.yakka.updateMany({
			where: {
				id: {
					in: yakkas.map(yakka => yakka.id),
				},
			},
			data: {
				emergencyContactAlerted: true,
			},
		})
	);
	await Promise.allSettled(promises);
};
