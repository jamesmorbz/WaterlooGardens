import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');

	if (token_hash && type === 'signup') {
		const { error } = await locals.supabase.auth.verifyOtp({ token_hash, type: 'signup' });

		if (!error) {
			const {
				data: { user }
			} = await locals.supabase.auth.getUser();

			if (user) {
				const { full_name, flat_number, user_type } = user.user_metadata ?? {};
				// Insert profile — ignore conflict in case link is clicked twice
				await locals.supabase.from('profiles').insert({
					id: user.id,
					full_name: full_name ?? '',
					flat_number: flat_number ?? '',
					user_type: user_type ?? 'leaseholder'
				});
			}

			redirect(303, '/pending');
		}
	}

	redirect(303, '/login?error=invalid_link');
};
