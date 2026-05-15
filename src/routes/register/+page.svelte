<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let userTypeChoice = $state('');
</script>

<svelte:head><title>Register – Waterloo Gardens</title></svelte:head>

<div class="auth-page">
	<p class="site-title">Waterloo Gardens</p>
	<p class="subtitle">Create a resident account</p>

	{#if form?.error}
		<p class="error-msg">{form.error}</p>
	{/if}

	<form method="POST">
		<div class="form-group">
			<label for="full_name">Full name</label>
			<input id="full_name" type="text" name="full_name" required autocomplete="name" />
		</div>
		<div class="form-group">
			<label for="flat_number">Flat number</label>
			<input
				id="flat_number"
				type="text"
				name="flat_number"
				required
				placeholder="e.g. 12 or B4"
				pattern="[A-Za-z]?\d+"
				title="Enter a flat number like 1, 12, 123, B1 or B11"
			/>
		</div>
		<div class="form-group">
			<p class="text-sm font-medium mb-1.5">I am a</p>
			<div class="radio-group">
				<label class="radio-label">
					<input type="radio" name="user_type" value="leaseholder" required
						onchange={() => (userTypeChoice = 'leaseholder')} />
					Leaseholder
					<small>I own the lease on my flat</small>
				</label>
				<label class="radio-label">
					<input type="radio" name="user_type" value="tenant"
						onchange={() => (userTypeChoice = 'tenant')} />
					Tenant
					<small>I rent from my landlord</small>
				</label>
				<label class="radio-label">
					<input type="radio" name="user_type" value="other"
						onchange={() => (userTypeChoice = 'other')} />
					Other
					<small>Realtor, estate agent, etc.</small>
				</label>
			</div>
			{#if userTypeChoice === 'other'}
				<input
					type="text"
					name="user_type_custom"
					placeholder="Please specify…"
					required
					class="mt-2"
				/>
			{/if}
		</div>
		<div class="form-group">
			<label for="email">Email</label>
			<input id="email" type="email" name="email" required autocomplete="email" />
		</div>
		<div class="form-group">
			<label for="password">
				Password
				<span class="font-normal text-muted">(min 8 characters)</span>
			</label>
			<input id="password" type="password" name="password" required minlength="8" autocomplete="new-password" />
		</div>
		<button type="submit" class="btn-primary w-full">Register</button>
		<p class="register-disclaimer">
			By registering you may receive email notifications when announcements are posted to the portal.
		</p>
	</form>

	<div class="auth-links">
		<a href="/login">Already have an account?</a>
	</div>
</div>
