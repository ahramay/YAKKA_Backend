import { Chat, Message } from "@prisma/client";
import { generatePresignedGetUrl, S3_URLs } from "../../utils/aws";
import { decrypt, decryptKey } from "../../utils/crypto";

type FormatMessagesParams = Pick<Chat, "dataKey" | "id"> & {
	messages: Message[];
};
export const formatMessages = async (chat: FormatMessagesParams) => {
	const key = decryptKey(chat.dataKey);
	return await Promise.all(
		chat.messages.map(async message => ({
			...message,
			mediaUrl:
				message.type === "IMAGE" && message.mediaUrl
					? await generatePresignedGetUrl({
							fileName: message.mediaUrl,
							path: S3_URLs.chatImages(chat.id),
					  })
					: message.type === "AUDIO" && message.mediaUrl
					? await generatePresignedGetUrl({
							fileName: message.mediaUrl,
							path: S3_URLs.chatAudio(chat.id),
					  })
					: null,
			sentAt: message.createdAt,
			content:
				message.type === "TEXT"
					? decrypt(message.content, key)
					: message.content,
		}))
	);
};
