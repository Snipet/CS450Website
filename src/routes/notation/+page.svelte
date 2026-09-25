<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { pageTitle, toolHref } from '$lib/site';
	import { toolBySlug } from '$lib/tools/registry';
	import { toolLink } from '$lib/tools/links';
	import type { ToolMeta } from '$lib/tools/types';
	import Badge from '$lib/components/ui/Badge.svelte';
	import CitationTag from '$lib/components/ui/CitationTag.svelte';
	import Disclosure from '$lib/components/ui/Disclosure.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import FrontierView from '$lib/components/search/FrontierView.svelte';
	import SearchTree from '$lib/components/search/SearchTree.svelte';
	import StateGraph from '$lib/components/search/StateGraph.svelte';
	import { describeStep } from '$lib/components/search/describe';
	import { LEGEND_TEXT } from '$lib/components/search/legend';
	import { graphHighlightAt } from '$lib/components/search/tree-view';
	import {
		MEASURES,
		MEASURE_IDS,
		PERCEPTS,
		VACUUM_ACTIONS,
		formatPercept,
		perceive,
		reflexProgram,
		reflexVacuumAgent,
		vacuumWorld
	} from '$lib/theory/agents/vacuum';
	import { vacuumStateCount, vacuumStateName, vacuumStates } from '$lib/theory/agents/vacuum-space';
	import { DIMENSIONS, PEAS_PARTS } from '$lib/theory/agents/environments';
	import { formatGraphText, parseGraphText, MAX_EDGES, MAX_STATES } from '$lib/theory/graphs';
	import { DIAGONAL_COST } from '$lib/theory/grid';
	import {
		PUZZLE_ACTIONS,
		REACHABLE_STATES,
		SLIDE_GOAL,
		SLIDE_START,
		formatBoard
	} from '$lib/theory/puzzle';
	import {
		DEFAULT_DLS_LIMIT,
		DEFAULT_IDS_MAX_LIMIT,
		DEFAULT_MAX_EXPANSIONS,
		DEFAULT_MAX_NODES,
		DEFAULT_WEIGHT,
		STRATEGY_PROPERTIES,
		usesHeuristic
	} from '$lib/theory/search';
	import GridMoves from './GridMoves.svelte';
	import MiniBoard from './MiniBoard.svelte';
	import StatusGlyph, { type GraphGlyph, type TreeGlyph } from './StatusGlyph.svelte';
	import VacuumStateGlyph from './VacuumStateGlyph.svelte';
	import {
		ASTAR_WRONG_TEXT,
		COMPLEXITIES,
		COMPONENTS,
		DECK_ROWS,
		GRAPH_SYNTAX,
		GRID_EXAMPLE,
		GRID_HEURISTIC_ROWS,
		HEURISTIC_PROPERTIES,
		PROBLEMS,
		PUZZLE_VALUES,
		REPEATED_STATE_RULES,
		RESULT_EXAMPLE,
		ROMANIA_SIZE,
		SECTIONS,
		SIBIU,
		SNAPSHOTS,
		STRATEGY_ROWS,
		SYMBOLS,
		TERMS,
		TINY_TEXT,
		TREE_SEARCH_OUTLINE,
		diagnosticExamples,
		codeParts,
		highlightSegments,
		linkable,
		mathParts,
		runSearch,
		runTitle,
		snapshotStep,
		stepExamples,
		traceChecks,
		type Run,
		type Section,
		type SectionId
	} from './notation';

	const description =
		'The notation of the CMSC450 tools: rational agents, search problems, symbols, strategies, diagram colors, step sentences, conventions, the graph text format, the 8-puzzle, grids, and slide citations.';

	const sectionById = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<
		SectionId,
		Section
	>;

	/** Registered tools among `slugs` (missing tools are left out). */
	function toolsFor(slugs: readonly string[]): ToolMeta[] {
		return slugs.map((s) => toolBySlug(s)).filter((t): t is ToolMeta => t !== undefined);
	}

	/** Link that opens a run in the search tool, or null (tool missing or options not linkable). */
	function searchLink(run: Run): string | null {
		if (!linkable(run)) return null;
		return toolLink('search', {
			graph: formatGraphText(PROBLEMS[run.problem].spec, { positions: true }),
			strategy: run.options.strategy,
			mode: run.options.mode
		});
	}

	// ---- Rational agents ----
	const slideWorld = vacuumWorld('A', true, true);
	const perceptRows = PERCEPTS.map((p) => ({
		percept: formatPercept(p),
		action: reflexVacuumAgent(p)
	}));
	const vacuumNames = vacuumStates(2).map((s) => ({ ...s, name: vacuumStateName(s) }));
	const PROGRAM_HEAD = 'function Vacuum-Agent([location, status]) returns an action';
	const PROGRAM_BODY = reflexProgram.rules.map((rule) => `\n  ${rule}`).join('');

	// ---- Diagram legend ----
	const graphLegend: { kind: GraphGlyph; name: string; text: string }[] = [
		{ kind: 'state', name: 'State', text: 'A circle with the state’s name.' },
		{
			kind: 'map',
			name: 'State on the Romania map',
			text: 'A small square with the name beside it, as on the slide map.'
		},
		{ kind: 'start', name: 'Start state', text: 'An arrow in from nowhere, labelled start.' },
		{ kind: 'goal', name: 'Goal state', text: 'A double outline.' },
		{
			kind: 'edge',
			name: 'Action, both ways',
			text: 'A line with the step cost (undirected graphs).'
		},
		{
			kind: 'directed',
			name: 'Action, one way',
			text: 'An arrow to the successor state, with the step cost.'
		},
		{
			kind: 'heuristic',
			name: LEGEND_TEXT.heuristic,
			text: 'The heuristic value of a state, written h=366.'
		},
		{
			kind: 'current',
			name: LEGEND_TEXT.current,
			text: 'The state of the node just taken off the frontier.'
		},
		{
			kind: 'frontier',
			name: LEGEND_TEXT.frontier,
			text: 'The state of a node waiting on the frontier: a colored outline.'
		},
		{
			kind: 'explored',
			name: LEGEND_TEXT.explored,
			text: 'Expanded earlier; in graph search, the explored set.'
		},
		{
			kind: 'dropped',
			name: LEGEND_TEXT.dropped,
			text: 'A child generated at this step whose node was not added: a dashed ring.'
		},
		{
			kind: 'path',
			name: LEGEND_TEXT.path,
			text: 'At the goal step: the states and actions of the solution.'
		}
	];

	const treeLegend: { kind: TreeGlyph; name: string; text: string }[] = [
		{
			kind: 'node',
			name: 'Node',
			text: 'Its state’s name. Children are drawn left to right in successor order.'
		},
		{
			kind: 'annotation',
			name: 'Priority',
			text: 'Under the node: what the strategy orders the frontier by (see below).'
		},
		{
			kind: 'current',
			name: LEGEND_TEXT.current,
			text: 'The node just taken off the frontier, marked with a triangle.'
		},
		{
			kind: 'frontier',
			name: LEGEND_TEXT.frontier,
			text: 'Generated and not yet taken off: a colored outline.'
		},
		{ kind: 'expanded', name: LEGEND_TEXT.expanded, text: 'Taken off the frontier and expanded.' },
		{
			kind: 'goal',
			name: LEGEND_TEXT.goal,
			text: 'The node that passed the goal test: a double outline.'
		},
		{
			kind: 'path',
			name: LEGEND_TEXT.path,
			text: 'The nodes and edges from the root to the goal node.'
		},
		{
			kind: 'dropped',
			name: LEGEND_TEXT.dropped,
			text: 'A child that did not go on the frontier: dashed and crossed out, as the slides cross out repeated states.'
		},
		{
			kind: 'cutoff',
			name: LEGEND_TEXT.cutoff,
			text: 'Goal-tested at the depth limit and not expanded.'
		},
		{
			kind: 'replaced',
			name: LEGEND_TEXT.replaced,
			text: 'A frontier node that a cheaper path to the same state replaced.'
		}
	];

	const annotationRows = STRATEGY_ROWS.filter((r) => r.annotation);
	const ANNOTATION_READS: Record<string, string> = {
		ucs: 'g(n)',
		greedy: 'h(n)',
		astar: 'f(n)=g(n)+h(n)',
		wastar: 'f(n)=g(n)+α·h(n)'
	};

	let snapshotId = $state(SNAPSHOTS[0].id);
	const snapshot = $derived(SNAPSHOTS.find((s) => s.id === snapshotId) ?? SNAPSHOTS[0]);
	const snapResult = $derived(runSearch(snapshot.run));
	const snapStep = $derived(snapshotStep(snapshot));
	const snapSpec = $derived(PROBLEMS[snapshot.run.problem].spec);
	const snapHighlight = $derived(graphHighlightAt(snapResult, snapStep));
	const snapSentence = $derived(describeStep(snapResult, snapStep));
	const snapLink = $derived(searchLink(snapshot.run));

	// ---- Step sentences and conventions ----
	const examples = stepExamples();
	const exampleGroups = [...new Set(examples.map((e) => e.group))].map((group) => ({
		group,
		rows: examples.filter((e) => e.group === group)
	}));
	const traces = traceChecks();
	const resultLink = searchLink(RESULT_EXAMPLE.run);

	// ---- Graph text ----
	const tinySegments = highlightSegments(TINY_TEXT);
	const wrongSegments = highlightSegments(ASTAR_WRONG_TEXT);
	const tinyParsed = parseGraphText(TINY_TEXT).spec;
	const diagnostics = diagnosticExamples();
	const SEVERITY_TONE = { error: 'reject', warning: 'active', info: 'info' } as const;
	const tinyLink = toolLink('search', { graph: TINY_TEXT });

	// ---- 8-puzzle ----
	const puzzleLink = toolLink('eight-puzzle', { start: SLIDE_START });
	const vacuumLink = toolLink('vacuum', {
		initial: vacuumStateName({ location: 0, dirt: [true, true] })
	});

	// ---- Table of contents: highlight the section being read ----
	let activeId = $state<SectionId>(SECTIONS[0].id);

	onMount(() => {
		const heads = SECTIONS.map((s) => document.getElementById(s.id)).filter(
			(el): el is HTMLElement => el !== null
		);
		// The current section is the last one whose heading is above 45% of the
		// viewport; at the bottom of the page it is the last section.
		const update = () => {
			const line = innerHeight * 0.45;
			let current = heads[0];
			for (const h of heads) if (h.getBoundingClientRect().top <= line) current = h;
			const root = document.documentElement;
			if (root.scrollTop > 0 && root.scrollTop + innerHeight >= root.scrollHeight - 2) {
				current = heads[heads.length - 1];
			}
			if (current) activeId = current.id as SectionId;
		};
		update();
		addEventListener('scroll', update, { passive: true });
		addEventListener('resize', update);
		return () => {
			removeEventListener('scroll', update);
			removeEventListener('resize', update);
		};
	});
</script>

<svelte:head>
	<title>{pageTitle('Notation')}</title>
	<meta name="description" content={description} />
</svelte:head>

{#snippet toc()}
	<ol class="toc-list">
		{#each SECTIONS as s (s.id)}
			<li>
				<a href="#{s.id}" aria-current={activeId === s.id ? 'location' : undefined}>{s.title}</a>
			</li>
		{/each}
	</ol>
{/snippet}

{#snippet sectionHead(id: SectionId)}
	{@const s = sectionById[id]}
	{@const tools = toolsFor(s.tools)}
	<div class="section-head">
		<h2 {id}>{s.title}</h2>
		{#if s.cites.length}
			<ul class="cites" aria-label="Lecture references">
				{#each s.cites as cite, i (i)}<li><CitationTag {cite} /></li>{/each}
			</ul>
		{/if}
		{#if tools.length}
			<p class="used-in">
				<span>Used in</span>
				{#each tools as t (t.slug)}
					<a href={toolHref(t.slug)}>{t.title}<Icon name="arrow-right" size={13} /></a>
				{/each}
			</p>
		{/if}
	</div>
{/snippet}

{#snippet math(text: string)}{#each mathParts(text) as p, i (i)}{#if p.sub}<sub>{p.text}</sub
			>{:else}{p.text}{/if}{/each}{/snippet}

{#snippet openLink(href: string | null, text: string)}
	{#if href}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
		<a class="open" {href}>{text}<Icon name="arrow-right" size={14} /></a>
	{/if}
{/snippet}

<div class="notation">
	<header class="page-head">
		<h1>Notation</h1>
		<p class="lede">
			The terms, symbols, and drawing conventions of the tools, and the choices they make where the
			slides leave one open. Each section cites the slides it follows.
		</p>
	</header>

	<details class="toc-mobile">
		<summary>On this page</summary>
		<nav aria-label="On this page (compact)">{@render toc()}</nav>
	</details>

	<div class="layout">
		<aside class="toc-side">
			<nav aria-label="On this page">
				<p class="toc-title">On this page</p>
				{@render toc()}
			</nav>
		</aside>

		<div class="content">
			<!-- ================================================================ -->
			<section aria-labelledby="agents">
				{@render sectionHead('agents')}
				<p>
					An <dfn>agent</dfn> is anything that can be viewed as perceiving its environment through
					<dfn>sensors</dfn> and acting upon that environment through <dfn>actuators</dfn>.
				</p>

				<h3>The vacuum world</h3>
				<div class="table-wrap">
					<table class="ref stack vacuum">
						<thead>
							<tr
								><th scope="col">Part</th><th scope="col">Written</th><th scope="col">Slide</th></tr
							>
						</thead>
						<tbody>
							<tr>
								<td>Squares</td>
								<td><span class="f">A</span>, <span class="f">B</span></td>
								<td><CitationTag cite={{ deck: 'agents', slide: 3 }} /></td>
							</tr>
							<tr>
								<td>Percept</td>
								<td>
									<span class="f">[location, status]</span>, e.g.
									<span class="f">{formatPercept(perceive(slideWorld))}</span>
								</td>
								<td><CitationTag cite={{ deck: 'agents', slide: 3 }} /></td>
							</tr>
							<tr>
								<td>Actions</td>
								<td class="f">{VACUUM_ACTIONS.join(', ')}</td>
								<td><CitationTag cite={{ deck: 'agents', slide: 3 }} /></td>
							</tr>
							<tr>
								<td>Search actions</td>
								<td>
									<span class="f">Left, Right, Suck</span>; the tools give each a step cost of 1
								</td>
								<td><CitationTag cite={{ deck: 'search', slide: 8 }} /></td>
							</tr>
						</tbody>
					</table>
				</div>

				<div class="code-pair">
					<figure>
						<pre class="code"><span class="kw">{PROGRAM_HEAD}</span>{PROGRAM_BODY}</pre>
						<figcaption>
							The reflex agent program <CitationTag cite={{ deck: 'agents', slide: 3 }} />
						</figcaption>
					</figure>
					<figure>
						<table class="tt" aria-label="Percept and the reflex agent's action">
							<thead><tr><th scope="col">Percept</th><th scope="col">Action</th></tr></thead>
							<tbody>
								{#each perceptRows as row (row.percept)}
									<tr><td>{row.percept}</td><td>{row.action}</td></tr>
								{/each}
							</tbody>
						</table>
						<figcaption>What the program returns</figcaption>
					</figure>
				</div>

				<h3>State names</h3>
				<p>
					A state is named by the agent’s square, a space, and <span class="f">C</span> (clean) or
					<span class="f">D</span> (dirty) for each square from left to right:
					<span class="f">A DD</span> has the agent in A and both squares dirty, as pictured on slide
					3. The state-space graph of slide 9, in its order:
				</p>
				<ul class="vacuum-states" aria-label="Vacuum world states">
					{#each vacuumNames as v (v.name)}
						<li>
							<VacuumStateGlyph location={v.location} dirt={v.dirt} />
							<span class="f">{v.name}</span>
						</li>
					{/each}
				</ul>
				{@render openLink(vacuumLink, 'Open the vacuum agent in A DD')}
				<div class="qa">
					<p class="question">
						How many possible states? What if there are n possible locations?
						<CitationTag cite={{ deck: 'search', slide: 8 }} />
					</p>
					<Disclosure openSummary="Hide answer">
						<p>
							{vacuumStateCount(2)}: the agent is in one of 2 squares, and each square is dirty or
							clean, so 2 · 2² states. With n locations there are n · 2<sup>n</sup>, so the state
							space grows exponentially with the size of the world.
						</p>
					</Disclosure>
				</div>

				<h3>Performance measures</h3>
				<p>
					A <dfn>performance measure</dfn> (utility function) is an objective criterion for success of
					an agent’s behavior. Whether the reflex agent is rational depends on the performance measure
					and the environment. The vacuum tool scores the world after each time step with one of these:
				</p>
				<div class="table-wrap">
					<table class="ref compact">
						<thead><tr><th scope="col">Measure</th><th scope="col">Points</th></tr></thead>
						<tbody>
							{#each MEASURE_IDS as id (id)}
								<tr><td>{MEASURES[id].name}</td><td>{MEASURES[id].description}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p>
					A <dfn>rational agent</dfn> selects, for each possible percept sequence, an action that is expected
					to maximize its performance measure, given the evidence provided by the percept sequence and
					its built-in knowledge. The expected utility of an action:
				</p>
				<p class="display math">
					<span>EU(action) =</span>
					<span><span class="sum">Σ</span><sub>outcomes</sub> P(outcome | action) U(outcome)</span>
				</p>

				<h3>PEAS</h3>
				<div class="table-wrap">
					<table class="ref compact">
						<thead><tr><th scope="col">Part</th><th scope="col">What it is</th></tr></thead>
						<tbody>
							{#each PEAS_PARTS as part (part.id)}
								<tr>
									<td
										><span class="peas"><span class="letter">{part.letter}</span>{part.name}</span
										></td
									>
									<td>{part.definition}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<h3>Environment types</h3>
				<p>
					Seven dimensions, in the order of the slides. The table of slide 17, and the environments
					tool, write the short values.
				</p>
				<div class="table-wrap">
					<table class="ref stack env">
						<thead>
							<tr>
								<th scope="col">Dimension</th>
								<th scope="col">Values</th>
								<th scope="col">Slide</th>
							</tr>
						</thead>
						<tbody>
							{#each DIMENSIONS as d (d.id)}
								<tr>
									<td>{d.label}</td>
									<td>
										{d.values.map((v) => v.label).join(' / ')}
									</td>
									<td><CitationTag cite={d.cite} /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="note-line">
					Strategic and Semidynamic are the values the review slide adds in parentheses
					<CitationTag cite={{ deck: 'agents', slide: 20 }} />
				</p>
			</section>

			<!-- ================================================================ -->
			<section aria-labelledby="problems">
				{@render sectionHead('problems')}
				<p>A search problem has five components:</p>
				<div class="table-wrap">
					<table class="ref stack components">
						<thead>
							<tr>
								<th scope="col">Component</th>
								<th scope="col">Meaning</th>
								<th scope="col">Romania (slide 6)</th>
							</tr>
						</thead>
						<tbody>
							{#each COMPONENTS as c (c.name)}
								<tr>
									<td>{c.name}</td>
									<td>{c.meaning}</td>
									<td data-label="Romania">{c.romania}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="table-wrap">
					<table class="ref stack terms">
						<thead>
							<tr
								><th scope="col">Term</th><th scope="col">Meaning</th><th scope="col">Slide</th></tr
							>
						</thead>
						<tbody>
							{#each TERMS as t (t.term)}
								<tr><td>{t.term}</td><td>{t.meaning}</td><td><CitationTag cite={t.cite} /></td></tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="code-pair outline">
					<figure>
						<ul class="algo">
							{#each TREE_SEARCH_OUTLINE.filter((l) => l.indent === 0) as line, i (i)}
								<li>
									{line.text}
									{#if i === 1}
										<ul>
											{#each TREE_SEARCH_OUTLINE.filter((l) => l.indent > 0) as sub, k (k)}
												<li>{sub.text}</li>
											{/each}
										</ul>
									{/if}
								</li>
							{/each}
						</ul>
						<figcaption>
							Tree Search Algorithm Outline <CitationTag cite={{ deck: 'search', slide: 28 }} />
						</figcaption>
					</figure>
					<figure>
						<ul class="algo rules-list">
							{#each REPEATED_STATE_RULES as rule, i (i)}<li>{rule}</li>{/each}
						</ul>
						<figcaption>
							Graph search adds, to handle repeated states <CitationTag
								cite={{ deck: 'search', slide: 36 }}
							/>
						</figcaption>
					</figure>
				</div>
				<div class="qa">
					<p class="question">
						What is the state space for the Romania problem?
						<CitationTag cite={{ deck: 'search', slide: 7 }} />
					</p>
					<Disclosure openSummary="Hide answer">
						<p>
							The {ROMANIA_SIZE.states} cities of the map, one state per city. Each of the
							{ROMANIA_SIZE.roads} roads is an action in both directions (go to the city at the other
							end), so the directed graph has {2 * ROMANIA_SIZE.roads} links.
						</p>
					</Disclosure>
				</div>
			</section>

			<!-- ================================================================ -->
			<section aria-labelledby="symbols">
				{@render sectionHead('symbols')}
				<div class="table-wrap">
					<table class="ref stack symbols">
						<thead>
							<tr
								><th scope="col">Symbol</th><th scope="col">Meaning</th><th scope="col">Slide</th
								></tr
							>
						</thead>
						<tbody>
							{#each SYMBOLS as s (s.symbol)}
								<tr>
									<td class="f sym">{@render math(s.symbol)}</td>
									<td>{s.meaning}</td>
									<td
										>{#if s.cite}<CitationTag cite={s.cite} />{/if}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<h3>Heuristics</h3>
				<div class="table-wrap">
					<table class="ref stack heuristics">
						<thead>
							<tr>
								<th scope="col">Property</th>
								<th scope="col">Condition</th>
								<th scope="col">Meaning</th>
								<th scope="col">Slide</th>
							</tr>
						</thead>
						<tbody>
							{#each HEURISTIC_PROPERTIES as p (p.name)}
								<tr>
									<td>{p.name}</td>
									<td class="f">{@render math(p.formula)}</td>
									<td>{p.meaning}</td>
									<td><CitationTag cite={p.cite} /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<h3>Complexity</h3>
				<p>
					Time is the number of nodes generated, space the largest number of nodes in memory, both
					in terms of <span class="f">b</span>, <span class="f">d</span>, <span class="f">m</span>,
					and
					<span class="f">C*</span>. Exponents are superscripts:
				</p>
				<div class="table-wrap">
					<table class="ref stack complexity">
						<thead>
							<tr>
								<th scope="col">Written</th>
								<th scope="col">Where it appears</th>
								<th scope="col">Slides</th>
							</tr>
						</thead>
						<tbody>
							{#each COMPLEXITIES as c (c.written)}
								<tr>
									<td class="f sym">
										O({c.base}{#if c.exponent}<sup>{c.exponent}</sup>{/if})
									</td>
									<td>{c.meaning}</td>
									<td
										><span class="cite-list"
											>{#each c.cite as ct, i (i)}<CitationTag cite={ct} />{/each}</span
										></td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="note-line">
					In plain text, such as the properties table below, the UCS bound is written
					<span class="f">O(b^(C*/ε))</span>.
				</p>
			</section>

			<!-- ================================================================ -->
			<section aria-labelledby="strategies">
				{@render sectionHead('strategies')}
				<p>
					A strategy is defined by the order of node expansion, which is the order its frontier
					gives nodes back. Names and short forms as the tools write them:
				</p>
				<div class="table-wrap">
					<table class="ref stack strategies">
						<thead>
							<tr>
								<th scope="col">Strategy</th>
								<th scope="col">Frontier</th>
								<th scope="col">Expands</th>
							</tr>
						</thead>
						<tbody>
							{#each STRATEGY_ROWS as r (r.id)}
								<tr>
									<td>
										<span class="strategy-name">{r.name}</span>
										<Badge mono>{r.short}</Badge>
									</td>
									<td>{r.frontier}</td>
									<td>
										{r.expands}
										{#if r.cite}<CitationTag cite={r.cite} />{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="note-line">
					DLS is the depth-limited DFS that IDS runs once per limit. Weighted A* orders the frontier
					by g(n) + α·h(n) with α = {DEFAULT_WEIGHT} unless set otherwise.
				</p>

				<h3>Properties</h3>
				<div class="table-wrap">
					<table class="ref stack props">
						<thead>
							<tr>
								<th scope="col">Algorithm</th>
								<th scope="col">Complete?</th>
								<th scope="col">Optimal?</th>
								<th scope="col">Time</th>
								<th scope="col">Space</th>
							</tr>
						</thead>
						<tbody>
							{#each STRATEGY_PROPERTIES as p (p.strategy)}
								<tr>
									<th scope="row">{p.name}</th>
									<td data-label="Complete?">{p.complete}</td>
									<td data-label="Optimal?">{p.optimal}</td>
									<td data-label="Time">{p.time}</td>
									<td data-label="Space">{p.space}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="note-line">
					The time and space of UCS are also written <span class="f">O(b<sup>C*/ε</sup>)</span>
					<CitationTag cite={{ deck: 'uninformed', slide: 44 }} />
				</p>
			</section>

			<!-- ================================================================ -->
			<section aria-labelledby="diagrams">
				{@render sectionHead('diagrams')}
				<p>
					The state-space graph draws each state once. The search tree draws a node for every path
					the search generates, so one state can appear many times. Both use the same status colors.
				</p>

				<h3>State-space graph</h3>
				<ul class="legend">
					{#each graphLegend as item (item.kind)}
						<li>
							<StatusGlyph form="graph" kind={item.kind} />
							<div>
								<p class="legend-name">{item.name}</p>
								<p class="legend-text">{item.text}</p>
							</div>
						</li>
					{/each}
				</ul>
				<p class="note-line">
					Statuses are drawn on circles and on the map squares of Romania, where the small markers
					are filled solid.
				</p>

				<h3>Search tree</h3>
				<ul class="legend">
					{#each treeLegend as item (item.kind)}
						<li>
							<StatusGlyph form="tree" kind={item.kind} />
							<div>
								<p class="legend-name">{item.name}</p>
								<p class="legend-text">{item.text}</p>
							</div>
						</li>
					{/each}
				</ul>

				<h4>Under each node</h4>
				<p>
					The value the frontier is ordered by, as the slides write it. For Sibiu, reached from Arad
					at path cost g = {SIBIU.g} with straight-line distance h = {SIBIU.h}:
				</p>
				<div class="table-wrap narrow">
					<table class="ref stack annotations">
						<thead>
							<tr
								><th scope="col">Strategy</th><th scope="col">Written</th><th scope="col">Reads</th
								></tr
							>
						</thead>
						<tbody>
							{#each annotationRows as r (r.id)}
								<tr>
									<td>{r.name}</td>
									<td class="f" data-label="Written">{r.annotation}</td>
									<td class="f" data-label="Reads">{ANNOTATION_READS[r.id]}</td>
								</tr>
							{/each}
							<tr>
								<td>BFS, DFS, DLS, IDS</td>
								<td colspan="2">nothing</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3>In a tool</h3>
				<div class="live-head">
					<SegmentedControl
						label="Example search"
						options={SNAPSHOTS.map((s) => ({ value: s.id, label: s.label }))}
						bind:value={snapshotId}
						size="sm"
					/>
					{@render openLink(snapLink, 'Open in the search tool')}
				</div>
				<p class="live-caption">
					<span class="run"
						>{runTitle(snapshot.run)}, step {snapStep + 1} of {snapResult.steps.length}:</span
					>
					{snapSentence}
				</p>
				<div class="live">
					<div>
						<SearchTree
							result={snapResult}
							step={snapStep}
							goals={snapSpec.goals}
							legend
							maxHeight={380}
							ariaLabel="Search tree of {runTitle(snapshot.run)}"
						/>
					</div>
					<div class="live-side">
						<StateGraph
							graph={snapSpec.graph}
							start={snapSpec.start}
							goals={snapSpec.goals}
							heuristic={usesHeuristic(snapshot.run.options.strategy) ? snapSpec.h : undefined}
							highlight={snapHighlight}
							nodeShape={snapshot.run.problem === 'romania' ? 'square' : 'circle'}
							height={300}
							legend
							ariaLabel="State-space graph of {PROBLEMS[snapshot.run.problem].name} at this step"
						/>
						<FrontierView result={snapResult} step={snapStep} level={4} maxChips={12} />
					</div>
				</div>
			</section>

			<!-- ================================================================ -->
			<section aria-labelledby="steps">
				{@render sectionHead('steps')}
				<p>
					The tools announce every step of a search in one sentence, in the words of the tree search
					outline. These sentences are produced by the same code, on the lecture graphs:
				</p>
				<div class="table-wrap">
					<table class="ref stack steps">
						<thead>
							<tr>
								<th scope="col">What happens</th>
								<th scope="col">Sentence</th>
								<th scope="col">Search</th>
							</tr>
						</thead>
						<tbody>
							{#each exampleGroups as g (g.group)}
								<tr class="group"><th colspan="3" scope="colgroup">{g.group}</th></tr>
								{#each g.rows as e (e.id)}
									{@const href = searchLink(e.run)}
									<tr>
										<td>{e.what}</td>
										<td class="sentence">{e.sentence}</td>
										<td class="source">
											{#if href}
												<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
												<a {href}>{e.title}, step {e.step + 1}</a>
											{:else}
												{e.title}, step {e.step + 1}
											{/if}
										</td>
									</tr>
								{/each}
							{/each}
						</tbody>
					</table>
				</div>
				<p>When the search ends, a summary gives the solution and the node counts:</p>
				<blockquote class="sentence-box">
					<p>{RESULT_EXAMPLE.text}</p>
					<footer>
						{#if resultLink}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- toolLink resolves the path -->
							<a href={resultLink}>{runTitle(RESULT_EXAMPLE.run)}</a>
						{:else}
							{runTitle(RESULT_EXAMPLE.run)}
						{/if}
					</footer>
				</blockquote>
			</section>

			<!-- ================================================================ -->
			<section aria-labelledby="defaults">
				{@render sectionHead('defaults')}
				<p>
					Where the slides leave a choice open, every tool makes the same one. With these choices
					the tools reproduce the traces on the slides:
				</p>
				<div class="table-wrap">
					<table class="ref stack traces">
						<thead>
							<tr>
								<th scope="col">Trace</th>
								<th scope="col">Produced</th>
								<th scope="col">On the slide</th>
							</tr>
						</thead>
						<tbody>
							{#each traces as t (t.id)}
								<tr>
									<td>
										<span class="trace-label">{t.label}</span>
										<span class="trace-run">{t.title}</span>
									</td>
									<td class="f trace">{t.produced}</td>
									<td>
										<span class="f trace">{t.slide}</span>
										<span class="trace-meta">
											<CitationTag cite={t.cite} />
											{#if t.matches}
												<Badge tone="accept"><Icon name="check" size={12} /> Matches</Badge>
											{:else}
												<Badge tone="reject">Differs</Badge>
											{/if}
										</span>
										{#if t.note}<span class="trace-note">{t.note}</span>{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<dl class="rules">
					<dt>Successor order</dt>
					<dd>
						Alphabetical by state name (“name order”): case-insensitive, with digit runs compared by
						value, so <span class="f">q2</span> comes before <span class="f">q10</span>. Typed-in
						graphs can switch to “listed”, the order the edges are written in.
					</dd>
					<dt>DFS order</dt>
					<dd>Children are pushed so that the first successor is expanded first.</dd>
					<dt>Goal test</dt>
					<dd>
						When a node is taken off the frontier, as in the tree search outline. An option tests
						children when they are generated instead; the root is then tested when the frontier is
						initialized.
					</dd>
					<dt>Expansion order</dt>
					<dd>Lists every node taken off the frontier, including the goal node.</dd>
					<dt>Ties</dt>
					<dd>In a priority queue, the node added first comes off first.</dd>
					<dt>Graph search</dt>
					<dd>
						A node’s state enters the explored set when the node is expanded; a child whose state is
						explored is not added. A child whose state is already on the frontier replaces that
						frontier node only for UCS, greedy, A*, and weighted A*, and only when its path cost is
						lower; otherwise it is not added. The replacing node is a new frontier entry, so it
						takes its place among ties as a new node.
					</dd>
					<dt>Path check</dt>
					<dd>
						“Avoid repeated states along path”: a child whose state is already on the path from the
						root to it is not added. Available for every strategy; it makes DFS and IDS complete in
						finite state spaces. <CitationTag cite={{ deck: 'uninformed', slide: 32 }} />
					</dd>
					<dt>Depth limit</dt>
					<dd>
						A node at depth = limit is goal-tested but not expanded: it is cut off, even when it has
						no children. DLS uses limit {DEFAULT_DLS_LIMIT} unless set otherwise. IDS runs DLS with limits
						0, 1, 2, … and stops at the first limit with a solution, when an iteration cuts nothing off
						(no solution), or at its largest limit ({DEFAULT_IDS_MAX_LIMIT} unless set otherwise).
					</dd>
					<dt>Counts</dt>
					<dd>
						<em>Generated</em> counts every node created, including the root and children that were
						not added. <em>Expanded</em> counts nodes whose successors were generated. The slides’ time
						is nodes generated; their space is the largest frontier, plus the explored set in graph search.
					</dd>
					<dt>Missing h values</dt>
					<dd>Greedy, A*, and weighted A* use h = 0 for states without a heuristic value.</dd>
					<dt>Weighted A*</dt>
					<dd>α = {DEFAULT_WEIGHT} unless set otherwise.</dd>
					<dt>Run limits</dt>
					<dd>
						A run stops at a limit on the nodes taken off the frontier (tools may set it; {DEFAULT_MAX_EXPANSIONS.toLocaleString(
							'en-US'
						)} unless set otherwise) or at {DEFAULT_MAX_NODES.toLocaleString('en-US')} generated nodes;
						its last step says which limit stopped it.
					</dd>
				</dl>
			</section>

			<!-- ================================================================ -->
			<section aria-labelledby="graph-text">
				{@render sectionHead('graph-text')}
				<p>
					Tools that take a typed graph read this format: one directive or edge per line. Directives
					are case-insensitive.
				</p>
				<div class="table-wrap">
					<table class="ref stack syntax">
						<thead><tr><th scope="col">Line</th><th scope="col">Meaning</th></tr></thead>
						<tbody>
							{#each GRAPH_SYNTAX as row (row.syntax)}
								<tr>
									<td class="f code-cell">
										{#each highlightSegments(row.syntax) as seg, i (i)}<span class={seg.className}
												>{seg.text}</span
											>{/each}
									</td>
									<td>
										{#each codeParts(row.meaning) as part, i (i)}{#if part.code}<code
													>{part.text}</code
												>{:else}{part.text}{/if}{/each}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p>
					Costs are numbers ≥ 0, like <span class="f">5</span> or <span class="f">2.5</span>; so are
					h values. A later line for the same edge replaces the earlier one. A graph has at most {MAX_STATES}
					states and {MAX_EDGES.toLocaleString('en-US')} edges.
				</p>

				<h3>Examples</h3>
				<div class="text-pair">
					<figure>
						<pre class="code">{#each tinySegments as seg, i (i)}<span class={seg.className}
									>{seg.text}</span
								>{/each}</pre>
						<figcaption>
							The tiny search problem <CitationTag cite={{ deck: 'uninformed', slide: 3 }} />
							{@render openLink(tinyLink, 'Open in the search tool')}
						</figcaption>
					</figure>
					<figure class="drawn">
						{#if tinyParsed}
							<StateGraph
								graph={tinyParsed.graph}
								start={tinyParsed.start}
								goals={tinyParsed.goals}
								height={300}
								ariaLabel="The tiny search problem drawn from the text"
							/>
						{/if}
						<figcaption>
							The same text, drawn. Without <code>at:</code> lines the states are placed
							automatically; <code>node:</code> lines keep their order.
						</figcaption>
					</figure>
				</div>
				<figure>
					<pre class="code">{#each wrongSegments as seg, i (i)}<span class={seg.className}
								>{seg.text}</span
							>{/each}</pre>
					<figcaption>
						A graph with a heuristic: A* gone wrong <CitationTag
							cite={{ deck: 'informed', slide: 27 }}
						/>
					</figcaption>
				</figure>

				<h3>Messages</h3>
				<p>Problems in the text are reported with the line they are on. For example:</p>
				<div class="table-wrap">
					<table class="ref stack messages">
						<thead><tr><th scope="col">Line</th><th scope="col">Message</th></tr></thead>
						<tbody>
							{#each diagnostics as d (d.line)}
								{#if d.diagnostic}
									<tr>
										<td class="f code-cell">{d.line}</td>
										<td>
											<Badge tone={SEVERITY_TONE[d.diagnostic.severity]}
												>{d.diagnostic.severity}</Badge
											>
											{d.diagnostic.message}
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<!-- ================================================================ -->
			<section aria-labelledby="puzzle">
				{@render sectionHead('puzzle')}
				<div class="boards">
					<figure>
						<MiniBoard board={SLIDE_START} label="Start state" />
						<figcaption>Start state</figcaption>
					</figure>
					<figure>
						<MiniBoard board={SLIDE_GOAL} label="Goal state" />
						<figcaption>Goal state</figcaption>
					</figure>
				</div>
				<div class="table-wrap">
					<table class="ref stack boards-text">
						<thead>
							<tr><th scope="col">Where</th><th scope="col">Written</th></tr>
						</thead>
						<tbody>
							<tr>
								<td>Text, row by row</td>
								<td
									><span class="f">{formatBoard(SLIDE_START)}</span> (<span class="f">_</span> is the
									blank)</td
								>
							</tr>
							<tr>
								<td>Links</td>
								<td
									><span class="f">{SLIDE_START}</span>: nine digits, <span class="f">0</span> for the
									blank</td
								>
							</tr>
							<tr>
								<td>Typing a board</td>
								<td>
									Tiles <span class="f">1</span>–<span class="f">8</span>, the blank as
									<span class="f">_</span> or <span class="f">0</span>; spaces, commas, slashes,
									line breaks, and brackets between them are ignored.
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<dl class="rules">
					<dt>Actions</dt>
					<dd>
						Move the blank <span class="f">{PUZZLE_ACTIONS.join(', ')}</span> (in successor order); each
						move costs 1.
					</dd>
					<dt>States</dt>
					<dd>
						{REACHABLE_STATES.toLocaleString('en-US')} states (9!/2) are reachable from any board. A board
						can be reached from the goal exactly when the parities of their inversions match.
					</dd>
					<dt>{@render math('h1(n)')}</dt>
					<dd>The number of misplaced tiles; the blank does not count.</dd>
					<dt>{@render math('h2(n)')}</dt>
					<dd>
						The total Manhattan distance: for each tile, the number of squares from its desired
						location, rows plus columns.
					</dd>
					<dt>{@render math('max(h1(n), h2(n))')}</dt>
					<dd>
						The two combined by taking the larger value <CitationTag
							cite={{ deck: 'informed', slide: 37 }}
						/>
					</dd>
				</dl>
				<div class="boards">
					<figure>
						<MiniBoard board={SLIDE_START} goal={SLIDE_GOAL} misplaced label="Misplaced tiles" />
						<figcaption class="f">
							{@render math('h1(start)')} = {PUZZLE_VALUES.h1}
						</figcaption>
					</figure>
					<figure>
						<MiniBoard board={SLIDE_START} goal={SLIDE_GOAL} distances label="Tile distances" />
						<figcaption class="f">
							{@render math('h2(start)')} = {PUZZLE_VALUES.h2Terms} = {PUZZLE_VALUES.h2}
						</figcaption>
					</figure>
				</div>
				<p class="note-line">
					The terms of h<sub>2</sub> are tiles 1 to 8 in order, as on the slide.
					{@render openLink(puzzleLink, 'Open the slide boards in the 8-puzzle tool')}
				</p>
				<div class="qa">
					<p class="question">
						Are h<sub>1</sub> and h<sub>2</sub> admissible?
						<CitationTag cite={{ deck: 'informed', slide: 32 }} />
					</p>
					<Disclosure openSummary="Hide answer">
						<p>
							Yes. Each is the cost of an optimal solution to a relaxed problem: if a tile can move
							anywhere, h<sub>1</sub>(n) gives the shortest solution; if a tile can move to any
							adjacent square, h<sub>2</sub>(n) does. <CitationTag
								cite={{ deck: 'informed', slide: 33 }}
							/>
						</p>
					</Disclosure>
				</div>
			</section>

			<!-- ================================================================ -->
			<section aria-labelledby="grid">
				{@render sectionHead('grid')}
				<p>
					A cell is written <span class="f">(column, row)</span>, counted from
					<span class="f">(0, 0)</span> at the top left. Walls block; every other cell is a state. The
					successor function lists neighbors clockwise from Up:
				</p>
				<div class="moves-row">
					<GridMoves diagonal={false} caption="4-connected: step cost 1" />
					<GridMoves
						diagonal
						caption="8-connected: diagonals cost √2 ≈ {DIAGONAL_COST.toFixed(2)}"
					/>
					<GridMoves
						diagonal
						wall
						caption="No cutting corners: a wall blocks both diagonals past it"
					/>
				</div>
				<p>
					Heuristics for a cell <span class="f">dx</span> columns and <span class="f">dy</span> rows
					from the goal, with values for dx = {GRID_EXAMPLE.dx}, dy = {GRID_EXAMPLE.dy}:
				</p>
				<div class="table-wrap">
					<table class="ref stack grid-h">
						<thead>
							<tr>
								<th scope="col">Heuristic</th>
								<th scope="col">Formula</th>
								<th scope="col">Example</th>
								<th scope="col">Admissible</th>
							</tr>
						</thead>
						<tbody>
							{#each GRID_HEURISTIC_ROWS as h (h.id)}
								<tr>
									<td>{h.name}</td>
									<td class="f" data-label="Formula">{h.formula}</td>
									<td class="f num" data-label="Example">{h.example}</td>
									<td data-label="Admissible">
										{h.admissible8 ? 'Yes' : h.admissible4 ? '4-connected only' : 'No'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p>
					The default is the exact distance on a grid without walls: Manhattan for 4-connected
					moves, octile for 8-connected. Weighted A* multiplies h by α; the slides’ example uses 5 ×
					the Euclidean distance.
				</p>
			</section>

			<!-- ================================================================ -->
			<section aria-labelledby="citations">
				{@render sectionHead('citations')}
				<p>
					Presets and sections cite a deck by its title and a slide number:
					<CitationTag cite={{ deck: 'uninformed', slide: 4 }} />, or a range:
					<CitationTag cite={{ deck: 'agents', slide: [6, 8] }} />.
				</p>
				<div class="table-wrap">
					<table class="ref stack decks">
						<thead>
							<tr>
								<th scope="col">Deck</th>
								<th scope="col">Id</th>
								<th scope="col">Covers</th>
								<th scope="col" class="num">Slides</th>
							</tr>
						</thead>
						<tbody>
							{#each DECK_ROWS as d (d.id)}
								<tr>
									<td>{d.title}</td>
									<td class="f" data-label="Id">{d.id}</td>
									<td data-label="Covers">{d.chapter}</td>
									<td class="num" data-label="Slides">{d.slides}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p>
					The <a href={resolve('/lectures')}>lectures page</a> lists each deck with the tools that cite
					it.
				</p>
			</section>
		</div>
	</div>
</div>

<style>
	.notation {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding-bottom: var(--space-8);
	}
	.page-head {
		max-width: var(--content-width);
		padding-top: var(--space-4);
	}
	.page-head h1 {
		margin-bottom: var(--space-3);
	}
	.lede {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-lg);
		line-height: 1.55;
	}

	/* ---------- layout and table of contents ---------- */
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-7);
	}
	.toc-side {
		display: none;
	}
	.toc-mobile {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.toc-mobile summary {
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
	}
	.toc-mobile nav {
		padding: 0 var(--space-3) var(--space-3);
	}
	.toc-list {
		margin: 0;
		padding: 0;
		list-style: none;
		counter-reset: toc;
	}
	.toc-list li {
		counter-increment: toc;
	}
	.toc-list a {
		display: flex;
		gap: 10px;
		padding: 5px 8px;
		border-left: 2px solid transparent;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.35;
		text-decoration: none;
	}
	.toc-list a::before {
		content: counter(toc);
		min-width: 1.4em;
		color: var(--text-3);
		font-variant-numeric: tabular-nums;
	}
	.toc-list a:hover {
		color: var(--text);
	}
	.toc-list a[aria-current] {
		border-left-color: var(--accent);
		color: var(--text);
		font-weight: 500;
	}
	.toc-title {
		margin: 0 0 var(--space-2);
		padding-left: 10px;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	@media (min-width: 1024px) {
		.layout {
			grid-template-columns: 220px minmax(0, 1fr);
		}
		.toc-side {
			display: block;
		}
		.toc-side nav {
			position: sticky;
			top: calc(56px + var(--space-5));
		}
		.toc-mobile {
			display: none;
		}
	}

	/* ---------- sections ---------- */
	.content {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
		max-width: 56rem;
		min-width: 0;
		container-type: inline-size;
	}
	.content section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-width: 0;
	}
	.content section > :global(*) {
		margin: 0;
	}
	.section-head {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--border);
	}
	.section-head h2 {
		margin: 0;
	}
	.cites {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.cites li {
		display: flex;
		min-width: 0;
		max-width: 100%;
	}
	.used-in {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-3);
		margin: 0;
		font-size: var(--text-sm);
	}
	.used-in > span {
		color: var(--text-3);
	}
	.used-in a,
	.open {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-weight: 500;
		text-decoration: none;
	}
	.used-in a:hover,
	.open:hover {
		text-decoration: underline;
	}
	.open {
		font-size: var(--text-sm);
	}
	h3 {
		margin: var(--space-3) 0 0;
		font-size: var(--text-xl);
	}
	h4 {
		margin: var(--space-2) 0 0;
		font-size: var(--text-lg);
	}
	dfn {
		font-style: italic;
		font-weight: 500;
	}
	.f {
		font-family: var(--font-mono);
		font-size: 0.92em;
		font-variant-ligatures: none;
	}
	span.f {
		white-space: nowrap;
	}
	.sym {
		font-size: 1em;
		white-space: nowrap;
	}
	sub,
	sup {
		font-size: 0.72em;
		line-height: 0;
	}
	.display {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius);
		background: var(--surface-2);
		text-align: center;
	}
	.math {
		font-family: var(--font-serif);
		font-size: 1.15rem;
		font-style: italic;
	}
	.math > span {
		display: inline-block;
	}
	.math .sum {
		font-size: 1.3em;
		font-style: normal;
		line-height: 1;
	}
	.note-line {
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.8;
	}

	/* ---------- reference tables ---------- */
	.table-wrap {
		max-width: 100%;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.table-wrap.narrow {
		max-width: 34rem;
	}
	.ref {
		width: 100%;
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.ref th,
	.ref td {
		padding: 8px 14px;
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}
	.ref thead th {
		background: var(--surface-2);
		color: var(--text-2);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.ref tbody th[scope='row'] {
		font-weight: 600;
	}
	.ref tbody tr:last-child > * {
		border-bottom: 0;
	}
	.ref tr.group th {
		padding-top: 12px;
		padding-bottom: 4px;
		background: var(--surface);
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.ref td:first-child {
		white-space: nowrap;
	}
	.ref .num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.ref td:last-child :global(.cite),
	.cite-list :global(.cite) {
		margin: 1px 0;
	}
	.cite-list {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.peas {
		display: inline-flex;
		align-items: center;
	}
	.letter {
		display: inline-grid;
		flex: none;
		place-items: center;
		width: 1.4rem;
		height: 1.4rem;
		margin-right: var(--space-2);
		border-radius: var(--radius-sm);
		background: var(--accent-soft);
		color: var(--accent);
		font-family: var(--font-serif);
		font-weight: 700;
	}
	.strategy-name {
		margin-right: var(--space-2);
		font-weight: 500;
	}
	.strategies td:first-child {
		white-space: normal;
		min-width: 12rem;
	}
	.strategies td:last-child :global(.cite) {
		margin-top: 4px;
	}
	.props td,
	.props th {
		white-space: normal;
	}
	.props td:nth-child(4),
	.props td:nth-child(5) {
		min-width: 9rem;
	}
	.code-cell {
		white-space: nowrap;
	}
	.syntax td:first-child {
		width: 1%;
	}
	.syntax code {
		white-space: nowrap;
	}
	.steps .sentence {
		min-width: 16rem;
	}
	.steps .source {
		min-width: 9rem;
		color: var(--text-2);
		font-size: var(--text-xs);
	}
	.steps td:first-child {
		white-space: normal;
		min-width: 9rem;
	}
	.traces .trace {
		white-space: normal;
		overflow-wrap: anywhere;
	}
	.traces td:first-child {
		white-space: normal;
		min-width: 10rem;
	}
	.trace-label {
		display: block;
		font-weight: 500;
	}
	.trace-run {
		display: block;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.trace-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-top: 4px;
	}
	.trace-note {
		display: block;
		margin-top: 2px;
		color: var(--text-3);
		font-size: var(--text-xs);
	}
	.messages td:last-child :global(.badge) {
		margin-right: var(--space-1);
	}
	.grid-h td:nth-child(2) {
		min-width: 12rem;
	}

	/* Narrow screens: some tables become one card per row. */
	@media (max-width: 640px) {
		.ref th,
		.ref td {
			padding: 8px 10px;
		}
		.ref td:first-child {
			white-space: normal;
		}
		.stack thead {
			display: none;
		}
		.stack,
		.stack tbody,
		.stack tr,
		.stack td {
			display: block;
		}
		.stack tr {
			padding: 10px 14px;
			border-bottom: 1px solid var(--border);
		}
		.stack tbody tr:last-child {
			border-bottom: 0;
		}
		.stack tr.group {
			padding-bottom: 0;
			border-bottom: 0;
		}
		.stack tr.group th {
			display: block;
			padding: 4px 0 0;
		}
		.ref.stack td {
			min-width: 0;
			padding: 2px 0;
			border: 0;
		}
		.stack td:first-child,
		.stack tbody th[scope='row'] {
			font-weight: 600;
		}
		.stack tbody th[scope='row'] {
			display: block;
			padding: 0 0 2px;
			border: 0;
		}
		.stack td[data-label]::before {
			content: attr(data-label);
			margin-right: 8px;
			color: var(--text-3);
			font-family: var(--font-sans);
			font-size: var(--text-xs);
			font-weight: 500;
			letter-spacing: 0.04em;
			text-transform: uppercase;
		}
		.ref.stack .num {
			text-align: left;
		}
		.stack.syntax td:first-child {
			width: auto;
		}
		.stack.symbols td:first-child {
			font-weight: 500;
		}
	}

	/* ---------- code, algorithm outlines, figures ---------- */
	figure {
		margin: 0;
		min-width: 0;
	}
	figcaption {
		margin-top: var(--space-2);
		color: var(--text-3);
		font-size: var(--text-sm);
		line-height: 1.9;
	}
	figcaption :global(.cite),
	.note-line :global(.cite) {
		margin-left: 4px;
	}
	figcaption .open {
		margin-left: var(--space-2);
	}
	.code {
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: 0.8125rem;
		line-height: 1.7;
		/* Long lines (the agent program at 360 px) wrap instead of hiding behind a scrollbar. */
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.code .kw {
		color: var(--syn-keyword);
		font-weight: 600;
	}
	.code-pair,
	.text-pair {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
	}
	@container (min-width: 720px) {
		.code-pair {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: start;
		}
		.text-pair {
			grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
			align-items: start;
		}
	}
	@container (min-width: 600px) {
		.code-pair.outline {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.tt {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		font-variant-ligatures: none;
		border: 1px solid var(--border-strong);
		background: var(--surface);
	}
	.tt th,
	.tt td {
		padding: 5px 14px;
		border: 1px solid var(--border);
		text-align: left;
	}
	.tt thead th {
		background: var(--surface-2);
		font-family: var(--font-sans);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.algo {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 0;
		padding: var(--space-3) var(--space-4) var(--space-3) calc(var(--space-4) + 1.2em);
		border: 1px solid var(--border);
		border-left: 3px solid var(--accent);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.algo ul {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin: 6px 0 0;
		padding-left: 1.2em;
		list-style: '– ';
	}
	.algo li::marker {
		color: var(--text-3);
	}
	.rules-list {
		border-left-color: var(--explored);
	}

	/* ---------- slide questions ---------- */
	.qa {
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.question {
		margin: 0 0 var(--space-1);
		font-weight: 500;
		line-height: 1.8;
	}
	.question :global(.cite) {
		margin-left: 6px;
		font-weight: 400;
	}
	.qa :global(.disclosure .content) {
		color: var(--text-2);
	}

	/* ---------- rule lists ---------- */
	.rules {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-1) var(--space-5);
		margin: 0;
	}
	.rules dt {
		font-weight: 600;
	}
	.rules dd {
		margin: 0 0 var(--space-3);
		color: var(--text-2);
	}
	@media (min-width: 720px) {
		.rules {
			grid-template-columns: 10rem minmax(0, 1fr);
		}
		.rules dd {
			margin-bottom: var(--space-2);
		}
	}

	/* ---------- agents ---------- */
	.vacuum-states {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.75rem, 1fr));
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
		max-width: 46rem;
	}
	.vacuum-states li {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 8px 4px 6px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: var(--text-sm);
	}

	/* ---------- diagram legend ---------- */
	.legend {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
		gap: var(--space-2) var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.legend-name {
		margin: 0;
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.legend-text {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.45;
	}
	.live-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
	}
	.live-caption {
		padding: var(--space-2) var(--space-3);
		border-left: 3px solid var(--active);
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		font-size: var(--text-sm);
	}
	.live-caption .run {
		color: var(--text-3);
	}
	.live {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		container-type: inline-size;
	}
	.live-side {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
		min-width: 0;
	}
	@container (min-width: 760px) {
		.live-side {
			grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
			align-items: start;
		}
	}

	/* ---------- step sentences ---------- */
	.sentence-box {
		margin: 0;
		padding: var(--space-3) var(--space-4);
		border-left: 3px solid var(--accept);
		border-radius: var(--radius-sm);
		background: var(--surface-2);
	}
	.sentence-box p {
		margin: 0 0 var(--space-1);
	}
	.sentence-box footer {
		color: var(--text-3);
		font-size: var(--text-xs);
	}

	/* ---------- 8-puzzle and grid ---------- */
	.boards {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-5);
	}
	.boards figcaption {
		color: var(--text-2);
	}
	.moves-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: var(--space-5);
	}
</style>
