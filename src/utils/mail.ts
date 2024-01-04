import Mailjet, { SendEmailV3_1 } from "node-mailjet";
import config from "./config";

interface SendMailParams {
	to: {
		email: string;
		name?: string;
	};
	subject: string;
	body: string;
	title: string;
	button: {
		text: string;
		link: string;
	};
}

const sendMail = async (params: SendMailParams) => {
	const mailjet = new Mailjet({
		apiKey: config.MAILJET_API_KEY,
		apiSecret: config.MAILJET_API_SECRET,
	});

	console.log("Sending email to", params.to.email);
	console.log(config.MAILJET_API_KEY, config.MAILJET_API_SECRET);

	const data: SendEmailV3_1.IBody = {
		Messages: [
			{
				From: {
					Email: "noreply@yakkaworld.com",
					Name: "YAKKA",
				},
				To: [
					{
						Email: params.to.email,
						Name: params.to.name,
					},
				],

				Subject: params.subject,
				Variables: {
					title: params.title,
					body: params.body,
					buttonText: params.button.text,
					buttonLink: params.button.link,
				},
				TemplateLanguage: true,
				HTMLPart: `<h1>{{var:title}}</h1><br><br><p>{{var:body}}</p><br><br><a href="{{var:buttonLink}}">{{var:buttonText}}</a>`,
			},
		],
	};

	const result = await mailjet
		.post("send", { version: "v3.1" })
		// @ts-ignore
		.request(data);
};

export default sendMail;
