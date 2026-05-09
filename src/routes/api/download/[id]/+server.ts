import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const { data: doc } = await locals.supabase
		.from('documents')
		.select('storage_path, filename')
		.eq('id', params.id)
		.single();

	if (!doc) error(404, 'Document not found');

	const { data } = await locals.supabase.storage
		.from('documents')
		.createSignedUrl(doc.storage_path, 60, { download: doc.filename });

	if (!data?.signedUrl) error(500, 'Could not generate download link');

	redirect(303, data.signedUrl);
};
