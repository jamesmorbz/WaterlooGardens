<script lang="ts">
	import { page } from '$app/state';
	const email = page.url.searchParams.get('email');
</script>

<svelte:head><title>Check your email – Waterloo Gardens</title></svelte:head>

<div class="auth-page">
	<p class="site-title">Waterloo Gardens</p>
	<p class="subtitle">Check your email</p>

	<div class="info-box">
		<p>
			We've sent a confirmation link to
			{#if email}
				<strong>{email}</strong>
			{:else}
				your email address
			{/if}.
			Click the link in that email to verify your account.
		</p>
		<p style="margin-top:0.75rem;color:var(--color-muted);font-size:0.875rem">
			Once confirmed, your account will be reviewed by a director before you gain full access.
		</p>
	</div>

	<div class="auth-links">
		<a href="/login">Back to sign in</a>
	</div>
</div>
