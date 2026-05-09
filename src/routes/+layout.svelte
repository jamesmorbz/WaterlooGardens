<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
	let mobileOpen = $state(false);

	function isActive(path: string) {
		if (path === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(path);
	}

	$effect(() => {
		page.url.pathname;
		mobileOpen = false;
	});
</script>

<header class="topnav">
	<a href="/" class="brand">Waterloo Gardens</a>

	<nav class="nav-links">
		<a href="/" class="nav-link" class:active={isActive('/')}>Home</a>
		<a
			href="/channels/announcements"
			class="nav-link"
			class:active={isActive('/channels/announcements')}
		>Announcements</a>
		<a
			href="/channels/general"
			class="nav-link"
			class:active={isActive('/channels/general') || isActive('/channels/maintenance')}
		>Residents' Forum</a>
		<a href="/documents" class="nav-link" class:active={isActive('/documents')}>Documents</a>
		<a href="/about" class="nav-link" class:active={isActive('/about')}>About</a>
		<a href="/faq" class="nav-link" class:active={isActive('/faq')}>FAQ</a>
		{#if data.profile?.role === 'director'}
			<a href="/director" class="nav-link nav-link--director" class:active={isActive('/director')}>Director ▾</a>
		{/if}
	</nav>

	<div class="nav-auth">
		{#if data.session}
			<a href="/profile" class="nav-user">{data.profile?.full_name ?? 'Account'}</a>
			<form method="POST" action="/logout" style="margin:0">
				<button type="submit" class="btn-nav-signout">Sign out</button>
			</form>
		{:else}
			<a href="/login" class="nav-link">Sign in</a>
			<a href="/register" class="btn-nav-register">Register</a>
		{/if}
	</div>

	<button
		class="nav-hamburger"
		onclick={() => (mobileOpen = !mobileOpen)}
		aria-label="Toggle navigation"
	>
		{mobileOpen ? '✕' : '☰'}
	</button>
</header>

{#if mobileOpen}
	<nav class="mobile-menu">
		<a href="/" class="mobile-link" class:active={isActive('/')}>Home</a>
		<a
			href="/channels/announcements"
			class="mobile-link"
			class:active={isActive('/channels/announcements')}
		>Announcements</a>
		<a
			href="/channels/general"
			class="mobile-link"
			class:active={isActive('/channels/general') || isActive('/channels/maintenance')}
		>Residents' Forum</a>
		<a href="/documents" class="mobile-link" class:active={isActive('/documents')}>Documents</a>
		<a href="/about" class="mobile-link" class:active={isActive('/about')}>About</a>
		<a href="/faq" class="mobile-link" class:active={isActive('/faq')}>FAQ</a>
		{#if data.profile?.role === 'director'}
			<a href="/director" class="mobile-link" class:active={isActive('/director')}>Director Panel</a>
		{/if}
		<div class="mobile-auth">
			{#if data.session}
				<a href="/profile" class="mobile-link">{data.profile?.full_name ?? 'Account'}</a>
				<form method="POST" action="/logout">
					<button type="submit" class="btn-nav-signout">Sign out</button>
				</form>
			{:else}
				<a href="/login" class="mobile-link">Sign in</a>
				<a href="/register" class="mobile-link">Register</a>
			{/if}
		</div>
	</nav>
{/if}

<main>
	{@render children()}
</main>
