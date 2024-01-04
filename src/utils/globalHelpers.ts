import prisma from "./prisma";

export const checkIsBlocked = async ({
	currentUserId,
	otherUserId,
	strict = false,
}: {
	currentUserId: number;
	otherUserId: number;
	strict?: boolean;
}) => {
	const blocked = await prisma.blockedUser.findFirst({
		where: {
			OR: [
				{
					userId: currentUserId,
					blockedUserId: otherUserId,
				},
				{
					userId: otherUserId,
					blockedUserId: currentUserId,
				},
			],
		},
	});

	if (blocked) {
		// If strict is true, then we want to throw an error if the current user has blocked the other user
		if (blocked.userId === currentUserId && strict) {
			throw new Error("YAKKA_BLOCKED_USER");
		}
		// In all cases we want to throw an error if the other user has blocked the current user
		throw new Error("YAKKA_BLOCKED_BY_USER");
	}
};

export const nextPage = (data: any[], limit: number, page: number) =>
	data.length === limit ? page + 1 : null;

	const toRadians = (degrees: number) => degrees * (Math.PI / 180);

	export const calculateDistanceInMilesCustom = ({
		givenLatitude,
		givenLongitude,
		toCompareWithLatitude,
		toCompareWithLongitude

	} :{
		givenLatitude: number | undefined,
		givenLongitude: number | undefined,
		toCompareWithLatitude: number | undefined,
		toCompareWithLongitude: number | undefined
	}) => {
		if (
			givenLatitude &&
			givenLongitude &&
			toCompareWithLatitude &&
			toCompareWithLongitude
		) {
			const R = 3958.8; // Radius of the Earth in miles
			const dLat = toRadians(toCompareWithLatitude - givenLatitude);
			const dLon = toRadians(toCompareWithLongitude - givenLongitude);
	
			const a =
				Math.sin(dLat / 2) * Math.sin(dLat / 2) +
				Math.cos(toRadians(givenLatitude)) *
					Math.cos(toRadians(toCompareWithLatitude)) *
					Math.sin(dLon / 2) *
					Math.sin(dLon / 2);
	
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	
			const distance : number = R * c; // Distance in miles
	
			return distance;
		} else {
			return 0;
		}
	};