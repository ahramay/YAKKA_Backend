import { nanoid } from "nanoid";
import config from "./config";

import {
	DeleteObjectCommand,
	DeleteObjectCommandInput,
	GetObjectCommand,
	PutObjectCommand,
	PutObjectCommandInput,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
	apiVersion: "2006-03-01",
	credentials: {
		accessKeyId: config.S3_ACCESS_KEY,
		secretAccessKey: config.S3_SECRET_KEY,
	},
	region: config.S3_REGION,
});

export const S3_URLs = {
	chatImages: (chatId: string) => `chats/${chatId}/images`,
	chatAudio: (chatId: string) => `chats/${chatId}/audio`,
	gestureExamples: `gestures/examples`,
	gestureUsers: `gestures/users`,
	groupImage: (groupId: number) => `users/${groupId}/gprofile`,
	groupCover: (groupId: number) => `users/${groupId}/gcover`,
	userImages: (userId: number) => `users/${userId}`,
	coverImage: (userId: number) => `users/${userId}/cover`,
};

// Helper functions

export const formatS3Url = ({
	path,
	fileName,
}: {
	path: string;
	fileName: string;
}) =>
	`https://${config.S3_BUCKET_NAME}.s3.${config.S3_REGION}.amazonaws.com/${path}/${fileName}`;

interface UploadToS3Params {
	base64: string;
	path: string;
	generatePresignedGetUrl?: boolean;
}

export const generatePresignedGetUrl = async (params: {
	path: string;
	fileName: string;
}) => {
	const command = new GetObjectCommand({
		Bucket: config.S3_BUCKET_NAME,
		Key: `${params.path}/${params.fileName}`,
	});
	const upload = await getSignedUrl(client, command, {
		expiresIn: 3600,
	});

	return upload;
};

export const uploadBase64AudioToS3 = async (params: UploadToS3Params) => {
	// create a regex to match the following: data:audio/x-m4a;base64,
	const base64Data = Buffer.from(
		params.base64.replace(/^data:.*;base64,/, ""),
		"base64"
	);

	const fileName = `${nanoid()}.m4a`;
	const reqConfig: PutObjectCommandInput = {
		Bucket: config.S3_BUCKET_NAME,
		Key: `${params.path}/${fileName}`,
		Body: base64Data,
		ContentEncoding: "base64",
		ContentType: `audio/m4a`,
	};

	// Error should be caught by caller
	const upload = await client.send(new PutObjectCommand(reqConfig));
	console.log("upploaded! check",upload);
	return {
		url: formatS3Url({
			fileName,
			path: params.path,
		}),
		fileName,
		presignedGetUrl: params.generatePresignedGetUrl
			? await generatePresignedGetUrl({ fileName, path: params.path })
			: undefined,
	};
};

export const uploadBase64ImageToS3 = async (params: UploadToS3Params) => {
	const base64Data = Buffer.from(
		params.base64.replace(/^data:image\/\w+;base64,/, ""),
		"base64"
	);

	const fileName = `${nanoid()}.jpeg`;
	const reqConfig: PutObjectCommandInput = {
		Bucket: config.S3_BUCKET_NAME,
		Key: `${params.path}/${fileName}`,
		Body: base64Data,
		ContentEncoding: "base64",
		ContentType: `image/jpeg`,
	};

	const upload = await client.send(new PutObjectCommand(reqConfig));

	console.log("upploaded!", upload);
	return {
		url: formatS3Url({
			fileName,
			path: params.path,
		}),
		fileName,
		presignedGetUrl: params.generatePresignedGetUrl
			? await generatePresignedGetUrl({ fileName, path: params.path })
			: undefined,
	};
};

export const removeS3Image = async (params: {
	path: string;
	fileName: string;
}) => {
	const reqConfig: DeleteObjectCommandInput = {
		Bucket: config.S3_BUCKET_NAME,
		Key: `${params.path}/${params.fileName}`,
	};

	// Error should be caught by caller
	const upload = await client.send(new DeleteObjectCommand(reqConfig));
};
