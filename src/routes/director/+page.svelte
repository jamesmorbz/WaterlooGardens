<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let tab = $state(untrack(() => data.tab));
	let residentSearch = $state('');
	let docSearch = $state('');

	// Upload tab state
	let selectedFile = $state('');
	let uploadFileObj = $state<File | null>(null);
	let uploadFilename = $state('');
	let uploadDesc = $state('');
	let uploadCategory = $state('');
	let uploadTags = $state('');
	let uploadStatus = $state<'idle' | 'uploading' | 'saving' | 'done' | 'error'>('idle');
	let uploadError = $state('');

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
		const file = input.files?.[0] ?? null;
		uploadFileObj = file;
		selectedFile = file?.name ?? '';
		uploadFilename = file?.name.replace(/\.pdf$/i, '') ?? '';
		uploadStatus = 'idle';
		uploadError = '';
	}

	async function handleUploadSubmit(e: SubmitEvent) {
		e.preventDefault();

		if (!uploadFileObj) { uploadError = 'Please select a file.'; return; }
		if (uploadFileObj.size > 20 * 1024 * 1024) { uploadError = 'File must be under 20 MB.'; return; }
		if (!uploadFilename.trim()) { uploadError = 'Display name is required.'; return; }
		if (!uploadCategory.trim()) { uploadError = 'Category is required.'; return; }

		uploadStatus = 'uploading';
		uploadError = '';

		try {
			// Step 1: get a signed upload URL from our server
			const urlRes = await fetch('/api/upload-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename: uploadFileObj.name })
			});
			if (!urlRes.ok) {
				const body = await urlRes.json().catch(() => ({}));
				throw new Error(body.message ?? 'Failed to prepare upload.');
			}
			const { signedUrl, storagePath } = await urlRes.json();

			// Step 2: upload directly to Supabase Storage — bypasses Vercel entirely
			const putRes = await fetch(signedUrl, {
				method: 'PUT',
				body: uploadFileObj,
				headers: { 'Content-Type': 'application/pdf' }
			});
			if (!putRes.ok) throw new Error('File upload failed. Please try again.');

			// Step 3: save metadata row
			uploadStatus = 'saving';
			const tags = uploadTags.split(',').map((t) => t.trim()).filter(Boolean);
			const saveRes = await fetch('/api/save-document', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename: uploadFilename.trim(),
					description: uploadDesc.trim() || null,
					category: uploadCategory.trim(),
					tags,
					storagePath
				})
			});
			if (!saveRes.ok) {
				const body = await saveRes.json().catch(() => ({}));
				throw new Error(body.message ?? 'Failed to save document record.');
			}

			// Reset form
			uploadFileObj = null;
			selectedFile = '';
			uploadFilename = '';
			uploadDesc = '';
			uploadCategory = '';
			uploadTags = '';
			uploadStatus = 'done';
		} catch (err) {
			uploadStatus = 'error';
			uploadError = err instanceof Error ? err.message : 'Upload failed.';
		}
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
			<div class="form-group">
				<label class="checkbox-label">
					<input type="checkbox" name="send_email" />
					Email this announcement to all approved residents
				</label>
			</div>
			<button type="submit" class="btn-primary">Post Announcement</button>
		</form>

	{:else if tab === 'upload'}
		{#if uploadStatus === 'done'}
			<p class="info-msg" style="background:#d1fae5;color:#065f46">Document uploaded successfully.</p>
		{/if}
		{#if uploadStatus === 'error'}
			<p class="error-msg">{uploadError}</p>
		{/if}
		<form onsubmit={handleUploadSubmit} style="max-width:560px">
			<div class="form-group">
				<p style="font-size:0.875rem;font-weight:500;margin:0 0 0.375rem">PDF file</p>
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<label class="upload-zone" class:has-file={selectedFile} for="file-input">
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
						accept=".pdf,application/pdf"
						onchange={onFileChange}
					/>
				</label>
			</div>
			<div class="form-group">
				<label for="doc-filename">Display name</label>
				<input
					id="doc-filename"
					type="text"
					required
					placeholder="e.g. Service Charge Accounts 2025"
					bind:value={uploadFilename}
				/>
			</div>
			<div class="form-group">
				<label for="doc-desc">Description <span style="font-weight:400;color:var(--color-muted)">(optional)</span></label>
				<textarea id="doc-desc" rows="2" placeholder="Brief description of the document" bind:value={uploadDesc}></textarea>
			</div>
			<div class="form-group">
				<label for="doc-cat">Category</label>
				<input
					id="doc-cat"
					type="text"
					required
					placeholder="e.g. Finance"
					list="cat-suggestions"
					bind:value={uploadCategory}
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
					placeholder="e.g. 2025, service charge, accounts"
					bind:value={uploadTags}
				/>
			</div>
			<button type="submit" class="btn-primary" disabled={uploadStatus === 'uploading' || uploadStatus === 'saving'}>
				{#if uploadStatus === 'uploading'}Uploading…{:else if uploadStatus === 'saving'}Saving…{:else}Upload Document{/if}
			</button>
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
