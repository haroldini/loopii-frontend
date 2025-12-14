
<script>
    import { onDestroy, createEventDispatcher } from "svelte";

    // Props
    // - audio: existing audio (string URL OR object { url, duration_seconds, waveform, ... })
    // - maxDuration: seconds; caps recording and playback
    // - recordable: if true, show record/replace controls
    // - disabled: global disable
    export let audio = null;
    export let maxDuration = 30; // seconds
    export let recordable = false;
    export let disabled = false;
    export let previewLabel = "";

    // Reset token to clear local recording
    export let resetToken = 0;
    let lastResetToken = resetToken;

    $: if (resetToken !== lastResetToken) {
        lastResetToken = resetToken;
        clearLocalRecording();
    }

    const dispatch = createEventDispatcher();

    let audioEl;

    // Local URL for newly-recorded audio
    let localUrl = null;

    // Playback state
    let isPlaying = false;
    let duration = 0; // actual media duration (seconds)
    let currentTime = 0; // current playback time (seconds)

    // Recording state
    let isRecording = false;
    let recordSeconds = 0;
    let mediaRecorder = null;
    let recordStream = null;
    let chunks = [];
    let recorderMimeType = null;

    // Errors
    let errorMessage = null;

    // RAF loops for smooth UI updates
    let playbackRaf = null;
    let recordRaf = null;
    let recordStartMs = 0;

    // ----------------------------
    // Audio input normalization
    // ----------------------------

    $: audioUrl =
        typeof audio === "string"
            ? audio
            : audio && typeof audio === "object"
              ? audio.url || null
              : null;

    $: backendDuration =
        audio && typeof audio === "object"
            ? (Number.isFinite(audio.duration_seconds) ? audio.duration_seconds : null)
            : null;

    $: backendWaveform =
        audio && typeof audio === "object" && Array.isArray(audio.waveform)
            ? audio.waveform
            : null;

    $: waveformBins = (() => {
        if (!backendWaveform) return null;
        const out = [];
        for (const v of backendWaveform) {
            if (!Number.isFinite(v)) continue;
            const n = Math.max(0, Math.min(255, Math.round(v)));
            out.push(n);
        }
        return out.length ? out : null;
    })();

    $: showWaveform = !!(!localUrl && waveformBins && waveformBins.length);

    // If we have a backend duration for a remote clip, prefer it.
    $: if (!localUrl && backendDuration && backendDuration > 0) {
        duration = backendDuration;
    }

    function resetPlaybackState() {
        stopPlaybackRaf();

        if (audioEl) {
            try {
                audioEl.pause();
                audioEl.currentTime = 0;
            } catch {
                // ignore
            }
        }

        isPlaying = false;
        currentTime = 0;
        // NOTE: do not blindly zero `duration` here; backendDuration may be providing it
        if (localUrl) duration = 0;
    }

    // Track external audio changes. If parent changes `audio` while we don't
    // have a local recording, reset playback state.
    let lastAudioProp = null;
    $: if (audio !== lastAudioProp) {
        lastAudioProp = audio;
        if (!localUrl) {
            resetPlaybackState();
            errorMessage = null;
        }
    }

    // Effective URL: prefer local recording if present
    $: effectiveUrl = localUrl || audioUrl || null;

    // Effective duration for UI / seeking: prefer backendDuration for remote clips,
    // fall back to media metadata, otherwise fall back to maxDuration.
    $: effectiveDuration = (() => {
        const base =
            (!localUrl && backendDuration && Number.isFinite(backendDuration) && backendDuration > 0)
                ? backendDuration
                : (duration && Number.isFinite(duration) && duration > 0)
                  ? duration
                  : 0;

        if (base > 0) {
            return maxDuration ? Math.min(base, maxDuration) : base;
        }
        if (maxDuration) return maxDuration;
        return 0;
    })();

    // Progress 0–1
    $: progress =
        effectiveDuration > 0 ? Math.min(1, currentTime / effectiveDuration) : 0;

    $: remainingSeconds = (() => {
        if (!effectiveDuration || !Number.isFinite(effectiveDuration)) return 0;
        const remaining = Math.max(0, effectiveDuration - currentTime);
        return Math.ceil(remaining);
    })();

    // ------------- Smooth UI loops -------------

    function startPlaybackRaf() {
        stopPlaybackRaf();

        const tick = () => {
            if (!audioEl || audioEl.paused) {
                playbackRaf = null;
                return;
            }

            currentTime = audioEl.currentTime || 0;
            playbackRaf = requestAnimationFrame(tick);
        };

        playbackRaf = requestAnimationFrame(tick);
    }

    function stopPlaybackRaf() {
        if (playbackRaf) {
            cancelAnimationFrame(playbackRaf);
            playbackRaf = null;
        }
    }

    function startRecordRaf() {
        if (recordRaf) cancelAnimationFrame(recordRaf);

        recordStartMs = performance.now();
        const tick = (now) => {
            if (!isRecording) {
                recordRaf = null;
                return;
            }

            recordSeconds = (now - recordStartMs) / 1000;

            if (maxDuration && recordSeconds >= maxDuration) {
                recordSeconds = maxDuration;
                stopRecording();
                return;
            }

            recordRaf = requestAnimationFrame(tick);
        };

        recordRaf = requestAnimationFrame(tick);
    }

    function stopRecordRaf() {
        if (recordRaf) {
            cancelAnimationFrame(recordRaf);
            recordRaf = null;
        }
    }

    // ------------- Playback -------------

    function forceReset() {
        if (!audioEl) return;

        stopPlaybackRaf();

        audioEl.pause();
        audioEl.currentTime = 0;

        // force browser to acknowledge the seek
        audioEl.src = audioEl.src;
        audioEl.load();

        currentTime = 0;
        isPlaying = false;
    }

    function togglePlay() {
        if (!audioEl || !effectiveUrl || disabled || isRecording) return;

        // PREVIEW MODE (recordable = false)
        if (!recordable) {
            // STOP → reset fully
            if (isPlaying) {
                forceReset();
                return;
            }

            // PLAY → always start from zero
            forceReset();

            audioEl.play().catch((err) => {
                console.error("Audio play failed:", err);
                errorMessage = "Unable to play audio on this device.";
            });

            return;
        }

        // NORMAL MODE (recordable = true)
        if (isPlaying) {
            audioEl.pause();
        } else {
            audioEl.play().catch((err) => {
                console.error("Audio play failed:", err);
                errorMessage = "Unable to play audio on this device.";
            });
        }
    }

    function onAudioPlay() {
        isPlaying = true;
        errorMessage = null;
        startPlaybackRaf();
    }

    function onAudioPause() {
        isPlaying = false;
        stopPlaybackRaf();
    }

    function onLoadedMetadata() {
        if (!audioEl) return;

        // If backend gave us duration for remote, keep that as the UI source of truth.
        if (!localUrl && backendDuration && backendDuration > 0) return;

        const d = audioEl.duration;
        if (Number.isFinite(d) && d > 0) {
            duration = d;
        }
    }

    function onTimeUpdate() {
        if (!audioEl) return;

        // Keep as a fallback; RAF provides smooth updates.
        currentTime = audioEl.currentTime || 0;

        // Capture duration lazily if it becomes available later
        if (!backendDuration && (!duration || !Number.isFinite(duration) || duration === Infinity)) {
            const d = audioEl.duration;
            if (Number.isFinite(d) && d > 0) {
                duration = d;
            }
        }

        if (maxDuration && currentTime >= maxDuration) {
            audioEl.currentTime = maxDuration;
            audioEl.pause();
            currentTime = maxDuration;
        }
    }

    function onEnded() {
        isPlaying = false;
        stopPlaybackRaf();
        currentTime = effectiveDuration || 0;
    }

    function onAudioError() {
        // Covers 404 / decode errors etc.
        errorMessage = "Audio unavailable.";
        resetPlaybackState();
    }

    function seek(event) {
        if (!audioEl || !effectiveUrl || !effectiveDuration || disabled) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        const target = Math.max(
            0,
            Math.min(effectiveDuration, ratio * effectiveDuration),
        );

        audioEl.currentTime = target;
        currentTime = target;
    }

    function handleTrackKeydown(event) {
        // Basic keyboard support: space / enter toggle playback
        if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            togglePlay();
        }
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds)) return "0:00";
        const s = Math.max(0, Math.floor(seconds));
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m}:${r.toString().padStart(2, "0")}`;
    }

    function ampPct(v) {
        // keep a tiny minimum so it doesn't look “empty”
        const p = Math.max(6, Math.min(100, (v / 255) * 100));
        return `${p}%`;
    }

    // ------------- Recording -------------

    function pickRecorderMimeType() {
        if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return null;

        const candidates = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4;codecs=mp4a.40.2",
            "audio/mp4",
            "audio/ogg;codecs=opus",
            "audio/ogg",
        ];

        for (const t of candidates) {
            try {
                if (MediaRecorder.isTypeSupported(t)) return t;
            } catch {
                // ignore
            }
        }
        return null;
    }

    function mimeToExt(mime) {
        const mt = (mime || "").split(";")[0].trim().toLowerCase();
        if (mt === "audio/webm") return "webm";
        if (mt === "audio/ogg") return "ogg";
        if (mt === "audio/mp4") return "mp4";
        if (mt === "audio/mpeg") return "mp3";
        if (mt === "audio/wav" || mt === "audio/x-wav") return "wav";
        return "bin";
    }

    function startRecording() {
        if (disabled || isRecording) return;

        if (
            typeof navigator === "undefined" ||
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {
            errorMessage = "Recording not supported on this device.";
            return;
        }

        errorMessage = null;

        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                recordStream = stream;

                recorderMimeType = pickRecorderMimeType();

                try {
                    // If we can pick a supported type, use it. Otherwise let the browser choose.
                    mediaRecorder = recorderMimeType
                        ? new MediaRecorder(stream, { mimeType: recorderMimeType })
                        : new MediaRecorder(stream);
                } catch (err) {
                    console.error("MediaRecorder init failed:", err);
                    errorMessage = "Unable to start recording.";
                    stopStream();
                    return;
                }

                chunks = [];
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };
                mediaRecorder.onstop = handleRecordStop;

                recordSeconds = 0;
                isRecording = true;

                // Stop playback if it was running
                if (audioEl && !audioEl.paused) {
                    audioEl.pause();
                    isPlaying = false;
                }

                mediaRecorder.start(250); // collect chunks
                startRecordRaf();
            })
            .catch((err) => {
                console.error("getUserMedia failed:", err);
                errorMessage =
                    "We couldn't access your microphone. Check browser permissions.";
            });
    }

    function stopRecording() {
        if (!isRecording) return;

        stopRecordRaf();

        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            try {
                mediaRecorder.stop();
            } catch (err) {
                console.error("mediaRecorder.stop failed:", err);
                handleRecordStop();
            }
        } else {
            handleRecordStop();
        }
    }

    function handleRecordStop() {
        stopRecordRaf();

        isRecording = false;
        stopStream();

        if (!chunks.length) return;

        // Prefer the recorder's actual mimeType
        const finalType =
            (mediaRecorder && mediaRecorder.mimeType) ||
            recorderMimeType ||
            (chunks[0] && chunks[0].type) ||
            "";

        const blob = new Blob(chunks, { type: finalType });
        chunks = [];

        // Revoke any previous local URL
        if (localUrl) {
            try {
                URL.revokeObjectURL(localUrl);
            } catch {
                // ignore
            }
        }

        localUrl = URL.createObjectURL(blob);
        currentTime = 0;

        // Approximate duration from timer (good enough pre-upload)
        duration = recordSeconds || duration;

        const ext = mimeToExt(blob.type);
        const filename = `voice.${ext}`;

        dispatch("recorded", {
            blob,
            url: localUrl,
            duration: recordSeconds,
            mimeType: blob.type || finalType || null,
            filename,
        });
    }

    function stopStream() {
        if (recordStream) {
            try {
                recordStream.getTracks().forEach((t) => t.stop());
            } catch {
                // ignore
            }
        }
        recordStream = null;
        mediaRecorder = null;
        recorderMimeType = null;
    }

    function handleReplace() {
        if (isRecording || disabled) return;

        startRecording();
        dispatch("replacing");
    }

    function clearLocalRecording() {
        stopRecordRaf();

        if (localUrl) {
            try {
                URL.revokeObjectURL(localUrl);
            } catch {
                // ignore
            }
        }

        localUrl = null;
        resetPlaybackState();
        errorMessage = null;
        dispatch("cleared");
    }

    onDestroy(() => {
        stopPlaybackRaf();
        stopRecordRaf();

        if (localUrl) {
            try {
                URL.revokeObjectURL(localUrl);
            } catch {
                // ignore
            }
        }

        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            try {
                mediaRecorder.stop();
            } catch {
                // ignore
            }
        }

        resetPlaybackState();
        stopStream();
    });
</script>

<div class="audio-picker">
    {#if errorMessage}
        <p class="red audio-picker__error">{errorMessage}</p>
    {/if}

    {#if recordable}
        {#if !effectiveUrl && !isRecording}
            <button
                type="button"
                class="audio-picker__record-cta pressable"
                on:click={startRecording}
                disabled={disabled}
            >
                <span class="audio-picker__dot" aria-hidden="true"></span>
                <span>
                    {#if maxDuration}
                        Record (max {maxDuration}s)
                    {:else}
                        Record
                    {/if}
                </span>
            </button>
        {/if}

        {#if isRecording}
            <div class="audio-picker__shell audio-picker__shell--recording">
                <button
                    type="button"
                    class="btn btn--icon btn--danger audio-picker__icon"
                    on:click={stopRecording}
                    disabled={disabled}
                    aria-label="Stop recording"
                >
                    ■
                </button>

                <div class="audio-picker__track">
                    <div class="audio-picker__bar" aria-hidden="true">
                        <div
                            class="audio-picker__bar-fill"
                            style={`width: ${
                                maxDuration
                                    ? Math.min(100, (recordSeconds / maxDuration) * 100)
                                    : 0
                            }%;`}
                        ></div>
                    </div>

                    <div class="audio-picker__time">
                        <span>{formatTime(recordSeconds)}</span>
                        {#if maxDuration}
                            <span class="audio-picker__time-total">
                                / {formatTime(maxDuration)}
                            </span>
                        {/if}
                    </div>
                </div>

                <div class="audio-picker__actions">
                    <span class="audio-picker__recording-label">Recording…</span>
                </div>
            </div>
        {:else if effectiveUrl}
            <div class="audio-picker__shell">
                <button
                    type="button"
                    class="btn btn--icon btn--primary audio-picker__icon"
                    on:click={togglePlay}
                    disabled={disabled}
                    aria-label={isPlaying ? "Pause" : "Play"}
                >
                    {#if isPlaying}
                        ❚❚
                    {:else}
                        ▶
                    {/if}
                </button>

                <button
                    type="button"
                    class="audio-picker__track audio-picker__track-button pressable"
                    on:click={seek}
                    on:keydown={handleTrackKeydown}
                    disabled={disabled}
                    aria-label="Audio playback timeline"
                >
                    <div class="audio-picker__bar" aria-hidden="true">
                        {#if showWaveform}
                            <div class="audio-picker__waveform audio-picker__waveform--base">
                                {#each waveformBins as amp (amp)}
                                    <span class="audio-picker__wave-bar" style={`height:${ampPct(amp)};`}></span>
                                {/each}
                            </div>

                            <div
                                class="audio-picker__waveform audio-picker__waveform--fill"
                                style={`width:${progress * 100}%;`}
                            >
                                {#each waveformBins as amp (amp)}
                                    <span class="audio-picker__wave-bar" style={`height:${ampPct(amp)};`}></span>
                                {/each}
                            </div>
                        {:else}
                            <div
                                class="audio-picker__bar-fill"
                                style={`width: ${progress * 100}%;`}
                            ></div>
                        {/if}
                    </div>

                    <div class="audio-picker__time">
                        <span>{formatTime(currentTime)}</span>
                        {#if effectiveDuration}
                            <span class="audio-picker__time-total">
                                / {formatTime(effectiveDuration)}
                            </span>
                        {/if}
                    </div>
                </button>

                <div class="audio-picker__actions">
                    <button
                        type="button"
                        class="audio-picker__text-action"
                        on:click={handleReplace}
                        disabled={disabled}
                    >
                        Replace
                    </button>

                    {#if localUrl}
                        <button
                            type="button"
                            class="audio-picker__text-action audio-picker__text-action--muted"
                            on:click={clearLocalRecording}
                            disabled={disabled}
                        >
                            Discard Changes
                        </button>
                    {/if}
                </div>
            </div>
        {/if}
    {:else}
        {#if effectiveUrl}
            <button
                type="button"
                class="audio-picker__preview pressable"
                on:click={togglePlay}
                disabled={disabled}
                aria-label="Play voice note"
            >
                <div class="audio-picker__preview-icon" aria-hidden="true">
                    <span class="audio-picker__preview-symbol">
                        {#if isPlaying}
                            ■
                        {:else}
                            ▶
                        {/if}
                    </span>

                    {#if isPlaying && remainingSeconds > 0}
                        <span class="audio-picker__preview-remaining">
                            {remainingSeconds}
                        </span>
                    {/if}
                </div>

                {#if previewLabel}
                    <div class="audio-picker__preview-body">
                        <span
                            class="audio-picker__preview-text"
                            style={`visibility: ${isPlaying ? "hidden" : "visible"};`}
                        >
                            {previewLabel}
                        </span>

                        {#if isPlaying}
                            <div class="audio-picker__preview-bar" aria-hidden="true">
                                <div
                                    class="audio-picker__preview-bar-fill"
                                    style={`width: ${progress * 100}%;`}
                                ></div>
                            </div>
                        {/if}
                    </div>
                {/if}
            </button>
        {:else}
            <p class="hint">No voice intro yet.</p>
        {/if}
    {/if}

    {#if effectiveUrl}
        <audio
            bind:this={audioEl}
            src={effectiveUrl}
            preload="metadata"
            on:play={onAudioPlay}
            on:pause={onAudioPause}
            on:loadedmetadata={onLoadedMetadata}
            on:timeupdate={onTimeUpdate}
            on:ended={onEnded}
            on:error={onAudioError}
        ></audio>
    {/if}
</div>

<style>
    .audio-picker {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        width: 100%;
    }

    .audio-picker__error {
        font-size: 0.9rem;
    }

    .audio-picker__shell {
        display: flex;
        align-items: center;
        gap: var(--space-3);

        width: 100%;
        padding: var(--space-2) var(--space-3);

        border-radius: var(--radius-md);
        background: var(--bg-surface);
        border: var(--border-width) solid var(--border-color);
    }

    .audio-picker__shell--recording {
        border-color: var(--danger);
    }

    .audio-picker__icon.btn--icon {
        width: 32px;
        height: 32px;
        font-size: 0.9rem;
    }

    .audio-picker__track {
        flex: 1 1 auto;
        min-width: 0;

        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }

    .audio-picker__track-button {
        text-align: left;
    }

    .audio-picker__track-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .audio-picker__bar {
        position: relative;
        width: 100%;
        height: 10px;
        border-radius: var(--radius-full);
        background: var(--border-color);
        overflow: hidden;
    }

    .audio-picker__bar-fill {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 0%;
        border-radius: var(--radius-full);
        background: var(--accent);
        transition: width 0.05s linear;
    }

    /* Waveform layers */
    .audio-picker__waveform {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        gap: 1px;
        padding: 0 6px;
        overflow: hidden;
    }

    .audio-picker__waveform--base {
        opacity: 0.55;
    }

    .audio-picker__waveform--fill {
        overflow: hidden;
        border-radius: var(--radius-full);
    }

    .audio-picker__wave-bar {
        flex: 1 1 0;
        min-width: 1px;
        border-radius: 999px;
        background: var(--bg-surface);
        opacity: 0.9;
    }

    /* In the fill layer, paint bars with accent so progress is obvious */
    .audio-picker__waveform--fill .audio-picker__wave-bar {
        background: var(--accent);
        opacity: 1;
    }

    .audio-picker__time {
        display: flex;
        align-items: baseline;
        gap: var(--space-1);
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .audio-picker__time-total {
        opacity: 0.85;
    }

    .audio-picker__actions {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        align-items: flex-end;
        font-size: 0.75rem;
        color: var(--text-muted);
        flex-shrink: 0;
    }

    .audio-picker__recording-label {
        color: var(--danger);
    }

    .audio-picker__text-action {
        border: 0;
        background: none;
        padding: 0;

        color: var(--accent);
        cursor: pointer;
        font: inherit;
        font-size: 0.75rem;
        text-align: right;
    }

    .audio-picker__text-action:hover {
        color: var(--text-primary);
    }

    .audio-picker__text-action:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .audio-picker__text-action--muted {
        color: var(--text-muted);
    }

    .audio-picker__text-action--muted:hover {
        color: var(--text-secondary);
    }

    .audio-picker__record-cta {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);

        width: fit-content;
        padding: var(--space-2) var(--space-3);

        border-radius: var(--radius-full);
        border: var(--border-width) dashed var(--border-color);
        background: var(--bg-surface);

        font-size: 0.9rem;
        color: var(--text-muted);
    }

    .audio-picker__record-cta:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .audio-picker__dot {
        width: 10px;
        height: 10px;
        border-radius: var(--radius-full);
        background: var(--danger);
        flex-shrink: 0;
    }

    .audio-picker__preview {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);

        width: fit-content;
        padding: var(--space-2) var(--space-3);

        border-radius: var(--radius-full);
        border: var(--border-width) solid var(--border-color);
        background: var(--bg-surface);

        overflow: hidden;
    }

    .audio-picker__preview:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .audio-picker__preview-icon {
        width: 28px;
        height: 28px;
        border-radius: var(--radius-full);
        background: var(--accent);
        color: var(--bg-app);

        display: flex;
        align-items: center;
        justify-content: center;

        position: relative;
        flex-shrink: 0;
        font-size: 0.8rem;
    }

    .audio-picker__preview-symbol {
        line-height: 1;
    }

    .audio-picker__preview-remaining {
        position: absolute;
        bottom: -0.35rem;
        right: -0.35rem;

        font-size: 0.55rem;
        padding: 0.05rem 0.25rem;

        border-radius: var(--radius-full);
        background: var(--bg-surface);
        color: var(--text-muted);
    }

    .audio-picker__preview-body {
        position: relative;
        display: inline-flex;
        align-items: center;

        height: 4px;
        min-width: 60px;
    }

    .audio-picker__preview-bar {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        background: var(--border-color);
        border-radius: var(--radius-full);
    }

    .audio-picker__preview-bar-fill {
        height: 100%;
        width: 0%;
        background: var(--accent);
        border-radius: var(--radius-full);
        transition: width 0.05s linear;
    }

    .audio-picker__preview-text {
        font-size: 0.75rem;
        color: var(--text-muted);
        white-space: nowrap;
    }
</style>
