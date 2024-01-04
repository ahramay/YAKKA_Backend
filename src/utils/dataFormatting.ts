import { User, UserImage } from "@prisma/client";
import { formatS3Url, S3_URLs } from "./aws";

export const formatBasicUser = (
	user: Pick<
		User,
		"id" | "firstName" | "lastName" | "status" | "isVerified"
	> & {
		images: Pick<UserImage, "imageName" | "source">[];
	}
) => ({
	id: user.id,
	firstName: user.firstName,
	lastName: user.lastName,
	image: user.images[0]
		? user.images[0].source === "YAKKA"
			? formatS3Url({
					fileName: user.images[0].imageName,
					path: S3_URLs.userImages(user.id),
			  })
			: user.images[0].imageName
		: null,
	status: user.status,
	isVerified: !!user.isVerified,
});
