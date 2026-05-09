<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function fmt(s: string) {
		return new Date(s).toLocaleDateString('en-GB', {
			day: 'numeric', month: 'long', year: 'numeric'
		});
	}
	function snippet(body: string) {
		return body.length > 150 ? body.slice(0, 150).trimEnd() + '…' : body;
	}
</script>

<svelte:head><title>Waterloo Gardens – Resident Portal</title></svelte:head>

<div class="home-hero">
	<h1>Waterloo Gardens</h1>
	<p>The resident portal for Waterloo Gardens, N1 1TY — announcements, shared documents and the residents' forum, all in one place.</p>
	<div class="hero-links">
		<a href="/channels/announcements" class="btn-hero">View Announcements</a>
		<a href="/register" class="btn-hero-outline">Register</a>
	</div>
</div>

<div class="home-section">
	<h2>Latest Announcements</h2>
	{#if data.announcements.length === 0}
		<p style="color:var(--color-muted);font-size:0.9rem">No announcements yet.</p>
	{:else}
		<div class="home-notices">
			{#each data.announcements as post (post.id)}
				<a href="/channels/announcements" class="home-notice">
					<p class="notice-title">{post.title ?? 'Announcement'}</p>
					<p class="notice-snippet">{snippet(post.body)}</p>
					<time class="notice-date">{fmt(post.created_at)}</time>
				</a>
			{/each}
		</div>
		<a href="/channels/announcements" class="view-all">View all announcements →</a>
	{/if}
</div>

<div class="home-section">
	<h2>Quick links</h2>
	<div class="home-links-grid">
		<a href="/channels/general" class="home-card">
			<h3>Residents' Forum</h3>
			<p>Chat with neighbours, share updates, and discuss building matters.</p>
		</a>
		<a href="/documents" class="home-card">
			<h3>Document Library</h3>
			<p>Service charge accounts, meeting minutes, insurance and more.</p>
		</a>
		<a href="/about" class="home-card">
			<h3>About the RTM</h3>
			<p>Learn about the Right to Manage company and how the building is run.</p>
		</a>
	</div>
</div>
