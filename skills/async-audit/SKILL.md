---
name: async-audit
description: Audit async code for correctness, performance, and safety across Rust (Tokio), Dart/Flutter, Python (asyncio/Celery), Go (goroutines), and TypeScript (Deno/Node). Use when writing, reviewing, or debugging async code, or when user mentions race conditions, deadlocks, cancellation, or async patterns.
---

# Async Audit Skill

Audit asynchronous code for race conditions, deadlocks, resource leaks, cancellation safety, blocking violations, and design anti-patterns. Works across all supported stacks with language-specific knowledge.

**Skill Type: Flexible** — Adapt checks to the specific async runtime and patterns in use.

## When to Use

- Writing new async code (review before merge)
- Debugging async bugs (race conditions, hangs, resource leaks)
- Reviewing PRs that touch concurrent code paths
- Designing async architectures (channel topologies, task hierarchies, shutdown flows)

## Process

### 1. Identify the Async Runtime

Detect from the codebase which async model is in use:

| Stack | Runtime | Key primitives |
|-------|---------|----------------|
| Rust | Tokio | `async/await`, `tokio::spawn`, `select!`, `mpsc`/`oneshot`/`broadcast`, `Mutex`/`RwLock`, `JoinHandle`, `CancellationToken` |
| Dart/Flutter | Dart event loop | `async/await`, `Future`, `Stream`, `Isolate`, `StreamController`, `Completer`, `Zone` |
| Python | asyncio / Celery | `async/await`, `asyncio.gather`, `Task`, `Queue`, `Lock`, Celery tasks with `@shared_task` |
| Go | goroutines | `go func()`, channels, `sync.Mutex`, `sync.WaitGroup`, `context.Context`, `errgroup` |
| TypeScript | Deno / Node event loop | `async/await`, `Promise.all`, `Promise.race`, `AbortController`, Web Workers |

### 2. Run the Audit Checklist

For each async code path under review, check all applicable items. Flag violations with severity.

#### Universal checks (all stacks)

- [ ] **No blocking in async context.** Synchronous I/O, CPU-heavy computation, or sleep calls inside an async function block the event loop / runtime thread, starving other tasks. Severity: error.
- [ ] **No unbounded channels or queues.** Unbounded channels grow without backpressure, leading to OOM under load. Severity: error.
- [ ] **No fire-and-forget spawns without error handling.** Spawned tasks that panic or error silently lose the error. Every spawn must have its result awaited or its error logged. Severity: error.
- [ ] **No missing timeouts on external calls.** Network requests, database queries, and IPC calls without timeouts hang indefinitely. Severity: error.
- [ ] **Resource cleanup on all exit paths.** Files, connections, locks, and subscriptions must be released on success, error, AND cancellation. Severity: error.
- [ ] **Shared mutable state is synchronized.** Concurrent access to mutable state without a lock, channel, or atomic is a data race. Severity: error.
- [ ] **Cancellation is handled gracefully.** When a task is cancelled, it must not leave state half-modified. Check that cancellation points (await expressions) don't interrupt multi-step mutations. Severity: warning.
- [ ] **Error propagation is explicit.** Errors from async operations must be propagated or explicitly handled — not swallowed with empty catch blocks. Severity: warning.

#### Rust / Tokio specific

- [ ] **No holding `Mutex` across `.await`.** A `std::sync::Mutex` held across an await point blocks the runtime thread. Use `tokio::sync::Mutex` if the lock must span awaits, or restructure to release before awaiting. Severity: error.
- [ ] **No `block_on` inside async context.** `tokio::runtime::Runtime::block_on` inside an already-running Tokio runtime panics or deadlocks. Use `spawn_blocking` for sync-in-async bridges. Severity: error.
- [ ] **`select!` branches are cancellation-safe.** When `select!` drops a branch's future, any partial work in that branch is lost. Operations that are NOT cancellation-safe (partial reads from `AsyncRead`, multi-step state mutations) must not appear as bare `select!` branches. Use `tokio::pin!` + loop or `CancellationToken` instead. Severity: error.
- [ ] **`spawn_blocking` for CPU-heavy or legacy sync code.** File I/O (even with `tokio::fs`), DNS resolution, crypto operations, and any computation over ~10μs should use `spawn_blocking` to avoid starving the async runtime. Severity: warning.
- [ ] **Graceful shutdown via `CancellationToken` or signal handler.** Long-running services need a clean shutdown path: `tokio::signal::ctrl_c()` or `CancellationToken` propagated to all spawned tasks. Tasks must check for cancellation and drain in-flight work. Severity: warning.
- [ ] **`JoinHandle` results are awaited.** Dropping a `JoinHandle` without awaiting detaches the task — errors and panics are silently lost. Severity: warning.
- [ ] **Channel senders are dropped to signal completion.** An `mpsc::Sender` that is never dropped causes the receiver to hang on `recv().await` forever. Ensure all sender clones are dropped when work is done. Severity: warning.
- [ ] **`biased` in `select!` is intentional.** `select!` with `biased;` polls branches in declaration order, which can starve later branches under load. Only use when polling order matters (e.g., shutdown signal before data processing). Severity: suggestion.
- [ ] **No `unwrap()` on channel operations in production paths.** Channel `send` can fail if the receiver is dropped. Use `if let Err(e) = tx.send(...)` or propagate the error. Severity: warning.

#### Dart / Flutter specific

- [ ] **No unawaited Futures.** A `Future` that is not `await`ed, stored, or explicitly `.ignore()`d loses its error — it becomes an unhandled exception in the Zone. Use `unawaited()` from `dart:async` when intentionally fire-and-forget. Severity: error.
- [ ] **StreamSubscription is cancelled on dispose.** Every `stream.listen()` call returns a `StreamSubscription` that MUST be cancelled in the widget's `dispose()` or the BLoC's `close()`. Leaked subscriptions cause memory leaks and stale callbacks. Severity: error.
- [ ] **StreamController is closed.** An unclosed `StreamController` leaks memory and can cause "Stream has already been listened to" errors. Close in `dispose()` or `close()`. Severity: error.
- [ ] **Avoid Completer when async/await suffices.** `Completer` is error-prone (forgetting to complete, double-complete). Prefer `async/await` or `Future.then()`. Use `Completer` only when bridging callback-based APIs. Severity: warning.
- [ ] **Isolate communication uses SendPort correctly.** Isolates share no mutable state. Data passed to/from isolates must be serializable. Large messages cause jank — prefer small, frequent messages over large batches. Severity: warning.
- [ ] **No setState after dispose.** Calling `setState` on a disposed widget throws. Guard with `if (mounted)` or use a lifecycle-aware pattern. Severity: error.
- [ ] **Zone error handling for fire-and-forget.** If a Future is intentionally not awaited, wrap the call site in a Zone with an error handler to catch uncaught async errors. Severity: warning.
- [ ] **async* generators yield responsively.** An `async*` function that yields in a tight loop without `await Future.delayed(Duration.zero)` can block the UI thread. Yield with a microtask break for long sequences. Severity: warning.

#### Python / asyncio specific

- [ ] **No synchronous I/O in async functions.** `requests.get()`, `open().read()`, `time.sleep()` inside an `async def` blocks the event loop. Use `aiohttp`, `aiofiles`, `asyncio.sleep()`. Severity: error.
- [ ] **Celery tasks are idempotent.** Tasks that can be retried must produce the same result on re-execution. Check for side effects that aren't safe to repeat (duplicate emails, double charges). Severity: error.
- [ ] **`asyncio.gather` has return_exceptions=True when appropriate.** Without it, one failed task cancels the gather and exceptions from other tasks are lost. Severity: warning.
- [ ] **Task references are held.** `asyncio.create_task()` returns a Task that can be garbage-collected if no reference is held, silently cancelling it. Store the reference. Severity: warning.

#### Go specific

- [ ] **Goroutine leaks.** A goroutine blocked on a channel read/write that will never complete leaks forever. Every goroutine must have a termination path, usually via `context.Context` cancellation. Severity: error.
- [ ] **`context.Context` is propagated.** Every function that does I/O or spawns work should accept a `context.Context` as its first parameter. Missing context means no cancellation, no timeout. Severity: warning.
- [ ] **`sync.WaitGroup` Add before Go.** `wg.Add(1)` must happen before the `go` statement, not inside the goroutine. Otherwise the main goroutine may call `wg.Wait()` before `Add` executes. Severity: error.
- [ ] **Channel direction is constrained.** Function parameters should use `chan<-` (send-only) or `<-chan` (receive-only) to prevent accidental bidirectional use. Severity: suggestion.

#### TypeScript / Deno specific

- [ ] **`Promise.all` vs `Promise.allSettled`.** `Promise.all` short-circuits on first rejection, losing results from other promises. Use `allSettled` when all results matter. Severity: warning.
- [ ] **AbortController for cancellation.** Long-running fetch calls and streams should accept an `AbortSignal` for cancellation. Without it, cancelled operations still consume resources. Severity: warning.
- [ ] **No synchronous blocking in event loop.** `fs.readFileSync`, `execSync`, and CPU-heavy synchronous computation blocks the single-threaded event loop. Use async alternatives. Severity: error.

### 3. Report Findings

Use the standard review JSON envelope:

```json
{
  "status": "pass|warn|fail|skip",
  "issues": [
    {
      "severity": "error|warning|suggestion",
      "confidence": "high|medium|none",
      "file": "path/to/file",
      "line": 42,
      "message": "Holding std::sync::Mutex across .await at line 42 — blocks Tokio runtime thread",
      "suggestedFix": "Use tokio::sync::Mutex or restructure to release lock before await"
    }
  ],
  "summary": "Found N async issues: X errors, Y warnings, Z suggestions"
}
```

### 4. Design Guidance (when asked)

When the user asks about async architecture (not just auditing existing code):

#### Channel topology selection
- **One producer, one consumer** → `oneshot` (Rust), `Completer` (Dart), single channel (Go)
- **Many producers, one consumer** → `mpsc` (Rust), `StreamController` (Dart), buffered channel (Go)
- **One producer, many consumers** → `broadcast` (Rust), `StreamController.broadcast()` (Dart), fan-out goroutines (Go)
- **Request-response** → `oneshot` per request embedded in the command (Rust), `Completer` per request (Dart)

#### Graceful shutdown pattern
1. Register signal handler (SIGTERM, SIGINT)
2. Propagate cancellation to all spawned tasks (CancellationToken in Rust, context.Cancel in Go, AbortController in TS)
3. Wait for in-flight work to drain (with timeout)
4. Close channels/streams (senders first, then receivers)
5. Flush pending writes (logs, metrics, database)
6. Exit

#### Backpressure strategies
- **Bounded channels** — producer blocks when buffer full (Rust mpsc, Go buffered channel)
- **Rate limiting** — token bucket or sliding window at the ingress point
- **Load shedding** — drop oldest or reject newest when overloaded
- **Circuit breaker** — stop calling a failing dependency after N failures

## References

- Tokio docs: task spawning, select!, channels, sync primitives, spawn_blocking, cancellation
- Dart docs: async/await, Future, Stream, Isolate, Zone error handling, async* generators
- Go docs: goroutines, channels, context, sync, errgroup
- Python docs: asyncio, Celery task design
