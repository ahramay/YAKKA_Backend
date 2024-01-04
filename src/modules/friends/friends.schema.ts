import { z } from "zod";
import { RequestStatus } from "@prisma/client";
import { basicProfileSchema } from "../user/user.schema";
export const friendRequestSchema = z.object({
	id: z.number(),
	sentAt: z.string(),
	status: z.literal(RequestStatus.PENDING),
	sender: basicProfileSchema.omit({
		status: true,
	}),
});

export const getFriendRequestsResponseSchema = z.object({
	requests: z.array(friendRequestSchema),
});

export const friendParamsSchema = z.object({
	requestId: z.string().transform(d => Number(d)),
});
export type FriendParams = z.infer<typeof friendParamsSchema>;

export const respondToFriendRequestSchema = z.object({
	accept: z.boolean(),
});
export type RespondToFriendRequest = z.infer<
	typeof respondToFriendRequestSchema
>;

export const getFriendsResponseSchema = z.object({
	friends: z.array(basicProfileSchema),
});

export const removeFriendParamsSchema = z.object({
	friendshipId: z.coerce.number(),
});
export type RemoveFriendParams = z.infer<typeof removeFriendParamsSchema>;
