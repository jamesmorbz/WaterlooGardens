<script lang="ts">
	import type { Post, Profile } from '$lib/types';

	let {
		post,
		profile,
		grouped = false
	}: {
		post: Post & { comments: NonNullable<Post['comments']> };
		profile: Profile | null;
		grouped?: boolean;
	} = $props();

	let showReplyForm = $state(false);

	const isDirector = $derived(profile?.role === 'director');
	const canReply = $derived(profile?.status === 'approved');

	const AVATAR_COLORS = ['#1d3461', '#2d6a4f', '#7b4f00', '#5b21b6', '#b91c1c', '#065f46'];

	function avatarColor(name: string): string {
		let hash = 0;
		for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) | 0;
		return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
	}

	function initial(name: string): string {
		return name.charAt(0).toUpperCase();
	}

	function smartTime(s: string): string {
		const date = new Date(s);
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterdayStart = new Date(todayStart.getTime() - 86400000);
		const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
		if (date >= todayStart) return time;
		if (date >= yesterdayStart) return `Yesterday ${time}`;
		return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + time;
	}

	const authorName = $derived(post.author?.full_name ?? 'Unknown');
	const authorColor = $derived(avatarColor(authorName));
</script>

<div class="chat-msg" class:grouped>
	{#if grouped}
		<div class="avatar-spacer"></div>
	{:else}
		<div class="avatar" style="background:{authorColor}" title={authorName}>
			{initial(authorName)}
		</div>
	{/if}

	<div class="chat-content">
		{#if !grouped}
			<div class="chat-header">
				<span class="chat-author">{authorName}</span>
				<span class="chat-flat">Flat {post.author?.flat_number ?? '?'}</span>
				<time class="chat-time">{smartTime(post.created_at)}</time>
			</div>
		{/if}

		<div class="flex items-end gap-2 flex-wrap">
			<div class="chat-bubble">{post.body}</div>
			{#if grouped}
				<time class="chat-grouped-time">{smartTime(post.created_at)}</time>
			{/if}
		</div>

		{#if post.comments.length > 0}
			<div class="thread">
				{#each post.comments as comment (comment.id)}
					<div class="thread-msg">
						<div
							class="thread-avatar"
							style="background:{avatarColor(comment.author?.full_name ?? 'U')}"
						>
							{initial(comment.author?.full_name ?? 'U')}
						</div>
						<div class="thread-content">
							<div class="flex items-baseline gap-1.5 flex-wrap">
								<span class="thread-author">{comment.author?.full_name ?? 'Unknown'}</span>
								<span class="thread-flat">Flat {comment.author?.flat_number ?? '?'}</span>
								<time class="thread-time">{smartTime(comment.created_at)}</time>
								{#if isDirector}
									<form method="POST" action="?/deleteComment" class="ml-auto">
										<input type="hidden" name="comment_id" value={comment.id} />
										<button type="submit" class="btn-link text-danger text-[0.72rem]">Delete</button>
									</form>
								{/if}
							</div>
							<p class="thread-body">{comment.body}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="chat-actions-row">
			{#if canReply}
				<button class="btn-link" onclick={() => (showReplyForm = !showReplyForm)}>
					{showReplyForm ? 'Cancel' : '↩ Reply'}
				</button>
			{/if}
			{#if isDirector}
				<form method="POST" action="?/deletePost">
					<input type="hidden" name="post_id" value={post.id} />
					<button type="submit" class="btn-link text-danger">Delete</button>
				</form>
			{/if}
		</div>

		{#if showReplyForm}
			<form method="POST" action="?/createComment" class="reply-form">
				<input type="hidden" name="post_id" value={post.id} />
				<textarea class="reply-input" name="body" required rows="1" placeholder="Reply…"></textarea>
				<button type="submit" class="btn-reply-send" aria-label="Send reply">↑</button>
			</form>
		{/if}
	</div>
</div>
