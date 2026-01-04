import { z } from 'astro:content';

export const BaseWPSchema = z.object({
    id: z.number()
});