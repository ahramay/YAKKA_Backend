import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "../../utils/prisma";

export const getSafetyScreenHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	// TODO: Maybe would be better to have specific tables and get rid of the contentGroup table
	// or maybe a type field which has to be unique
	const safety = await prisma.contentGroup.findFirst({
		where: {
			name: "Safety",
		},
		select: {
			items: {
				include: {
					icon: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	});

	return reply.send(safety);
};
