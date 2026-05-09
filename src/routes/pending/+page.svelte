<svelte:head><title>Awaiting approval – Waterloo Gardens</title></svelte:head>

<div class="auth-page">
	<p class="site-title">Waterloo Gardens</p>
	<p style="margin-top:1.5rem">
		Your account is awaiting approval by a director. You'll receive an email once it's been reviewed.
	</p>
	<p style="margin-top:1.25rem;font-size:0.875rem;color:var(--color-muted)">
		Registered with the wrong account?
	</p>
	<form method="POST" action="/logout" style="margin-top:0.5rem">
		<button type="submit" class="btn-primary" style="width:100%">Sign out</button>
	</form>
</div>
