<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let tab = $state(untrack(() => data.tab));
	let selectedFile = $state('');
	let residentSearch = $state('');
	let docSearch = $state('');

	let filteredResidents = $derived.by(() => {
		if (!residentSearch.trim()) return data.allUsers;
		const q = residentSearch.toLowerCase();
		return data.allUsers.filter(
			(u) =>
				u.full_name.toLowerCase().includes(q) ||
				u.flat_number.toLowerCase().includes(q) ||
				u.user_type.toLowerCase().includes(q)
		);
	});

	let filteredDocs = $derived.by(() => {
		if (!docSearch.trim()) return data.allDocs;
		const words = docSearch.toLowerCase().split(/\s+/).filter(Boolean);
		return data.allDocs.filter((d) => {
			const hay = [d.filename, d.category, ...d.tags].join(' ').toLowerCase();
			return words.every((w) => hay.includes(w));
		});
	});

	function setTab(t: string) {
		tab = t;
		history.replaceState(null, '', `/director?tab=${t}`);
	}

	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		selectedFile = input.files?.[0]?.name ?? '';
	}
</script>

<svelte:head><title>Director Panel – Waterloo Gardens</title></svelte:head>

<div class="page">
	<h1 style="margin-bottom:1.5rem">Director Panel</h1>

	<div class="panel-tabs">
		<button class="panel-tab" class:active={tab === 'pending'} onclick={() => setTab('pending')}>
			Pending
			{#if data.pending.length > 0}
				<span class="badge">{data.pending.length}</span>
			{/if}
		</button>
		<button class="panel-tab" class:active={tab === 'announce'} onclick={() => setTab('announce')}>
			Post Announcement
		</button>
		<button class="panel-tab" class:active={tab === 'upload'} onclick={() => setTab('upload')}>
			Upload Document
		</button>
		<button class="panel-tab" class:active={tab === 'docs'} onclick={() => setTab('docs')}>
			Documents
		</button>
		<button class="panel-tab" class:active={tab === 'residents'} onclick={() => setTab('residents')}>
			Residents
		</button>
	</div>

	{#if tab === 'pending'}
		{#if data.pending.length === 0}
			<p class="empty">No pending registrations.</p>
		{:else}
			{#if form?.error}<p class="error-msg">{form.error}</p>{/if}
			<table class="director-table">
				<thead>
					<tr>
						<th>Name</th><th>Flat</th><th>Type</th><th>Registered</th><th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.pending as user (user.id)}
						<tr>
							<td>{user.full_name}</td>
							<td>{user.flat_number}</td>
							<td><span class="user-type-badge" class:tenant={user.user_type === 'tenant'}>{user.user_type}</span></td>
							<td>{new Date(user.created_at).toLocaleDateString('en-GB')}</td>
							<td>
								<div class="action-row">
									<form method="POST" action="?/approve">
										<input type="hidden" name="user_id" value={user.id} />
										<button type="submit" class="btn-primary">Approve</button>
									</form>
									<form method="POST" action="?/reject" style="display:flex;gap:0.375rem;align-items:center">
										<input type="hidden" name="user_id" value={user.id} />
										<input class="reject-note" type="text" name="note" placeholder="Reason (optional)" />
										<button type="submit" class="btn-danger">Reject</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}

	{:else if tab === 'announce'}
		{#if page.url.searchParams.get('posted')}
			<p class="info-msg" style="background:#d1fae5;color:#065f46">Announcement posted successfully.</p>
		{/if}
		{#if form?.error}<p class="error-msg">{form.error}</p>{/if}
		<form method="POST" action="?/postAnnouncement" style="max-width:560px">
			<div class="form-group">
				<label for="ann-title">Title <span style="font-weight:400;color:var(--color-muted)">(optional)</span></label>
				<input id="ann-title" type="text" name="title" placeholder="e.g. AGM Notice – June 2026" />
			</div>
			<div class="form-group">
				<label for="ann-body">Announcement</label>
				<textarea id="ann-body" name="body" required rows="6" placeholder="Write your announcement…"></textarea>
			</div>
			<div class="form-group">
				<label class="checkbox-label">
					<input type="checkbox" name="pinned" />
					Pin this announcement (shows at the top)
				</label>
			</div>
			<button type="submit" class="btn-primary">Post Announcement</button>
		</form>

	{:else if tab === 'upload'}
		{#if page.url.searchParams.get('uploaded')}
			<p class="info-msg" style="background:#d1fae5;color:#065f46">Document uploaded successfully.</p>
		{/if}
		{#if form?.error}<p class="error-msg">{form.error}</p>{/if}
		<form
			method="POST"
			action="?/uploadDocument"
			enctype="multipart/form-data"
			style="max-width:560px"
		>
			<div class="form-group">
				<p style="font-size:0.875rem;font-weight:500;margin:0 0 0.375rem">PDF file</p>
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<label
					class="upload-zone"
					class:has-file={selectedFile}
					for="file-input"
				>
					<div class="upload-icon">📄</div>
					{#if selectedFile}
						<p class="file-name">{selectedFile}</p>
						<p>Click to change file</p>
					{:else}
						<p><strong>Click to select a PDF</strong></p>
						<p>PDF files only · max 20 MB</p>
					{/if}
					<input
						id="file-input"
						type="file"
						name="file"
						accept=".pdf,application/pdf"
						required
						onchange={onFileChange}
					/>
				</label>
			</div>
			<div class="form-group">
				<label for="doc-filename">Display name</label>
				<input
					id="doc-filename"
					type="text"
					name="filename"
					required
					placeholder="e.g. Service Charge Accounts 2025"
					value={selectedFile.replace(/\.pdf$/i, '')}
				/>
			</div>
			<div class="form-group">
				<label for="doc-desc">Description <span style="font-weight:400;color:var(--color-muted)">(optional)</span></label>
				<textarea id="doc-desc" name="description" rows="2" placeholder="Brief description of the document"></textarea>
			</div>
			<div class="form-group">
				<label for="doc-cat">Category</label>
				<input
					id="doc-cat"
					type="text"
					name="category"
					required
					placeholder="e.g. Finance"
					list="cat-suggestions"
				/>
				<datalist id="cat-suggestions">
					<option value="Finance"></option>
					<option value="Legal"></option>
					<option value="Minutes"></option>
					<option value="Insurance"></option>
					<option value="Maintenance"></option>
					<option value="Correspondence"></option>
					<option value="Planning"></option>
				</datalist>
			</div>
			<div class="form-group">
				<label for="doc-tags">Tags <span style="font-weight:400;color:var(--color-muted)">(comma-separated)</span></label>
				<input
					id="doc-tags"
					type="text"
					name="tags"
					placeholder="e.g. 2025, service charge, accounts"
				/>
			</div>
			<button type="submit" class="btn-primary">Upload Document</button>
		</form>

	{:else if tab === 'docs'}
		{#if form?.error}<p class="error-msg">{form.error}</p>{/if}
		<div class="search-field" style="max-width:360px;margin-bottom:1.25rem">
			<input type="search" placeholder="Search by name or category…" bind:value={docSearch} />
		</div>
		{#if data.allDocs.length === 0}
			<p class="empty">No documents uploaded yet.</p>
		{:else if filteredDocs.length === 0}
			<p class="empty">No documents match "{docSearch}".</p>
		{:else}
			<table class="director-table">
				<thead>
					<tr><th>Name</th><th>Category</th><th>Uploaded</th><th></th></tr>
				</thead>
				<tbody>
					{#each filteredDocs as doc (doc.id)}
						<tr>
							<td>{doc.filename}</td>
							<td><span class="category-badge">{doc.category}</span></td>
							<td>{new Date(doc.created_at).toLocaleDateString('en-GB')}</td>
							<td>
								<form method="POST" action="?/deleteDocument">
									<input type="hidden" name="doc_id" value={doc.id} />
									<button
										type="submit"
										class="btn-danger"
										onclick={(e) => { if (!confirm(`Delete "${doc.filename}"?`)) e.preventDefault(); }}
									>Delete</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}

	{:else if tab === 'residents'}
		<div class="search-field" style="max-width:360px;margin-bottom:1.25rem">
			<input type="search" placeholder="Search by name, flat or type…" bind:value={residentSearch} />
		</div>
		{#if filteredResidents.length === 0}
			<p class="empty">No residents match "{residentSearch}".</p>
		{:else}
			<table class="director-table">
				<thead>
					<tr><th>Name</th><th>Flat</th><th>Type</th><th>Role</th><th>Status</th></tr>
				</thead>
				<tbody>
					{#each filteredResidents as user (user.id)}
						<tr>
							<td>{user.full_name}</td>
							<td>{user.flat_number}</td>
							<td><span class="user-type-badge" class:tenant={user.user_type === 'tenant'}>{user.user_type ?? '—'}</span></td>
							<td>{user.role}</td>
							<td><span class="status-badge status-{user.status}">{user.status}</span></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	{/if}
</div>
