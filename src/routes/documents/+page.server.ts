import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: docs, error } = await locals.supabase
		.from('documents')
		.select('*')
		.order('created_at', { ascending: false });

	if (error || !docs) return { documents: [], categories: [] };

	const documents = await Promise.all(
		docs.map(async (doc) => {
			const { data } = await locals.supabase.storage
				.from('documents')
				.createSignedUrl(doc.storage_path, 60);
			return { ...doc, signed_url: data?.signedUrl ?? null };
		})
	);

	const categories = [...new Set(docs.map((d) => d.category))].sort();

	return { documents, categories };
};
