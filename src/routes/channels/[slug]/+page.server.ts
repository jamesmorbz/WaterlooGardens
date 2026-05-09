import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const VALID_SLUGS = ['announcements', 'general', 'maintenance'];

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!VALID_SLUGS.includes(params.slug)) error(404, 'Channel not found');

	const { data: channel } = await locals.supabase
		.from('channels')
		.select('*')
		.eq('slug', params.slug)
		.single();

	if (!channel) error(404, 'Channel not found');

	const isChat = channel.post_role === 'resident';

	const { data: posts } = await locals.supabase
		.from('posts')
		.select(`*, author:profiles(full_name, flat_number), comments(*, author:profiles(full_name, flat_number))`)
		.eq('channel_id', channel.id)
		.order('is_pinned', { ascending: false })
		.order('created_at', { ascending: isChat });

	return { channel, posts: posts ?? [] };
};

export const actions: Actions = {
	createPost: async ({ request, locals, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated' });

		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('id, role, status')
			.eq('id', user.id)
			.single();

		if (!profile || profile.status !== 'approved') {
			return fail(403, { error: 'Account not approved' });
		}

		const { data: channel } = await locals.supabase
			.from('channels')
			.select('id, post_role')
			.eq('slug', params.slug)
			.single();

		if (!channel) return fail(404, { error: 'Channel not found' });
		if (channel.post_role === 'director' && profile.role !== 'director') {
			return fail(403, { error: 'Only directors can post here' });
		}

		const data = await request.formData();
		const body = (data.get('body') as string)?.trim();
		const title = (data.get('title') as string)?.trim() || null;

		if (!body) return fail(400, { error: 'Message cannot be empty' });

		const { error: err } = await locals.supabase
			.from('posts')
			.insert({ channel_id: channel.id, author_id: user.id, body, title });

		if (err) return fail(500, { error: err.message });
		redirect(303, `/channels/${params.slug}`);
	},

	createComment: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated' });

		const data = await request.formData();
		const body = (data.get('body') as string)?.trim();
		const post_id = data.get('post_id') as string;

		if (!body) return fail(400, { error: 'Reply cannot be empty' });

		const { error: err } = await locals.supabase
			.from('comments')
			.insert({ post_id, author_id: user.id, body });

		if (err) return fail(500, { error: err.message });
		return { success: true };
	},

	deletePost: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated' });

		const data = await request.formData();
		const post_id = data.get('post_id') as string;

		const { error: err } = await locals.supabase.from('posts').delete().eq('id', post_id);
		if (err) return fail(500, { error: err.message });
		return { success: true };
	},

	pinPost: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated' });

		const data = await request.formData();
		const post_id = data.get('post_id') as string;
		const pinned = data.get('pinned') === 'true';

		const { error: err } = await locals.supabase
			.from('posts')
			.update({ is_pinned: !pinned })
			.eq('id', post_id);

		if (err) return fail(500, { error: err.message });
		return { success: true };
	},

	deleteComment: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated' });

		const data = await request.formData();
		const comment_id = data.get('comment_id') as string;

		const { error: err } = await locals.supabase.from('comments').delete().eq('id', comment_id);
		if (err) return fail(500, { error: err.message });
		return { success: true };
	}
};
