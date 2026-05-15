<script lang="ts">
	import DocumentCard from '$lib/components/DocumentCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state('');
	let activeCategory = $state('All');
	let sortBy = $state<'date' | 'name'>('date');
	let sortOpen = $state(false);
	let activeTags = $state(new Set<string>());
	let dropdownEl = $state<HTMLElement | undefined>(undefined);

	const sortLabels: Record<string, string> = { date: 'Most recent', name: 'Name A–Z' };

	const allTags = $derived(
		[...new Set(data.documents.flatMap((d) => d.tags))].sort()
	);

	$effect(() => {
		if (!sortOpen) return;
		function onClick(e: MouseEvent) {
			if (!dropdownEl?.contains(e.target as Node)) sortOpen = false;
		}
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	});

	function toggleTag(tag: string) {
		const next = new Set(activeTags);
		if (next.has(tag)) next.delete(tag);
		else next.add(tag);
		activeTags = next;
	}

	let filtered = $derived.by(() => {
		let docs = data.documents;

		if (activeCategory !== 'All') docs = docs.filter((d) => d.category === activeCategory);

		if (activeTags.size > 0) {
			docs = docs.filter((d) => [...activeTags].every((t) => d.tags.includes(t)));
		}

		if (search.trim()) {
			const words = search.toLowerCase().split(/\s+/).filter(Boolean);
			docs = docs.filter((d) => {
				const hay = [d.filename, d.description ?? '', d.category, ...d.tags].join(' ').toLowerCase();
				return words.every((w) => hay.includes(w));
			});
		}

		if (sortBy === 'name') {
			docs = [...docs].sort((a, b) => a.filename.localeCompare(b.filename));
		}

		return docs;
	});
</script>

<svelte:head><title>Documents – Waterloo Gardens</title></svelte:head>

<div class="page">
	<div class="page-header">
		<h1>Documents</h1>
		{#if data.session && data.profile?.status === 'approved'}
			<div class="controls">
				<div class="search-field">
					<input type="search" placeholder="Search by name, category or tag…" bind:value={search} />
				</div>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="dropdown" class:open={sortOpen} bind:this={dropdownEl}>
					<button class="dropdown-trigger" type="button" onclick={() => (sortOpen = !sortOpen)}>
						{sortLabels[sortBy]}
						<span class="arrow">▼</span>
					</button>
					{#if sortOpen}
						<div class="dropdown-menu">
							{#each Object.entries(sortLabels) as [val, label]}
								<button
									class="dropdown-item"
									class:selected={sortBy === val}
									type="button"
									onclick={() => { sortBy = val as 'date' | 'name'; sortOpen = false; }}
								>
									<span class="check">✓</span>{label}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if data.session && data.profile?.status === 'approved'}
		<div class="category-tabs">
			<button class:active={activeCategory === 'All'} onclick={() => (activeCategory = 'All')}>All</button>
			{#each data.categories as cat}
				<button class:active={activeCategory === cat} onclick={() => (activeCategory = cat)}>{cat}</button>
			{/each}
		</div>

		{#if allTags.length > 0}
			<div class="filter-bar">
				<span class="filter-bar-label">Tags:</span>
				{#each allTags as tag}
					<button
						class="tag-filter-pill"
						class:active={activeTags.has(tag)}
						type="button"
						onclick={() => toggleTag(tag)}
					>{tag}</button>
				{/each}
				{#if activeTags.size > 0}
					<button
						class="tag-filter-pill opacity-65"
						type="button"
						onclick={() => (activeTags = new Set())}
					>✕ Clear</button>
				{/if}
			</div>
		{/if}
	{/if}

	{#if !data.session}
		<div class="doc-login-prompt">
			<p>
				<a href="/login">Sign in</a> or <a href="/register">register</a> to access the document library.
			</p>
		</div>
	{:else if data.profile?.status === 'pending'}
		<div class="doc-login-prompt">
			<p>Your account is awaiting approval before you can access documents.</p>
		</div>
	{:else if filtered.length === 0}
		<p class="empty">No documents found.</p>
	{:else}
		<div class="doc-grid">
			{#each filtered as doc (doc.id)}
				<DocumentCard {doc} />
			{/each}
		</div>
	{/if}
</div>
