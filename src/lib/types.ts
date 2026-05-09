export interface Profile {
	id: string;
	full_name: string;
	flat_number: string;
	role: 'resident' | 'director';
	status: 'pending' | 'approved' | 'rejected';
	user_type: 'leaseholder' | 'tenant';
	created_at: string;
}

export interface Channel {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	post_role: 'resident' | 'director';
}

export interface Post {
	id: string;
	channel_id: string;
	author_id: string | null;
	title: string | null;
	body: string;
	is_pinned: boolean;
	created_at: string;
	author?: Pick<Profile, 'full_name' | 'flat_number'> | null;
	comments?: Comment[];
}

export interface Comment {
	id: string;
	post_id: string;
	author_id: string | null;
	body: string;
	created_at: string;
	author?: Pick<Profile, 'full_name' | 'flat_number'> | null;
}

export interface Document {
	id: string;
	filename: string;
	description: string | null;
	category: string;
	storage_path: string;
	mime_type: string | null;
	uploaded_by: string | null;
	created_at: string;
	tags: string[];
	signed_url?: string | null;
}
