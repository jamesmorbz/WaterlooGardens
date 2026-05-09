<script lang="ts">
	import PostItem from '$lib/components/PostItem.svelte';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const isChat = $derived(data.channel.post_role === 'resident');

	const canPost = $derived(
		data.profile?.status === 'approved' &&
		(data.channel.post_role === 'resident' || data.profile?.role === 'director')
	);

	function isGrouped(i: number): boolean {
		if (i === 0) return false;
		const prev = data.posts[i - 1];
		const curr = data.posts[i];
		if (prev.author_id !== curr.author_id) return false;
		const gap = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
		return gap < 300_000;
	}

	$effect(() => {
		const el = document.getElementById('chat-scroll');
		if (el) el.scrollTop = el.scrollHeight;
	});
</script>

<svelte:head><title>{data.channel.name} – Waterloo Gardens</title></svelte:head>

<div class="page">
	{#if isChat}
		<div class="channel-tabs">
			<a
				href="/channels/general"
				class="channel-tab"
				class:active={data.channel.slug === 'general'}
			>General Chat</a>
			<a
				href="/channels/maintenance"
				class="channel-tab"
				class:active={data.channel.slug === 'maintenance'}
			>Maintenance</a>
		</div>

		<div class="chat-shell">
			<div class="chat-scroll" id="chat-scroll">
				{#if data.posts.length === 0}
					<p style="color:var(--color-muted);font-size:0.9rem;text-align:center;padding:2rem">
						No messages yet — be the first to say something!
					</p>
				{:else}
					{#each data.posts as post, i (post.id)}
						<ChatMessage {post} profile={data.profile} grouped={isGrouped(i)} />
					{/each}
				{/if}
			</div>

			{#if canPost}
				<div class="chat-compose-bar">
					{#if form?.error}<p style="color:var(--color-danger);font-size:0.8rem;margin-bottom:0.375rem">{form.error}</p>{/if}
					<form method="POST" action="?/createPost" style="display:flex;gap:0.625rem;flex:1;align-items:flex-end">
						<textarea
							class="chat-input"
							name="body"
							placeholder="Write a message…"
							required
							rows="1"
						></textarea>
						<button type="submit" class="btn-send" aria-label="Send">↑</button>
					</form>
				</div>
			{:else}
				<div class="chat-login-bar">
					{#if !data.profile}
						<a href="/login">Sign in</a> or <a href="/register">register</a> to join the conversation.
					{:else if data.profile.status === 'pending'}
						Your account is awaiting approval before you can post.
					{/if}
				</div>
			{/if}
		</div>

	{:else}
		<div class="page-header">
			<div>
				<h1>{data.channel.name}</h1>
				{#if data.channel.description}
					<p style="color:var(--color-muted);font-size:0.875rem">{data.channel.description}</p>
				{/if}
			</div>
		</div>

		{#if form?.error}<p class="error-msg">{form.error}</p>{/if}

		{#if data.posts.length === 0}
			<p class="empty">No announcements yet.</p>
		{:else}
			<div class="notice-list">
				{#each data.posts as post (post.id)}
					<PostItem {post} profile={data.profile} />
				{/each}
			</div>
		{/if}
	{/if}
</div>
