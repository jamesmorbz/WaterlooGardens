<script lang="ts">
	import type { Post, Profile } from '$lib/types';

	let {
		post,
		profile
	}: { post: Post & { comments: NonNullable<Post['comments']> }; profile: Profile | null } =
		$props();

	const isDirector = $derived(profile?.role === 'director');

	function fmt(s: string) {
		return new Date(s).toLocaleDateString('en-GB', {
			day: 'numeric', month: 'long', year: 'numeric'
		});
	}
</script>

<article class="notice-card" class:pinned={post.is_pinned}>
	<div class="notice-header">
		{#if post.is_pinned}<span class="pinned-badge">Pinned</span>{/if}
		{#if post.title}<span class="notice-title">{post.title}</span>{/if}
	</div>

	<p class="notice-body">{post.body}</p>

	<div class="notice-meta">
		{#if post.author}
			<span>{post.author.full_name}</span>
		{/if}
		<time>{fmt(post.created_at)}</time>

		{#if isDirector}
			<form method="POST" action="?/pinPost">
				<input type="hidden" name="post_id" value={post.id} />
				<input type="hidden" name="pinned" value={String(post.is_pinned)} />
				<button type="submit" class="btn-link" style="font-size:0.78rem">
					{post.is_pinned ? 'Unpin' : 'Pin'}
				</button>
			</form>
			<form method="POST" action="?/deletePost">
				<input type="hidden" name="post_id" value={post.id} />
				<button type="submit" class="btn-danger">Delete</button>
			</form>
		{/if}
	</div>
</article>
