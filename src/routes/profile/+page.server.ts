import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { profile } = await parent();
	return { profile };
};

export const actions: Actions = {
	updateName: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { nameError: 'Not authenticated' });

		const data = await request.formData();
		const full_name = (data.get('full_name') as string)?.trim();
		if (!full_name) return fail(400, { nameError: 'Name is required' });

		const { error } = await locals.supabase
			.from('profiles')
			.update({ full_name })
			.eq('id', user.id);

		if (error) return fail(500, { nameError: error.message });
		return { nameSuccess: true };
	},

	updateEmail: async ({ request, locals }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		if (!email) return fail(400, { emailError: 'Email is required' });

		const { error } = await locals.supabase.auth.updateUser({ email });
		if (error) return fail(400, { emailError: error.message });
		return { emailSuccess: true };
	},

	updatePassword: async ({ request, locals }) => {
		const data = await request.formData();
		const password = data.get('password') as string;
		if (!password || password.length < 8) {
			return fail(400, { passwordError: 'Password must be at least 8 characters' });
		}

		const { error } = await locals.supabase.auth.updateUser({ password });
		if (error) return fail(400, { passwordError: error.message });
		return { passwordSuccess: true };
	},

	deleteAccount: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { deleteError: 'Not authenticated' });

		const data = await request.formData();
		if (data.get('confirm') !== 'DELETE') {
			return fail(400, { deleteError: 'Type DELETE in capitals to confirm.' });
		}

		const { error } = await locals.supabase.rpc('delete_own_account');
		if (error) return fail(500, { deleteError: error.message });

		await locals.supabase.auth.signOut();
		redirect(303, '/login?deleted=1');
	}
};
