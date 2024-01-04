// Helper functions specific to the user module.
import { formatBasicUser } from "../../utils/dataFormatting";
import prisma from "../../utils/prisma";
import { basicProfileSelect } from "../yakka/yakka.service";
import { FindContactsInput, UserFilter } from "./user.schema";
import { filterUsers } from "./user.service";

export const calculateCoordDistance = (
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
) => {
	const R = 6371e3; // metres
	const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
	const φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180;
	const Δλ = ((lon2 - lon1) * Math.PI) / 180;

	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	// return distance in miles to two decimal places
	const miles = (R * c) / 1609.344;
	return Math.round(miles * 100) / 100;
};

// export const createTestUsers = async (lat: number, lon: number) => {
// 	// Generate 200 users using faker with coordinates near the given lat and lon

// 	const users = Array(25)
// 		.fill("")
// 		.map(() => {
// 			const user = {
// 				firstName: faker.name.firstName(),
// 				lastName: faker.name.lastName(),
// 				email: faker.internet.email(),
// 			};
// 			const userLocation = {
// 				latitude: Number(faker.address.latitude(lat + 0.1, lat - 0.1)),
// 				longitude: Number(faker.address.longitude(lon + 0.1, lon - 0.1)),
// 			};
// 			return {
// 				user,
// 				userLocation,
// 			};
// 		});

// 	for (const { user, userLocation } of users) {
// 		const userData = await prisma.user.create({
// 			data: {
// 				...user,
// 			},
// 		});

// 		await prisma.$queryRaw`
// 			INSERT INTO \`UserLocation\` (\`userId\`, \`latitude\`, \`longitude\`, \`createdAt\`,\`updatedAt\`, \`locationName\`, \`point\`) VALUES (${
// 				userData.id
// 			}, ${userLocation.latitude}, ${
// 			userLocation.longitude
// 		}, ${new Date()}, ${new Date()}, ${null}, point(${userLocation.latitude}, ${
// 			userLocation.longitude
// 		})) ON DUPLICATE KEY UPDATE \`latitude\`=${
// 			userLocation.latitude
// 		}, \`longitude\`=${
// 			userLocation.longitude
// 		}, \`updatedAt\`=${new Date()}, \`locationName\`=${null}, \`point\` = point(${
// 			userLocation.latitude
// 		}, ${userLocation.longitude});
// 		`;
// 	}

// };

export const metresToMiles = (metres: number) => {
	return metres / 1609.344;
};

export const milesToMetres = (miles: number) => {
	return miles * 1609.344;
};

export const formatFilteredUsers = ({
	users,
	filters,
	keyName,
}: {
	users: Awaited<ReturnType<typeof filterUsers>>;
	filters: UserFilter;
	keyName: string;
}) => {
	return {
		nextPage: users.length === filters.limit ? filters.page + 1 : null,
		[keyName]: users.map(u => ({
			...u,
			...formatBasicUser({
				id: u.id,
				firstName: u.firstName,
				lastName: u.lastName,

				images: [{ imageName: u.imageName, source: u.imageSource }],
				status: u.status,
				isVerified: u.isVerified,
			}),
			distanceMiles: Math.round(metresToMiles(u.distance || 0) * 10) / 10,
			averageRating: u.rating,
		})),
	};
};

export const findUsersByPhone = async (
	contacts: FindContactsInput["contacts"]
) => {
	return prisma.user.findMany({
		where: {
			phoneNumber: {
				in: [
					// TODO: This is a bit of a hack to get around the fact that some contacts have a 0 at the start of their number
					...contacts.map(contact => contact.phoneNumber),
					...contacts.map(contact => "0" + contact.phoneNumber),
				],
			},
			// Check they have a profile which will mean they have verified their phone number and filled in details
			profile: {
				id: {
					gt: 0,
				},
			},
		},
		select: {
			...basicProfileSelect.select,
			phoneNumber: true,
			phoneCountryCode: true,
		},
	});
};
