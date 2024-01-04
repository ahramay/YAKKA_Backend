import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { Server, Socket } from "socket.io";
import { sendPushNotifications } from "../../modules/notifications/notifications.helper";
import {
	formatS3Url,
	S3_URLs,
	uploadBase64AudioToS3,
	uploadBase64ImageToS3,
} from "../aws";
import { decryptKey, encrypt } from "../crypto";
import prisma from "../prisma";
import { JWTUser } from "./jwt";
import { MessageType } from "@prisma/client";
import { basicProfileSelect } from "../../modules/yakka/yakka.service";
import { checkForProfanity } from "../checkForProfanity";
enum SocketEvents {
	CONNECT = "connect",
	DISCONNECT = "disconnect",
	PRIVATE_MESSAGE = "private_message",
	TYPING = "typing",
	STOP_TYPING = "stop_typing",
	MESSAGE_READ = "message_read",
}

interface privateMessage {
	content: string;
	type: MessageType;
	mediaUrl: string;
	id?: string;
}

const socketIoServer = async (
	app: FastifyInstance,
	options: FastifyPluginOptions
) => {
	// Create a socket.io server
	const io = new Server(app.server, {
		cors: {
			origin: "http://localhost:3000",
			credentials: true,
		},
	});

	// Middleware to authenticate socket connections
	io.use((socket, next) => {
		// Extract token from socket connection

		const token = socket.handshake.auth.token;
		// Verify token
		try {
			let user = app.jwt.verify(token) as JWTUser;

			socket.token = token;
			socket.sender = {
				...user,
				pushNotificationToken: null,
				lastName: null,
				image: null,
			};
			next();
		} catch (e: any) {
			return next(new Error("invalid_token"));
		}
	});

	io.use(async (socket, next) => {
		const chatId = socket.handshake.auth.chatId;
		// Validate chat id
		if (!chatId) {
			return next(new Error("invalid_chat_id"));
		}

		const validChat = await prisma.userChat.findUnique({
			where: {
				userId_chatId: {
					chatId,
					userId: socket.sender.id,
				},
			},
			include: {
				chat: {
					include: {
						users: {
							include: {
								user: {
									select: {
										...basicProfileSelect.select,
										pushNotificationToken: true,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!validChat) {
			return next(new Error("invalid_chat_id"));
		}

		socket.chatId = chatId;
		// Each chat has a unique data key
		// This allows us to easily add key rotation in the future
		socket.chatDataKey = decryptKey(validChat.chat.dataKey);

		// Grab the recipient and sender data and add to the socket to avoid
		// having to query the db for it later
		const recipient = validChat.chat.users.find(
			user => user.user.id !== socket.sender.id
		)?.user;
		const sender = validChat.chat.users.find(
			user => user.user.id === socket.sender.id
		)?.user;

		if (!recipient || !sender) {
			return next(new Error("invalid_chat_id"));
		}

		socket.recipient = {
			id: recipient.id,
			firstName: recipient.firstName!,
			pushNotificationToken: recipient.pushNotificationToken,
		};
		socket.sender.pushNotificationToken = sender.pushNotificationToken;
		socket.sender.firstName = sender.firstName;
		socket.sender.lastName = sender.lastName;
		socket.sender.image = formatS3Url({
			path: S3_URLs.userImages(sender.id),
			fileName: sender.images[0]?.imageName,
		});
		next();
	});

	app.ready(err => {
		if (err) throw err;

		io.on(SocketEvents.CONNECT, (socket: Socket) => {
			// join the socket to the chat room
			socket.join(socket.chatId);

			socket.on(SocketEvents.PRIVATE_MESSAGE, async (data: privateMessage) => {
				// handle the incoming message
				let { content, type } = data;

				let mediaUrl;
				if (data.type === "IMAGE") {
					content = socket.sender.firstName
						? `${socket.sender.firstName} sent an image`
						: "Image";
					mediaUrl = await uploadBase64ImageToS3({
						base64: data.content,
						path: S3_URLs.chatImages(socket.chatId),
						generatePresignedGetUrl: true,
					});
				} else if (data.type === "AUDIO") {
					content = socket.sender.firstName
						? `${socket.sender.firstName} sent a voice message`
						: "Voice message";
					mediaUrl = await uploadBase64AudioToS3({
						base64: data.content,
						path: S3_URLs.chatAudio(socket.chatId),
						generatePresignedGetUrl: true,
					});
				} else if (data.type === "TEXT") {
					content = encrypt(data.content, socket.chatDataKey);
				}

				socket.to(socket.chatId).emit(SocketEvents.PRIVATE_MESSAGE, {
					content: data.type === "TEXT" ? data.content : content,
					senderId: socket.sender.id,
					type: data.type,
					mediaUrl: mediaUrl?.presignedGetUrl,
					sentAt: new Date(),
				});

				await prisma.message.create({
					data: {
						chatId: socket.chatId,
						senderId: socket.sender.id,
						content,
						type: data.type,
						mediaUrl: mediaUrl?.fileName,
					},
				});

				// Update the recipients chat to show that they have unread messages

				await prisma.userChat.update({
					where: {
						userId_chatId: {
							chatId: socket.chatId,
							userId: socket.recipient.id,
						},
					},
					data: {
						hasUnreadMessages: true,
					},
				});

				// io.sockets.adapter.rooms.get(firstPlayerName).size;

				await sendPushNotifications([
					{
						pushToken: socket.recipient.pushNotificationToken,
						body:
							data.type === "TEXT"
								? `${socket.sender.firstName || "New Message"}: ${
										data.content.length > 20
											? data.content.slice(0, 20) + "..."
											: data.content
								  }`
								: content,
						data: {
							chatId: socket.chatId,
							type: "NEW_MESSAGE",
							friend: {
								id: socket.sender.id,
								firstName: socket.sender.firstName,
								lastName: socket.sender.lastName,
								image: socket.sender.image,
							},
						},
					},
				]);
			});

			socket.on(SocketEvents.MESSAGE_READ, async () => {
				await prisma.userChat.update({
					where: {
						userId_chatId: {
							chatId: socket.chatId,
							userId: socket.sender.id,
						},
					},
					data: {
						hasUnreadMessages: false,
					},
				});
			});

			socket.on(SocketEvents.TYPING, async () => {
				socket.to(socket.chatId).emit(SocketEvents.TYPING, {
					senderId: socket.sender.id,
				});
			});

			socket.on(SocketEvents.STOP_TYPING, async () => {
				socket.to(socket.chatId).emit(SocketEvents.STOP_TYPING, {
					senderId: socket.sender.id,
				});
			});
		});
	});

	app.decorate("io", io);

	app.addHook("onClose", (app, done) => {
		app.io.close();
		done();
	});
};

export default fp(socketIoServer);
