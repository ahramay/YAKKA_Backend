import { z } from "zod";

export const getSafetyScreenResponseSchema = z.object({
	items: z.array(
		z.object({
			id: z.number(),
			title: z.string(),
			content: z.string(),
			icon: z
				.object({ name: z.string() })
				.transform(obj => obj.name)
				.pipe(z.enum(["do", "don't"])),
		})
	),
});
export type GetSafetyScreenResponseSchema = z.infer<
	typeof getSafetyScreenResponseSchema
>;
