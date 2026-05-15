import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) error(401, 'Not authenticated');

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role, status')
		.eq('id', user.id)
		.single();

	if (profile?.role !== 'director' || profile?.status !== 'approved') {
		error(403, 'Access denied');
	}

	const { filename, description, category, tags, storagePath, audience } = await request.json();

	if (!filename || !category || !storagePath) {
		error(400, 'Missing required fields');
	}

	const audienceValue = audience === 'leaseholders' ? 'leaseholders' : 'all';

	const { error: insertErr } = await locals.supabase.from('documents').insert({
		filename,
		description: description || null,
		category,
		storage_path: storagePath,
		mime_type: 'application/pdf',
		uploaded_by: user.id,
		tags: tags ?? [],
		audience: audienceValue
	});

	if (insertErr) {
		// Clean up the orphaned file so storage doesn't accumulate junk
		await locals.supabase.storage.from('documents').remove([storagePath]);
		error(500, insertErr.message);
	}

	return json({ success: true });
};
