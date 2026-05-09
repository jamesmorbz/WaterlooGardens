import { error, fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

async function sendEmail(to: string, subject: string, text: string) {
	if (!env.RESEND_API_KEY || !to) return;
	await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: 'Waterloo Gardens <noreply@waterloogardens.co.uk>',
			to,
			subject,
			text
		})
	});
}

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { profile } = await parent();
	if (profile?.role !== 'director') error(403, 'Access denied');

	const tab = url.searchParams.get('tab') ?? 'pending';

	const [{ data: pending }, { data: allUsers }, { data: allDocs }] = await Promise.all([
		locals.supabase.from('profiles').select('*').eq('status', 'pending').order('created_at'),
		locals.supabase.from('profiles').select('*').order('full_name'),
		locals.supabase.from('documents').select('id, filename, category, tags, created_at, storage_path').order('created_at', { ascending: false })
	]);

	return { pending: pending ?? [], allUsers: allUsers ?? [], allDocs: allDocs ?? [], tab };
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const data = await request.formData();
		const user_id = data.get('user_id') as string;

		const { data: profile, error: fetchErr } = await locals.supabase
			.from('profiles')
			.select('full_name')
			.eq('id', user_id)
			.single();

		if (fetchErr || !profile) return fail(500, { error: fetchErr?.message ?? 'User not found' });

		const { error: err } = await locals.supabase
			.from('profiles')
			.update({ status: 'approved' })
			.eq('id', user_id);

		if (err) return fail(500, { error: err.message });
		redirect(303, '/director?tab=pending');
	},

	reject: async ({ request, locals }) => {
		const data = await request.formData();
		const user_id = data.get('user_id') as string;
		const note = (data.get('note') as string)?.trim() || null;

		const { error: err } = await locals.supabase
			.from('profiles')
			.update({ status: 'rejected' })
			.eq('id', user_id);

		if (err) return fail(500, { error: err.message });
		redirect(303, '/director?tab=pending');
	},

	postAnnouncement: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated' });

		const data = await request.formData();
		const title = (data.get('title') as string)?.trim() || null;
		const body = (data.get('body') as string)?.trim();
		const pinned = data.get('pinned') === 'on';

		if (!body) return fail(400, { error: 'Announcement text is required' });

		const { data: channel } = await locals.supabase
			.from('channels')
			.select('id')
			.eq('slug', 'announcements')
			.single();

		if (!channel) return fail(500, { error: 'Announcements channel not found' });

		const { error: err } = await locals.supabase
			.from('posts')
			.insert({ channel_id: channel.id, author_id: user.id, title, body, is_pinned: pinned });

		if (err) return fail(500, { error: err.message });
		redirect(303, '/director?tab=announce&posted=1');
	},

	deleteDocument: async ({ request, locals }) => {
		const data = await request.formData();
		const doc_id = data.get('doc_id') as string;
		if (!doc_id) return fail(400, { error: 'Missing document ID' });

		const { data: doc } = await locals.supabase
			.from('documents')
			.select('storage_path')
			.eq('id', doc_id)
			.single();

		if (doc?.storage_path) {
			await locals.supabase.storage.from('documents').remove([doc.storage_path]);
		}

		const { error: err } = await locals.supabase.from('documents').delete().eq('id', doc_id);
		if (err) return fail(500, { error: err.message });
		redirect(303, '/director?tab=docs');
	},

	uploadDocument: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated' });

		const data = await request.formData();
		const file = data.get('file') as File;
		const filename = (data.get('filename') as string)?.trim();
		const description = (data.get('description') as string)?.trim() || null;
		const category = (data.get('category') as string)?.trim();
		const tagsRaw = (data.get('tags') as string)?.trim();
		const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];

		if (!file || file.size === 0) return fail(400, { error: 'No file selected' });
		if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
			return fail(400, { error: 'Only PDF files are accepted' });
		}
		if (!filename) return fail(400, { error: 'Filename is required' });
		if (!category) return fail(400, { error: 'Category is required' });
		if (file.size > 20 * 1024 * 1024) return fail(400, { error: 'File must be under 20 MB' });

		const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_');
		const storagePath = `${user.id}/${Date.now()}-${safeName}`;

		const bytes = await file.arrayBuffer();
		const { error: uploadErr } = await locals.supabase.storage
			.from('documents')
			.upload(storagePath, bytes, { contentType: 'application/pdf' });

		if (uploadErr) return fail(500, { error: `Upload failed: ${uploadErr.message}` });

		const { error: insertErr } = await locals.supabase.from('documents').insert({
			filename,
			description,
			category,
			storage_path: storagePath,
			mime_type: 'application/pdf',
			uploaded_by: user.id,
			tags
		});

		if (insertErr) {
			await locals.supabase.storage.from('documents').remove([storagePath]);
			return fail(500, { error: insertErr.message });
		}

		redirect(303, '/director?tab=upload&uploaded=1');
	}
};
