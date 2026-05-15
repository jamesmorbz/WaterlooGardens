<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Profile – Waterloo Gardens</title></svelte:head>

<div class="page profile-page">
	<h1 class="mb-5">Profile</h1>

	<div class="profile-grid">

		<!-- Left: editable forms -->
		<div class="profile-forms">
			<div class="profile-section">
				<h2>Display name</h2>
				{#if form?.nameError}<p class="error-msg">{form.nameError}</p>{/if}
				{#if form?.nameSuccess}<p class="info-msg">Name updated.</p>{/if}
				<form method="POST" action="?/updateName">
					<div class="form-group">
						<label for="full_name">Full name</label>
						<input id="full_name" type="text" name="full_name" value={data.profile?.full_name ?? ''} required />
					</div>
					<div class="form-group">
						<label for="flat_number">Flat number</label>
						<input id="flat_number" type="text" value={data.profile?.flat_number ?? ''} disabled />
					</div>
					<button type="submit" class="btn-primary">Save</button>
				</form>
			</div>

			<div class="profile-section">
				<h2>Email address</h2>
				{#if form?.emailError}<p class="error-msg">{form.emailError}</p>{/if}
				{#if form?.emailSuccess}<p class="info-msg">A confirmation email has been sent to your new address.</p>{/if}
				<form method="POST" action="?/updateEmail">
					<div class="form-group">
						<label for="email">New email</label>
						<input id="email" type="email" name="email" required autocomplete="email" />
					</div>
					<button type="submit" class="btn-primary">Update email</button>
				</form>
			</div>

			<div class="profile-section">
				<h2>Password</h2>
				{#if form?.passwordError}<p class="error-msg">{form.passwordError}</p>{/if}
				{#if form?.passwordSuccess}<p class="info-msg">Password updated.</p>{/if}
				<form method="POST" action="?/updatePassword">
					<div class="form-group">
						<label for="password">New password</label>
						<input id="password" type="password" name="password" minlength="8" required autocomplete="new-password" />
					</div>
					<button type="submit" class="btn-primary">Change password</button>
				</form>
			</div>
		</div>

		<!-- Right: account info + danger zone -->
		<div class="profile-aside">
			{#if data.profile}
				<div class="profile-section">
					<h2>Account</h2>
					<div class="flex flex-col gap-2 mt-1">
						<span class="text-sm text-muted">Flat {data.profile.flat_number}</span>
						<div class="flex gap-2 flex-wrap">
							<span class="user-type-badge" class:tenant={data.profile.user_type === 'tenant'}>{data.profile.user_type}</span>
							{#if data.profile.role === 'director'}
								<span class="user-type-badge" style="background:#ede9fe;color:#5b21b6">director</span>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<div class="profile-section danger-zone">
				<h2>Delete account</h2>
				<p class="text-[0.8rem] text-muted mb-3.5 leading-relaxed">
					Permanently deletes your account and signs you out. Posts and comments remain anonymised.
				</p>
				{#if form?.deleteError}<p class="error-msg">{form.deleteError}</p>{/if}
				<form method="POST" action="?/deleteAccount">
					<div class="form-group">
						<label for="confirm-delete">Type <strong>DELETE</strong> to confirm</label>
						<input id="confirm-delete" type="text" name="confirm" placeholder="DELETE" autocomplete="off" />
					</div>
					<button type="submit" class="btn-danger">Delete my account</button>
				</form>
			</div>
		</div>

	</div>
</div>
