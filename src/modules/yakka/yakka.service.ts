import { LazyLoad } from "../../types/globalSchemas";
import prisma from "../../utils/prisma";

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

interface YakkaFetchParams extends LazyLoad {
	userId: number;
}

const yakkaSelect = {
	id: true,
	date: true,
	status: true,
	coordinates: true,
	organiser: basicProfileSelect,
	invitee: basicProfileSelect,
	locationName: true,
	endTime: true,
};

export const fetchPlannedYakkas = async (params: YakkaFetchParams) => {
	return prisma.yakka.findMany({
		orderBy: {
			date: "asc",
		},
		where: {
			date: {
				gte: new Date(),
			},
			OR: [
				{
					inviteeId: params.userId,
				},
				{
					organiserId: params.userId,
				},
			],
			status: {
				not: "DECLINED",
			},
		},
		select: yakkaSelect,
		take: params.limit,
		skip: params.page * params.limit,
	});
};

export const fetchRecentYakkas = async (params: YakkaFetchParams) => {
	return prisma.yakka.findMany({
		orderBy: {
			date: "desc",
		},
		where: {
			date: {
				lte: new Date(),
			},
			OR: [
				{
					inviteeId: params.userId,
				},
				{
					organiserId: params.userId,
				},
			],
			status: "ACCEPTED",
		},
		select: {
			...yakkaSelect,
			YakkaReview: {
				select: {
					id: true,
					authorId: true,
					receiverId: true,
					rating: true,
				},
			},
		},
		take: params.limit,
		skip: params.page * params.limit,
	});
};

export const fetchYakka = async (yakkaId: number) => {
	return prisma.yakka.findFirst({
		where: {
			id: yakkaId,
		},
		select: yakkaSelect,
	});
};
