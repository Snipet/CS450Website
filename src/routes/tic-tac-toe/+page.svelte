<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Badge,
		Button,
		Callout,
		CitationTag,
		Icon,
		Kbd,
		NumberField,
		Panel,
		PresetMenu,
		SegmentedControl,
		Select,
		TextField,
		Toggle,
		ToolPage,
		type Preset
	} from '$lib/components/ui';
	import {
		EMPTY_BOARD,
		boardDiagnostics,
		formatBoard,
		legalMoves,
		readBoardText,
		squareLabel,
		toMove,
		type Mark
	} from '$lib/theory/games/tictactoe';
	import {
		DEFAULT_WEIGHTS,
		FEATURES,
		MAX_DEPTH,
		MAX_WEIGHT,
		MIN_DEPTH,
		WIN_SCORE,
		evaluate,
		features,
		gameTree,
		minimax,
		reachablePositions,
		type Weights
	} from '$lib/theory/games/tictactoe-search';
	import { formatCount } from '$lib/theory/search';
	import { tool } from '$lib/tools/catalog/tic-tac-toe';
	import GameBoard from '$lib/tools/tic-tac-toe/GameBoard.svelte';
	import GameTree from '$lib/tools/tic-tac-toe/GameTree.svelte';
	import SearchStats from '$lib/tools/tic-tac-toe/SearchStats.svelte';
	import {
		cutoffReport,
		emptyBoardStats,
		moveAnnotations,
		searchStats,
		type ValueMode
	} from '$lib/tools/tic-tac-toe/analysis';
	import {
		CHESS_CITE,
		CHESS_SYSTEMS,
		GAME_NOTES,
		GAME_TYPES
	} from '$lib/tools/tic-tac-toe/content';
	import {
		announceMove,
		computerSummary,
		cutoffWord,
		formatValue,
		outcomeWord,
		resultSentence,
		speakBoard,
		squareTitle,
		statusHeadline,
		valueSentence
	} from '$lib/tools/tic-tac-toe/describe';
	import { gameBoards, gameStatus, undoLength } from '$lib/tools/tic-tac-toe/game';
	import {
		PLAYER_INFO,
		PLAYER_KINDS,
		computerMove,
		type PlayerKind,
		type Players
	} from '$lib/tools/tic-tac-toe/players';
	import {
		TIC_TAC_TOE_PRESETS,
		matchPreset,
		type TicTacToeScenario
	} from '$lib/tools/tic-tac-toe/presets';
	import {
		completeTicTacToeState,
		defaultTicTacToeState,
		isSavedTicTacToeState,
		type SavedTicTacToeState,
		type TicTacToeState
	} from '$lib/tools/tic-tac-toe/state';
	import { treeLayout } from '$lib/tools/tic-tac-toe/tree';
	import { syncToHash } from '$lib/url-state';

	// ------------------------------------------------------------------
	// Editable state (mirrored in the URL hash)
	// ------------------------------------------------------------------

	let cfg = $state<TicTacToeState>(defaultTicTacToeState());
	/** Computer players move on their own (after a move, New game, or Computer move). */
	let auto = $state(false);
	let editing = $state(false);
	/** The board being set up (possibly impossible) and its text. */
	let draft = $state<string>(EMPTY_BOARD);
	let draftText = $state(formatBoard(EMPTY_BOARD));
	let announcement = $state('');
	let lastComputer = $state<string | null>(null);
	let reducedMotion = $state(false);

	syncToHash<SavedTicTacToeState>(() => $state.snapshot(cfg), {
		validate: isSavedTicTacToeState,
		onLoad(saved) {
			Object.assign(cfg, completeTicTacToeState(saved));
			auto = false;
			editing = false;
			lastComputer = null;
		}
	});

	onMount(() => {
		const query = matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = query.matches;
		const change = () => (reducedMotion = query.matches);
		query.addEventListener('change', change);
		return () => query.removeEventListener('change', change);
	});

	// ------------------------------------------------------------------
	// The game
	// ------------------------------------------------------------------

	const squares = $derived([...cfg.moves].map((c) => Number(c) - 1));
	const boards = $derived(gameBoards(cfg.board, squares));
	const position = $derived(boards[boards.length - 1]);
	const status = $derived(gameStatus(position));
	const players = $derived<Players>({ X: cfg.x, O: cfg.o });
	const mover = $derived<Mark | null>(status.kind === 'playing' ? status.mark : null);
	const moverKind = $derived<PlayerKind | null>(mover ? players[mover] : null);
	const humanTurn = $derived(moverKind === 'human' && !editing);
	const weights = $derived<Weights>([
		cfg.weights[0],
		cfg.weights[1],
		cfg.weights[2],
		cfg.weights[3]
	]);
	const settings = $derived({ depth: cfg.depth, weights });
	const lastMove = $derived(squares.length ? squares[squares.length - 1] : null);
	const presetId = $derived(matchPreset(cfg)?.id ?? null);

	const full = $derived(minimax(position));
	const annotations = $derived(moveAnnotations(position, cfg.values, settings));

	function play(square: number, how: 'human' | 'computer' = 'human') {
		if (status.kind !== 'playing' || position[square] !== '.') return;
		if (how === 'human' && !humanTurn) return;
		const before = position;
		cfg.moves += String(square + 1);
		cfg.expand = 0;
		auto = true;
		if (how === 'human') lastComputer = null;
		announcement = announceMove(before, square, gameStatus(boards[boards.length - 1]));
	}

	function playComputer() {
		if (status.kind !== 'playing' || editing || !mover) return;
		const move = computerMove(position, players[mover], settings);
		if (!move) return;
		const summary = computerSummary(mover, move);
		play(move.square, 'computer');
		lastComputer = summary;
		announcement = `${summary} ${resultSentence(status)}`;
	}

	// Computer players move after a short delay (shorter with reduced motion).
	$effect(() => {
		if (!auto || editing || status.kind !== 'playing' || moverKind === 'human') return;
		const at = position;
		const timer = setTimeout(
			() => {
				if (position === at) playComputer();
			},
			reducedMotion ? 60 : 550
		);
		return () => clearTimeout(timer);
	});

	function undo() {
		const n = undoLength(boards, players);
		cfg.moves = cfg.moves.slice(0, n);
		cfg.expand = 0;
		auto = false;
		lastComputer = null;
		announcement = `Undone. ${speakBoard(boards[n])}. ${resultSentence(gameStatus(boards[n]))}`;
	}

	function jump(n: number) {
		if (n === squares.length) return;
		cfg.moves = cfg.moves.slice(0, n);
		cfg.expand = 0;
		auto = false;
		lastComputer = null;
		announcement = `Back to move ${n}. ${resultSentence(gameStatus(boards[n]))}`;
	}

	function newGame() {
		editing = false;
		cfg.board = EMPTY_BOARD;
		cfg.moves = '';
		cfg.expand = 0;
		lastComputer = null;
		auto = true;
		announcement = `New game. ${resultSentence(gameStatus(EMPTY_BOARD))}`;
	}

	function loadPreset(preset: Preset<TicTacToeScenario>) {
		const v = preset.value;
		editing = false;
		auto = false;
		lastComputer = null;
		cfg.board = v.board;
		cfg.moves = '';
		cfg.expand = 0;
		if (v.x) cfg.x = v.x;
		if (v.o) cfg.o = v.o;
		if (v.depth) cfg.depth = v.depth;
		if (v.values) cfg.values = v.values;
		announcement = `Loaded ${preset.label}. ${resultSentence(gameStatus(v.board))}`;
	}

	// ------------------------------------------------------------------
	// Setting up a position
	// ------------------------------------------------------------------

	const draftRead = $derived(readBoardText(draftText));
	const draftDiagnostics = $derived(
		draftRead.cells === null ? draftRead.diagnostics : boardDiagnostics(draftRead.cells)
	);

	function startEditing() {
		auto = false;
		draft = position;
		draftText = formatBoard(position);
		editing = true;
		announcement = 'Setting up a position. Click squares or type the board, then choose Done.';
	}

	function editSquare(square: number, mark: 'X' | 'O' | '.') {
		draft = draft.slice(0, square) + mark + draft.slice(square + 1);
		draftText = formatBoard(draft);
		const problems = boardDiagnostics(draft);
		announcement = `${squareTitle(square)}: ${mark === '.' ? 'empty' : mark}.${problems.length ? ` ${problems[0].message}` : ''}`;
	}

	function clearDraft() {
		draft = EMPTY_BOARD;
		draftText = formatBoard(EMPTY_BOARD);
		announcement = 'Board cleared.';
	}

	function onDraftInput() {
		if (draftRead.cells) draft = draftRead.cells;
	}

	function finishEditing() {
		if (draftDiagnostics.length || !draftRead.cells) return;
		cfg.board = draftRead.cells;
		cfg.moves = '';
		cfg.expand = 0;
		editing = false;
		lastComputer = null;
		announcement = `Position set. ${resultSentence(gameStatus(cfg.board))}`;
	}

	function cancelEditing() {
		editing = false;
		announcement = 'Setup cancelled.';
	}

	// ------------------------------------------------------------------
	// Views
	// ------------------------------------------------------------------

	const playerOptions = PLAYER_KINDS.map((k) => ({ value: k, label: PLAYER_INFO[k].label }));
	const valueOptions: { value: ValueMode; label: string }[] = [
		{ value: 'minimax', label: 'Minimax' },
		{ value: 'depth', label: 'Depth-limited' },
		{ value: 'off', label: 'Off' }
	];

	const layout = $derived(
		treeLayout(position, {
			levels: cfg.levels,
			expand: cfg.expand > 0 ? cfg.expand - 1 : null
		})
	);
	const expandOptions = $derived(
		legalMoves(position).map((s) => ({ value: s + 1, label: squareTitle(s) }))
	);

	const stats = $derived(searchStats(position));
	const emptyStats = emptyBoardStats();
	const totals = gameTree(EMPTY_BOARD);
	const distinct = reachablePositions(EMPTY_BOARD);

	const featureValues = $derived(features(position));
	const evalValue = $derived(evaluate(position, weights));
	const report = $derived(cutoffReport(position, cfg.depth, weights));
	const weightsChanged = $derived(weights.some((w, i) => w !== DEFAULT_WEIGHTS[i]));

	function setWeight(i: number, value: number) {
		cfg.weights[i] = value;
	}

	function resetWeights() {
		cfg.weights = [...DEFAULT_WEIGHTS] as TicTacToeState['weights'];
	}

	const boardLabel = $derived(
		editing
			? `Board being set up. ${speakBoard(draft)}`
			: `Tic-tac-toe board, ${statusHeadline(status)}. ${speakBoard(position)}`
	);
	const treeLabel = $derived(
		`Game tree below the current position: ${layout.nodes.length - 1} boards below it.`
	);
	const helpId = 'ttt-board-help';
</script>

<ToolPage {tool}>
	{#snippet actions()}
		<PresetMenu
			presets={TIC_TAC_TOE_PRESETS}
			selected={presetId}
			onselect={loadPreset}
			align="end"
		/>
	{/snippet}

	<div class="top">
		<Panel title="Game">
			{#snippet actions()}
				<Button size="sm" variant="ghost" disabled={editing || squares.length === 0} onclick={undo}>
					{#snippet icon()}<Icon name="undo" />{/snippet}
					Undo
				</Button>
				<Button size="sm" variant="ghost" onclick={newGame}>
					{#snippet icon()}<Icon name="reset" />{/snippet}
					New game
				</Button>
				<Button size="sm" variant="ghost" disabled={editing} onclick={startEditing}>
					{#snippet icon()}<Icon name="pencil" />{/snippet}
					Set up
				</Button>
			{/snippet}

			<div class="players">
				<Select
					label="X (MAX)"
					size="sm"
					options={playerOptions}
					value={cfg.x}
					onchange={(v: PlayerKind) => (cfg.x = v)}
				/>
				<Select
					label="O (MIN)"
					size="sm"
					options={playerOptions}
					value={cfg.o}
					onchange={(v: PlayerKind) => (cfg.o = v)}
				/>
			</div>

			<div class="game">
				<div class="board-col">
					<GameBoard
						board={editing ? draft : position}
						values={editing ? [] : annotations.values}
						valueMode={cfg.values === 'depth' ? 'depth' : 'minimax'}
						best={editing || !cfg.best || annotations.allBest ? [] : annotations.best}
						winning={status.kind === 'won' && !editing ? status.squares : []}
						winner={status.kind === 'won' ? status.mark : null}
						last={editing ? null : lastMove}
						playable={humanTurn}
						{editing}
						onplay={(s) => play(s)}
						onedit={editSquare}
						label={boardLabel}
						describedBy={helpId}
					/>
					<p class="help" id={helpId}>
						{#if editing}
							Click a square to cycle empty, X, O. On the focused board, <Kbd>X</Kbd>, <Kbd>O</Kbd>
							and <Kbd>.</Kbd> set a square; arrow keys move.
						{:else}
							Squares 1–9 row by row. Click a square, or move with the arrow keys and press
							<Kbd>Enter</Kbd>.
						{/if}
					</p>
				</div>

				<div class="side">
					{#if editing}
						<div class="edit">
							<TextField
								label="Position"
								mono
								bind:value={draftText}
								oninput={onDraftInput}
								spellcheck="false"
								description="Row by row: X, O, or . for an empty square."
							/>
							{#if draftDiagnostics.length}
								<ul class="problems" aria-live="polite">
									{#each draftDiagnostics as d, i (i)}
										<li><Icon name="error" size={14} /> {d.message}</li>
									{/each}
								</ul>
							{:else}
								<p class="ok" aria-live="polite">
									<Icon name="success" size={14} />
									{toMove(draft)} to move.
								</p>
							{/if}
							<div class="edit-buttons">
								<Button
									size="sm"
									variant="primary"
									disabled={draftDiagnostics.length > 0}
									onclick={finishEditing}
								>
									{#snippet icon()}<Icon name="check" />{/snippet}
									Done
								</Button>
								<Button size="sm" onclick={clearDraft}>Clear</Button>
								<Button size="sm" variant="ghost" onclick={cancelEditing}>Cancel</Button>
							</div>
						</div>
					{:else}
						<div class="status">
							<Badge
								tone={status.kind === 'won'
									? status.mark === 'X'
										? 0
										: 2
									: status.kind === 'draw'
										? 'muted'
										: 'info'}
								variant="soft"
							>
								{statusHeadline(status)}
							</Badge>
							<span class="status-text">
								{#if status.kind === 'playing'}
									{status.mark === 'X' ? 'MAX' : 'MIN'} · {PLAYER_INFO[moverKind ?? 'human'].label}
								{:else}
									{resultSentence(status).replace(/^[^:]*: /, '')}
								{/if}
							</span>
						</div>
						<p class="value-line">
							{#if status.kind === 'playing'}
								{valueSentence(full.value)}
							{:else}
								Utility for MAX: {formatValue(full.value)}.
							{/if}
						</p>

						{#if moverKind && moverKind !== 'human'}
							<div class="turn">
								{#if auto}
									<span class="turn-text">{mover} is moving ({PLAYER_INFO[moverKind].phrase})…</span
									>
									<Button size="sm" onclick={() => (auto = false)}>
										{#snippet icon()}<Icon name="pause" />{/snippet}
										Pause
									</Button>
								{:else}
									<span class="turn-text"
										>{mover} is played by {PLAYER_INFO[moverKind].phrase}{moverKind === 'depth'
											? `, cutoff ${cfg.depth}`
											: ''}.</span
									>
									<Button size="sm" variant="primary" onclick={playComputer}>
										{#snippet icon()}<Icon name="play" />{/snippet}
										Computer move
									</Button>
								{/if}
							</div>
						{/if}
						{#if lastComputer}
							<p class="last">{lastComputer}</p>
						{/if}

						<div class="analysis">
							<SegmentedControl
								label="Values on empty squares"
								showLabel
								size="sm"
								options={valueOptions}
								value={cfg.values}
								onchange={(v) => (cfg.values = v)}
							/>
							<Toggle bind:checked={cfg.best} label="Highlight best moves" />
							<p class="note">
								{#if cfg.best && annotations.allBest && annotations.search && annotations.search.moves.length > 1}
									Every move has the same value, so none is marked best.
								{/if}
								{#if cfg.values === 'depth'}
									Depth-limited values: Eval(s) at cutoff depth {cfg.depth}, backed up with minimax;
									±{WIN_SCORE} is a win found before the cutoff.
								{:else}
									Values are for MAX (X): +1 X wins, 0 draw, −1 O wins, with perfect play by both
									sides. X picks the largest value, O the smallest; ties go to the first square.
								{/if}
							</p>
						</div>

						{#if squares.length}
							<div class="moves-wrap">
								<span class="moves-label" id="moves-label">Moves</span>
								<ol class="moves" aria-labelledby="moves-label">
									<li>
										<button
											type="button"
											class="chip"
											onclick={() => jump(0)}
											title="Starting position">Start</button
										>
									</li>
									{#each squares as s, k (k)}
										{@const mark = toMove(boards[k])}
										<li>
											<button
												type="button"
												class={[
													'chip',
													mark === 'X' ? 'cx' : 'co',
													{ current: k === squares.length - 1 }
												]}
												aria-label="Move {k + 1}: {mark} on {squareLabel(s)}"
												aria-current={k === squares.length - 1 ? 'step' : undefined}
												onclick={() => jump(k + 1)}>{mark} {s + 1}</button
											>
										</li>
									{/each}
								</ol>
							</div>
						{/if}
					{/if}
				</div>
			</div>
			<div class="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</div>

			{#snippet footer()}
				<p class="foot">
					X is MAX and moves first; O is MIN. Terminal utilities for MAX: +1 when X wins, 0 for a
					draw, −1 when O wins. <CitationTag cite={{ deck: 'adversarial', slide: 6 }} />
				</p>
			{/snippet}
		</Panel>

		<Panel title="Game tree" subtitle="below the current position">
			{#snippet actions()}
				<SegmentedControl
					label="Levels shown"
					size="sm"
					options={[
						{ value: 1, label: '1 level' },
						{ value: 2, label: '2 levels' }
					]}
					value={cfg.levels}
					onchange={(v) => (cfg.levels = v)}
				/>
			{/snippet}
			{#if cfg.levels === 2 && expandOptions.length}
				<div class="expand">
					<Select
						label="Children of"
						inline
						size="sm"
						options={expandOptions}
						value={(layout.expanded ?? 0) + 1}
						onchange={(v: number) => (cfg.expand = v)}
					/>
				</div>
			{/if}
			<GameTree {layout} playable={humanTurn} onplay={(s) => play(s)} label={treeLabel} />
			<p class="note tree-note">
				Each board shows its minimax value, backed up from the terminal states: MAX takes the
				largest child value, MIN the smallest. Heavier edges and frames mark the best children; the
				shaded square is the move just played.
				{#if humanTurn}Click a child board to play its move.{/if}
				<CitationTag cite={{ deck: 'adversarial', slide: [10, 11] }} />
			</p>
		</Panel>
	</div>

	<div class="lower">
		<Panel title="Search statistics" subtitle="nodes visited">
			<SearchStats current={stats} empty={emptyStats} same={position === EMPTY_BOARD} />
			<div class="notes">
				<div class="notebox">
					<h3>Move ordering</h3>
					<p>
						Pruning does not affect the final result; the amount of pruning depends on move
						ordering. With perfect ordering the time to find the best move drops from O(b<sup>m</sup
						>) to O(b<sup>m/2</sup>): search depth is effectively doubled.
					</p>
					<CitationTag cite={{ deck: 'adversarial', slide: 23 }} />
				</div>
				<div class="notebox">
					<h3>The whole game</h3>
					<p>
						From the empty board the game tree has {formatCount(totals.nodes)} nodes and {formatCount(
							totals.terminals
						)} complete games ({formatCount(totals.xWins)} won by X, {formatCount(totals.oWins)} by O,
						{formatCount(totals.draws)} drawn), but only {formatCount(distinct.positions)} distinct positions.
						A transposition table stores each once.
					</p>
					<CitationTag cite={{ deck: 'adversarial', slide: 26 }} />
				</div>
			</div>
			{#snippet footer()}
				<p class="foot">
					Nodes visited counts every call of Max-Value and Min-Value, the root included. A cutoff is
					a return at v ≥ β (MAX) or v ≤ α (MIN) that leaves children unsearched. Center, corners,
					edges tries square 5, then 1, 3, 7, 9, then 2, 4, 6, 8; best move first sorts children by
					their minimax value. <CitationTag cite={{ deck: 'adversarial', slide: [21, 22] }} />
				</p>
			{/snippet}
		</Panel>

		<Panel title="Evaluation function">
			{#snippet actions()}
				<Button size="sm" variant="ghost" disabled={!weightsChanged} onclick={resetWeights}>
					{#snippet icon()}<Icon name="reset" />{/snippet}
					Reset weights
				</Button>
			{/snippet}
			<p class="formula">
				<span>Eval(s) = w₁ X₂(s) + w₂ X₁(s) + w₃ O₂(s) + w₄ O₁(s)</span>
				<CitationTag cite={{ deck: 'adversarial', slide: 24 }} />
			</p>
			<div class="features" role="group" aria-label="Features and weights">
				{#each FEATURES as f, i (f.id)}
					<div class="feature">
						<div class="fname">
							<span class="sym">{f.symbol}</span>
							<span class="fdesc">{f.description}</span>
						</div>
						<div class="fval">
							<span class="muted">=</span>
							<span class="mono">{featureValues[i]}</span>
						</div>
						<NumberField
							label="w{i + 1}"
							inline
							size="sm"
							value={cfg.weights[i]}
							min={-MAX_WEIGHT}
							max={MAX_WEIGHT}
							onchange={(v) => setWeight(i, v)}
						/>
					</div>
				{/each}
			</div>
			<p class="eval-line">
				{#if status.kind === 'playing'}
					Eval of the current position: <strong class="mono">{formatValue(evalValue)}</strong>
				{:else}
					The game is over: search scores this position with its utility, not Eval.
				{/if}
			</p>

			<div class="cutoff-row">
				<NumberField
					label="Cutoff depth"
					inline
					size="sm"
					value={cfg.depth}
					min={MIN_DEPTH}
					max={MAX_DEPTH}
					suffix="plies"
					onchange={(v) => (cfg.depth = v)}
				/>
			</div>

			{#if report && mover}
				<table class="cutoff">
					<caption class="visually-hidden"
						>Depth-limited values and minimax values of each move</caption
					>
					<thead>
						<tr>
							<th scope="col">Move</th>
							<th scope="col" class="num">Cutoff {cfg.depth}</th>
							<th scope="col" class="num">Minimax</th>
						</tr>
					</thead>
					<tbody>
						{#each report.rows as row (row.square)}
							<tr class={{ chosen: row.square === report.chosen }}>
								<th scope="row">
									{squareTitle(row.square)}
									{#if row.square === report.chosen}<Badge tone="accent">returned</Badge>{/if}
								</th>
								<td class="num mono"
									>{formatValue(row.limited)}{#if cutoffWord(row.limited)}&nbsp;<span class="muted"
											>({cutoffWord(row.limited)})</span
										>{/if}</td
								>
								<td class="num mono"
									>{formatValue(row.exact)}
									<span class="muted">({outcomeWord(row.exact)})</span></td
								>
							</tr>
						{/each}
					</tbody>
				</table>
				<p class="note">
					Depth-limited search visits {formatCount(report.search.counts.nodes)} nodes and scores {formatCount(
						report.search.counts.evaluations
					)} of them with Eval; with alpha-beta pruning, {formatCount(report.pruned.counts.nodes)} nodes.
					{#if report.complete}The cutoff covers the rest of the game, so no state is scored with
						Eval.{/if}
				</p>
				{#if report.worse}
					<Callout tone="warn" title="Horizon effect">
						Depth-limited search returns {squareLabel(report.chosen)}, whose minimax value is {formatValue(
							report.chosenValue
						)} ({outcomeWord(report.chosenValue)}); the position’s minimax value is {formatValue(
							report.value
						)} ({outcomeWord(report.value)}). Wins and losses within the cutoff are scored exactly,
						so what decides this lies beyond cutoff depth {cfg.depth}.
					</Callout>
				{/if}
			{:else}
				<p class="note">The game is over; there is nothing to search.</p>
			{/if}

			<div class="notes">
				<div class="notebox">
					<h3>Cutting off search</h3>
					<p>
						Horizon effect: a state may be misjudged because of an event just beyond the depth
						limit, such as a damaging move by the opponent that can be delayed but not avoided.
						Remedies: <strong>quiescence search</strong> does not cut off search at unstable
						positions; a <strong>singular extension</strong> is a strong move that is still tried when
						the normal depth limit is reached.
					</p>
					<CitationTag cite={{ deck: 'adversarial', slide: 25 }} />
				</div>
				<div class="notebox">
					<h3>Weights</h3>
					<p>
						In chess, a weight may be a piece’s material value (pawn 1, knight 3, rook 5, queen 9)
						and its feature the advantage in that piece. Weights can come from game databases or
						from the program playing many games against itself. Here a win scores ±{WIN_SCORE}: each
						line counts toward at most one feature, so |Eval| ≤ 8 × {MAX_WEIGHT} and a win always outranks
						an evaluation.
					</p>
					<CitationTag cite={{ deck: 'adversarial', slide: 24 }} />
				</div>
			</div>
		</Panel>
	</div>

	<Panel title="Games and adversarial search">
		<div class="reference">
			<section class="ref-block" aria-labelledby="ref-types">
				<h3 id="ref-types">Types of game environments</h3>
				<table class="types">
					<thead>
						<tr>
							<td></td>
							{#each GAME_TYPES.columns as col (col)}
								<th scope="col">{col}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each GAME_TYPES.rows as row (row.label)}
							<tr>
								<th scope="row">{row.label}<span class="sys-detail">{row.detail}</span></th>
								{#each row.cells as cell, i (i)}
									<td>{cell}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
				<p class="note">Tic-tac-toe: deterministic, perfect information.</p>
				<CitationTag cite={GAME_TYPES.cite} />
			</section>
			{#each GAME_NOTES as note (note.id)}
				<section class="ref-block" aria-labelledby="ref-{note.id}">
					<h3 id="ref-{note.id}">{note.title}</h3>
					<ul>
						{#each note.points as point, i (i)}
							<li>{point}</li>
						{/each}
					</ul>
					<CitationTag cite={note.cite} />
				</section>
			{/each}
			<section class="ref-block chess" aria-labelledby="ref-chess">
				<h3 id="ref-chess">Chess playing systems</h3>
				<table class="systems">
					<thead>
						<tr>
							<th scope="col">System</th>
							<th scope="col" class="num">Depth</th>
							<th scope="col">Strength</th>
						</tr>
					</thead>
					<tbody>
						{#each CHESS_SYSTEMS as s (s.system)}
							<tr>
								<th scope="row">
									{s.system}
									<span class="sys-detail">{s.details}</span>
								</th>
								<td class="num">{s.ply}-ply</td>
								<td>≈ {s.strength}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<CitationTag cite={CHESS_CITE} />
			</section>
		</div>
	</Panel>
</ToolPage>

<style>
	.top,
	.lower {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
	}
	@media (min-width: 1100px) {
		.top {
			grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
			align-items: start;
		}
		.lower {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}
	}
	.players {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 12rem));
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}
	.game {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: var(--space-4) var(--space-5);
	}
	.board-col {
		display: flex;
		flex: none;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		max-width: 100%;
	}
	@media (max-width: 560px) {
		.board-col {
			flex: 1 1 100%;
		}
	}
	.help {
		max-width: 18rem;
		margin: 0;
		color: var(--text-3);
		font-size: var(--text-xs);
		line-height: 1.7;
		text-align: center;
	}
	.side {
		display: flex;
		flex: 1 1 14rem;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}
	.status {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
	.status :global(.badge) {
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.status-text {
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.value-line {
		margin: 0;
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.turn {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.turn-text {
		font-size: var(--text-sm);
	}
	.last {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.analysis {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border);
	}
	.note {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.tree-note {
		margin-top: var(--space-3);
	}
	.moves-wrap {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.moves-label {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.moves {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.chip {
		min-width: 32px;
		height: 28px;
		padding: 0 7px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text-2);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		cursor: pointer;
	}
	.chip:hover {
		border-color: var(--accent);
	}
	.chip.cx {
		color: var(--tok-0);
	}
	.chip.co {
		color: var(--tok-2);
	}
	.chip.current {
		border-color: var(--active);
		background: var(--active-soft);
		font-weight: 700;
	}
	.edit {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.problems {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		color: var(--reject);
		font-size: var(--text-sm);
		list-style: none;
	}
	.problems li,
	.ok {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		line-height: 1.45;
	}
	.problems :global(svg),
	.ok :global(svg) {
		flex: none;
		margin-top: 2px;
	}
	.ok {
		margin: 0;
		color: var(--accept);
		font-size: var(--text-sm);
	}
	.edit-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.foot {
		margin: 0;
		line-height: 1.6;
	}
	.expand {
		margin-bottom: var(--space-3);
	}

	.notes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
	.notebox {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
		padding: var(--space-3);
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.notebox h3,
	.ref-block h3 {
		margin: 0;
		font-size: var(--text-base);
	}
	.notebox p {
		margin: 0;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}

	.formula {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin: 0 0 var(--space-3);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-style: italic;
	}
	.features {
		display: flex;
		flex-direction: column;
	}
	.feature {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--border);
	}
	.fname {
		display: flex;
		flex: 1 1 12rem;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 var(--space-2);
		min-width: 0;
	}
	.sym {
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-style: italic;
		font-weight: 600;
	}
	.fdesc {
		color: var(--text-2);
		font-size: var(--text-sm);
	}
	.fval {
		min-width: 2.5rem;
		font-variant-numeric: tabular-nums;
	}
	.eval-line {
		margin: var(--space-3) 0;
		font-size: var(--text-sm);
	}
	.cutoff-row {
		margin-bottom: var(--space-3);
	}
	.cutoff {
		width: 100%;
		margin-bottom: var(--space-3);
		font-size: var(--text-sm);
	}
	.cutoff th,
	.cutoff td {
		padding: var(--space-1) var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
	}
	.cutoff th:first-child {
		padding-left: 0;
	}
	.cutoff thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.cutoff tbody th {
		font-weight: 500;
	}
	.cutoff tr.chosen {
		background: var(--accent-soft);
	}
	.num {
		text-align: right !important;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.muted {
		color: var(--text-3);
	}
	sup {
		font-size: 0.7em;
	}

	.reference {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
		gap: var(--space-4) var(--space-5);
	}
	.ref-block {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-2);
		min-width: 0;
	}
	.ref-block ul {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin: 0;
		padding-left: 1.1rem;
		color: var(--text-2);
		font-size: var(--text-sm);
		line-height: 1.55;
	}
	.types,
	.systems {
		width: 100%;
		font-size: var(--text-sm);
	}
	.types {
		table-layout: fixed;
		overflow-wrap: break-word;
	}
	.types thead td {
		width: 30%;
	}
	.types th,
	.types td,
	.systems th,
	.systems td {
		padding: var(--space-1) var(--space-2);
		border-bottom: 1px solid var(--border);
		text-align: left;
		vertical-align: top;
	}
	.types th:first-child,
	.systems th:first-child {
		padding-left: 0;
	}
	.types thead th,
	.systems thead th {
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.types tbody th,
	.systems tbody th {
		font-weight: 500;
	}
	.chess {
		grid-column: 1 / -1;
	}
	.sys-detail {
		display: block;
		color: var(--text-3);
		font-size: var(--text-xs);
		font-weight: 400;
		line-height: 1.45;
	}
</style>
