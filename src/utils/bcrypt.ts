import bcrypt from "bcryptjs";

export const generateHash = async (plainText: string) => {
	return bcrypt.hash(plainText, 12);
};

export const compareHash = async (plainText: string, hash: string) => {
	return bcrypt.compare(plainText, hash);
};
