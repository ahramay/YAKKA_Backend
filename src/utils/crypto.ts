import crypto from "crypto";
import config from "./config";
export const createEnryptedKey = () => {
	// Generate a random key and encrypt it using config.KEY_ENCRYPTION_KEY

	const key = crypto.randomBytes(32);
	const iv = crypto.randomBytes(16);

	const cipher = crypto.createCipheriv(
		"aes-256-cbc",
		Buffer.from(config.KEY_ENCRYPTION_KEY, "hex"),
		iv
	);

	const encryptedKey = Buffer.concat([
		cipher.update(key),
		cipher.final(),
	]).toString("hex");

	return iv.toString("hex") + ":" + encryptedKey;
};

export const decryptKey = (encrypted: string) => {
	const [iv, encryptedKey] = encrypted.split(":");

	const decipher = crypto.createDecipheriv(
		"aes-256-cbc",
		Buffer.from(config.KEY_ENCRYPTION_KEY, "hex"),
		Buffer.from(iv, "hex")
	);

	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(encryptedKey, "hex")),
		decipher.final(),
	]);

	return decrypted;
};

export const encrypt = (text: string, key: Buffer) => {
	const iv = crypto.randomBytes(16);

	const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

	const encryptedString =
		cipher.update(text, "utf8", "hex") + cipher.final("hex");

	return iv.toString("hex") + ":" + encryptedString;
};

export const decrypt = (text: string, key: Buffer) => {
	const textParts = text.split(":");
	const iv = Buffer.from(textParts.shift() as string, "hex");
	const encryptedText = Buffer.from(textParts.join(":"), "hex");
	const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
	const decrypted = decipher.update(encryptedText) + decipher.final("utf-8");
	return decrypted;
};
