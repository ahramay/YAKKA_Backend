// Download the helper library from https://www.twilio.com/docs/node/install
// Set environment variables for your credentials
// Read more at http://twil.io/secure

import config from "./config";

const client = require("twilio")(
	config.TWILIO_ACCOUNT_SID,
	config.TWILIO_AUTH_TOKEN
);
export async function sendSMSVerification({ to }: { to: string }) {
	const verification = await client.verify.v2
		.services(config.TWILIO_VERIFY_SID)
		.verifications.create({ to, channel: "sms" });

	return verification;
}

export async function verifySMSCode({
	to,
	code,
}: {
	to: string;
	code: string;
}) {
	const verificationCheck = await client.verify.v2
		.services(config.TWILIO_VERIFY_SID)
		.verificationChecks.create({ to, code });

	return verificationCheck.status === "approved";
}

export async function sendSMSMessage({
	to,
	body,
}: {
	to: string;
	body: string;
}) {
	return client.messages.create({
		body,
		from: "YAKKA",
		to,
	});
}
