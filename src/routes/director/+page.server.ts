import { error, fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

async function sendEmail(to: string | string[], subject: string, text: string) {
	if (!env.RESEND_API_KEY) return;
	const recipients = Array.isArray(to) ? to : [to];
	if (recipients.length === 0) return;

	// Single recipient: send directly. Multiple: use BCC so residents can't see each other.
	const payload =
		recipients.length === 1
			? { to: recipients[0], subject, text }
			: { to: 'noreply@waterloogardens.co.uk', bcc: recipients, subject, text };

	await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: 'Waterloo Gardens <noreply@waterloogardens.co.uk>',
			...payload
		})
	});
}

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { profile } = await parent();
	if (profile?.role !== 'director') error(403, 'Access denied');

	const { user } = await locals.safeGetSession();
	const tab = url.searchParams.get('tab') ?? 'pending';

	const [{ data: pending }, { data: allUsers }, { data: allDocs }] = await Promise.all([
		locals.supabase.from('profiles').select('*').eq('status', 'pending').order('created_at'),
		locals.supabase.from('profiles').select('*').order('full_name'),
		locals.supabase.from('documents').select('id, filename, category, tags, created_at, storage_path').order('created_at', { ascending: false })
	]);

	return { pending: pending ?? [], allUsers: allUsers ?? [], allDocs: allDocs ?? [], tab, currentUserId: user?.id ?? null };
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const data = await request.formData();
		const user_id = data.get('user_id') as string;

		const { data: profile, error: fetchErr } = await locals.supabase
			.from('profiles')
			.select('full_name')
			.eq('id', user_id)
			.single();

		if (fetchErr || !profile) return fail(500, { error: fetchErr?.message ?? 'User not found' });

		const { error: err } = await locals.supabase
			.from('profiles')
			.update({ status: 'approved' })
			.eq('id', user_id);

		if (err) return fail(500, { error: err.message });
		redirect(303, '/director?tab=pending');
	},

	reject: async ({ request, locals }) => {
		const data = await request.formData();
		const user_id = data.get('user_id') as string;
		const note = (data.get('note') as string)?.trim() || null;

		const { error: err } = await locals.supabase
			.from('profiles')
			.update({ status: 'rejected' })
			.eq('id', user_id);

		if (err) return fail(500, { error: err.message });
		redirect(303, '/director?tab=pending');
	},

	postAnnouncement: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Not authenticated' });

		const data = await request.formData();
		const title = (data.get('title') as string)?.trim() || null;
		const body = (data.get('body') as string)?.trim();
		const pinned = data.get('pinned') === 'on';
		const sendEmailToResidents = data.get('send_email') === 'on';

		if (!body) return fail(400, { error: 'Announcement text is required' });

		const { data: channel } = await locals.supabase
			.from('channels')
			.select('id')
			.eq('slug', 'announcements')
			.single();

		if (!channel) return fail(500, { error: 'Announcements channel not found' });

		const { error: err } = await locals.supabase
			.from('posts')
			.insert({ channel_id: channel.id, author_id: user.id, title, body, is_pinned: pinned });

		if (err) return fail(500, { error: err.message });

		if (sendEmailToResidents) {
			const { data: emails } = await locals.supabase.rpc('get_approved_resident_emails');
			if (emails && emails.length > 0) {
				const origin = new URL(request.url).origin;
				const subject = title ?? 'New Announcement – Waterloo Gardens';
				const text = `${body}\n\n---\nView on the Waterloo Gardens portal: ${origin}/channels/announcements`;
				await sendEmail(emails, subject, text);
			}
		}

		redirect(303, '/director?tab=announce&posted=1');
	},

	removeUser: async ({ request, locals }) => {
		const data = await request.formData();
		const user_id = data.get('user_id') as string;
		if (!user_id) return fail(400, { error: 'Missing user ID' });

		const { error: err } = await locals.supabase.rpc('director_remove_user', { target_id: user_id });
		if (err) return fail(500, { error: err.message });
		redirect(303, '/director?tab=residents');
	},

	deleteDocument: async ({ request, locals }) => {
		const data = await request.formData();
		const doc_id = data.get('doc_id') as string;
		if (!doc_id) return fail(400, { error: 'Missing document ID' });

		const { data: doc } = await locals.supabase
			.from('documents')
			.select('storage_path')
			.eq('id', doc_id)
			.single();

		if (doc?.storage_path) {
			await locals.supabase.storage.from('documents').remove([doc.storage_path]);
		}

		const { error: err } = await locals.supabase.from('documents').delete().eq('id', doc_id);
		if (err) return fail(500, { error: err.message });
		redirect(303, '/director?tab=docs');
	},

};
