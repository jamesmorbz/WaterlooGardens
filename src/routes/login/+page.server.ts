import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (session) redirect(303, '/documents');
	return {};
};

export const actions: Actions = {
	login: async ({ request, locals }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;

		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { error: error.message });

		redirect(303, '/documents');
	},

	forgotPassword: async ({ request, locals }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		if (!email) return fail(400, { error: 'Email required' });

		await locals.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${new URL(request.url).origin}/auth/reset`
		});

		return { message: 'If that email is registered, a reset link has been sent.' };
	}
};
