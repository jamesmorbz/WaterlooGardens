import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const PROTECTED_PATHS = ['/director', '/profile'];

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();
	const path = url.pathname;
	const isProtected = PROTECTED_PATHS.some((p) => path.startsWith(p));

	if (!session) {
		if (isProtected) redirect(303, '/login');
		return { session: null, profile: null };
	}

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('*')
		.eq('id', user!.id)
		.single();

	if (!profile || profile.status === 'pending') {
		if (isProtected && path !== '/pending') redirect(303, '/pending');
		return { session, profile };
	}

	if (profile.status === 'rejected') {
		await locals.supabase.auth.signOut();
		redirect(303, '/login?rejected=1');
	}

	return { session, profile };
};
