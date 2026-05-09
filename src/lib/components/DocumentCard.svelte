<script lang="ts">
	import type { Document } from '$lib/types';

	let { doc }: { doc: Document & { signed_url: string | null } } = $props();

	const isPdf = $derived(doc.mime_type === 'application/pdf');

	function formatDate(s: string) {
		return new Date(s).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<div class="doc-card">
	<div class="doc-card-meta">
		<span class="category-badge">{doc.category}</span>
		<time class="doc-date">{formatDate(doc.created_at)}</time>
	</div>

	<p class="doc-name">{doc.filename}</p>

	{#if doc.description}
		<p class="doc-description">{doc.description}</p>
	{/if}

	{#if doc.tags.length > 0}
		<div class="doc-tags">
			{#each doc.tags as tag}
				<span class="tag-pill">{tag}</span>
			{/each}
		</div>
	{/if}

	<div class="doc-actions">
		{#if isPdf && doc.signed_url}
			<a
				href={doc.signed_url}
				target="_blank"
				rel="noopener noreferrer"
				class="btn-secondary preview-btn"
			>Preview</a>
		{/if}
		{#if doc.signed_url}
			<a href="/api/download/{doc.id}" class="btn-primary">Download</a>
		{/if}
	</div>
</div>
