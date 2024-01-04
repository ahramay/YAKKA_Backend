import prisma from "./prisma";

export const checkForProfanity = async (content: string) => {
	const words = await prisma.flaggedWords.findUnique({
		where: {
			word: content,
		},
	});

	return !!words;
};
