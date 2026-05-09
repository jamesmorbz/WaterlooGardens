import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (session) redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;
		const full_name = (data.get('full_name') as string)?.trim();
		const flat_number = (data.get('flat_number') as string)?.trim();
		const user_type = data.get('user_type') as 'leaseholder' | 'tenant';

		if (!full_name || !flat_number || !user_type) {
			return fail(400, { error: 'All fields are required.' });
		}
		if (!/^[A-Za-z]?\d+$/.test(flat_number)) {
			return fail(400, { error: 'Flat number must be a number like 1, 12, B1 or B11.' });
		}
		if (!['leaseholder', 'tenant'].includes(user_type)) {
			return fail(400, { error: 'Please select whether you are a leaseholder or tenant.' });
		}
		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters.' });
		}

		const { data: authData, error: authError } = await locals.supabase.auth.signUp({
			email,
			password
		});
		if (authError) return fail(400, { error: authError.message });

		const user = authData.user;
		if (!user) return fail(400, { error: 'Registration failed. Please try again.' });

		const { error: profileError } = await locals.supabase
			.from('profiles')
			.insert({ id: user.id, full_name, flat_number, user_type });

		if (profileError) return fail(400, { error: profileError.message });

		redirect(303, '/pending');
	}
};
