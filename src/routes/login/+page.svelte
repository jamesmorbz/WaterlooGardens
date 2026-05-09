<script lang="ts">
	import { page } from '$app/state';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let showForgot = $state(false);

	const urlError = page.url.searchParams.get('error');
	const deleted = page.url.searchParams.get('deleted');
</script>

<svelte:head><title>Sign in – Waterloo Gardens</title></svelte:head>

<div class="auth-page">
	<p class="site-title">Waterloo Gardens</p>
	<p class="subtitle">Resident portal</p>

	{#if form?.error}
		<p class="error-msg">{form.error}</p>
	{/if}
	{#if urlError === 'invalid_link'}
		<p class="error-msg">That confirmation link is invalid or has expired. Please register again or contact a director.</p>
	{/if}
	{#if deleted}
		<p class="info-msg">Your account has been deleted. Sorry to see you go.</p>
	{/if}
	{#if form?.message}
		<p class="info-msg">{form.message}</p>
	{/if}

	{#if !showForgot}
		<form method="POST" action="?/login">
			<div class="form-group">
				<label for="email">Email</label>
				<input id="email" type="email" name="email" required autocomplete="email" />
			</div>
			<div class="form-group">
				<label for="password">Password</label>
				<input id="password" type="password" name="password" required autocomplete="current-password" />
			</div>
			<button type="submit" class="btn-primary" style="width:100%">Sign in</button>
		</form>
		<div class="auth-links">
			<a href="/register">Create account</a>
			<button class="btn-link" onclick={() => (showForgot = true)}>Forgot password?</button>
		</div>
	{:else}
		<form method="POST" action="?/forgotPassword">
			<div class="form-group">
				<label for="reset-email">Your email address</label>
				<input id="reset-email" type="email" name="email" required autocomplete="email" />
			</div>
			<button type="submit" class="btn-primary" style="width:100%">Send reset link</button>
		</form>
		<div class="auth-links">
			<button class="btn-link" onclick={() => (showForgot = false)}>Back to sign in</button>
		</div>
	{/if}
</div>
