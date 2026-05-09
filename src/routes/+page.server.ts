import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: channel } = await locals.supabase
		.from('channels')
		.select('id')
		.eq('slug', 'announcements')
		.single();

	if (!channel) return { announcements: [] };

	const { data: posts } = await locals.supabase
		.from('posts')
		.select('id, title, body, created_at, is_pinned')
		.eq('channel_id', channel.id)
		.order('is_pinned', { ascending: false })
		.order('created_at', { ascending: false })
		.limit(4);

	return { announcements: posts ?? [] };
};
