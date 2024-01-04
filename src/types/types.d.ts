import { JWT } from "@fastify/jwt";
import { JWTUser } from "../utils/plugins/jwt";
import type { Server as SocketIOServer } from "socket.io";
declare module "fastify" {
	interface FastifyRequest {
		jwt: JWT;
	}

	interface FastifyInstance {
		authenticate: () => Promise<void>;
		checkBlockList: () => Promise<void>;
		strictCheckBlockList: () => Promise<void>;
		io: SocketIOServer;
	}
}

declare module "@fastify/jwt" {
	interface FastifyJWT {
		user: JWTUser;
	}

	interface VerifyPayloadType {
		user: JWTUser;
	}
}

declare module "socket.io" {
	interface Socket {
		token: string;
		sender: JWTUser & {
			pushNotificationToken: string | null;
			lastName: string | null;
			image: string | null;
		};
		chatId: string;
		chatDataKey: Buffer;
		recipient: {
			id: number;
			firstName: string;
			pushNotificationToken: string | null;
		};
	}
}
