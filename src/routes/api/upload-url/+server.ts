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

	const { filename } = await request.json();
	const safeName = (filename as string).replace(/[^a-z0-9._-]/gi, '_');
	const storagePath = `${user.id}/${Date.now()}-${safeName}`;

	const { data, error: err } = await locals.supabase.storage
		.from('documents')
		.createSignedUploadUrl(storagePath);

	if (err || !data) error(500, err?.message ?? 'Failed to create upload URL');

	return json({ signedUrl: data.signedUrl, storagePath });
};
