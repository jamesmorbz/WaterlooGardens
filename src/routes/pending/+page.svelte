<svelte:head><title>Awaiting approval – Waterloo Gardens</title></svelte:head>

<div class="auth-page">
	<p class="site-title">Waterloo Gardens</p>
	<p class="mt-6">
		Your account is awaiting approval by a director. You'll receive an email once it's been reviewed.
	</p>
	<p class="mt-5 text-sm text-muted">
		Registered with the wrong account?
	</p>
	<form method="POST" action="/logout" class="mt-2">
		<button type="submit" class="btn-primary w-full">Sign out</button>
	</form>
</div>
