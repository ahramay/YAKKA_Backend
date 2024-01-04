import { PrismaClient } from "@prisma/client";
import { badwords, interestCategories, interests } from "./SEED_DATA";
const prisma = new PrismaClient();
// TODO: Will need to update the gestures when we change them

async function main() {
	await prisma.interestCategory.createMany({
		data: interestCategories.map(category => ({
			...category,
		})),
	});

	const interestPromise = prisma.interest.createMany({
		data: interests,
	});
	const gesturePromise = prisma.gesture.createMany({
		data: new Array(7).fill(0).map((_, i) => ({
			imageName: `Verification${i + 1}.jpeg`,
		})),
	});

	const badwordsPromise = prisma.flaggedWords.createMany({
		data: badwords.map(word => ({
			word,
		})),
	});

	await prisma.$transaction([interestPromise, gesturePromise, badwordsPromise]);

	console.log("Seeded database");
}
main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async e => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
