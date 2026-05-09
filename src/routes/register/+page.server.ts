import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return {};

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('status')
		.eq('id', user!.id)
		.single();

	redirect(303, profile?.status === 'pending' ? '/pending' : '/');
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;
		const full_name = (data.get('full_name') as string)?.trim();
		const flat_number = (data.get('flat_number') as string)?.trim();
		const user_type_raw = data.get('user_type') as string;
		const user_type_custom = (data.get('user_type_custom') as string)?.trim();
		const user_type = user_type_raw === 'other' ? (user_type_custom || 'other') : user_type_raw;

		if (!full_name || !flat_number || !user_type) {
			return fail(400, { error: 'All fields are required.' });
		}
		if (!/^[A-Za-z]?\d+$/.test(flat_number)) {
			return fail(400, { error: 'Flat number must be a number like 1, 12, B1 or B11.' });
		}
		if (!['leaseholder', 'tenant', 'other'].includes(user_type_raw)) {
			return fail(400, { error: 'Please select your resident type.' });
		}
		if (user_type_raw === 'other' && !user_type_custom) {
			return fail(400, { error: 'Please specify your resident type.' });
		}
		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters.' });
		}

		const { data: authData, error: authError } = await locals.supabase.auth.signUp({
			email,
			password,
			options: {
				data: { full_name, flat_number, user_type },
				emailRedirectTo: `${new URL(request.url).origin}/auth/confirm`
			}
		});
		if (authError) return fail(400, { error: authError.message });

		const user = authData.user;
		if (!user) return fail(400, { error: 'Registration failed. Please try again.' });

		// If email confirmation is disabled in Supabase, a session is returned immediately
		// and we insert the profile now. If confirmation is required, the session is null
		// and the profile is inserted by /auth/confirm after the user clicks the link.
		if (authData.session) {
			const { error: profileError } = await locals.supabase
				.from('profiles')
				.insert({ id: user.id, full_name, flat_number, user_type });
			if (profileError) return fail(400, { error: profileError.message });
			redirect(303, '/pending');
		}

		redirect(303, `/check-email?email=${encodeURIComponent(email)}`);
	}
};
