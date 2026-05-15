<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function fmt(s: string) {
		return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}
	function snippet(body: string) {
		return body.length > 120 ? body.slice(0, 120).trimEnd() + '…' : body;
	}
</script>

<svelte:head><title>Waterloo Gardens – Resident Portal</title></svelte:head>

<div class="home-layout">

	<!-- Left: photo + branding -->
	<div class="home-visual">
		<p class="home-eyebrow">Islington · London N1</p>
		<h1 class="home-headline">Waterloo<br>Gardens</h1>
		<p class="home-tagline">Your building's resident portal for announcements, shared documents and the residents' forum.</p>
		<div class="home-ctas">
			<a href="/channels/announcements" class="btn-hero">Announcements</a>
			{#if !data.session}
				<a href="/register" class="btn-hero-outline">Register</a>
			{/if}
		</div>
	</div>

	<!-- Right: content -->
	<div class="home-content">

		<!-- Announcements -->
		<div class="home-block">
			<p class="home-label">Latest Announcements</p>
			{#if data.announcements.length === 0}
				<p class="text-muted text-sm italic">No announcements yet.</p>
			{:else}
				<div class="home-announce-list">
					{#each data.announcements.slice(0, 4) as post (post.id)}
						<a href="/channels/announcements" class="home-announce-row">
							<div class="home-announce-body">
								<p class="home-announce-title">{post.title ?? 'Announcement'}</p>
								<p class="home-announce-snippet">{snippet(post.body)}</p>
							</div>
							<time class="home-announce-date">{fmt(post.created_at)}</time>
						</a>
					{/each}
				</div>
				<a href="/channels/announcements" class="home-view-all">View all →</a>
			{/if}
		</div>

		<!-- Quick links -->
		<div class="home-block">
			<p class="home-label">Explore</p>
			<div class="home-links">
				<a href="/channels/general" class="home-link">
					<strong>Residents' Forum</strong>
					<span>Chat with neighbours and discuss building matters.</span>
				</a>
				<a href="/documents" class="home-link">
					<strong>Document Library</strong>
					<span>Service charges, minutes, insurance and more.</span>
				</a>
				<a href="/about" class="home-link">
					<strong>About the RTM</strong>
					<span>How the building is managed and run.</span>
				</a>
			</div>
		</div>

	</div>
</div>
