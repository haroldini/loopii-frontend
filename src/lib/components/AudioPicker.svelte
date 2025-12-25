
<script>
    import { onDestroy, createEventDispatcher } from "svelte";
    import Icon from "@iconify/svelte";
    import { UI_ICONS } from "$lib/stores/app.js";
    import { addToast } from "$lib/stores/popups.js";

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
        clearLocalRecording({ resetRemoteHidden: true });
    }

    const dispatch = createEventDispatcher();

    let audioEl;

    // Local URL for newly-recorded audio
    let localUrl = null;
    let remoteHidden = false;

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

    let lastAudioUrl = null;
    $: if (audioUrl !== lastAudioUrl) {
        lastAudioUrl = audioUrl;
        remoteHidden = false;
    }

    $: backendDuration =
        audio && typeof audio === "object"
            ? (Number.isFinite(audio.duration_seconds) ? audio.duration_seconds : null)
            : null;

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
        if (localUrl) duration = 0;
    }

    // Track external audio changes
    let lastAudioProp = null;
    $: if (audio !== lastAudioProp) {
        lastAudioProp = audio;
        if (!localUrl) {
            resetPlaybackState();
        }
    }

    // Prefer local recording if present
    $: effectiveUrl = localUrl || (remoteHidden ? null : audioUrl) || null;

    // Prefer backendDuration for remote clips
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
        currentTime = 0;
        isPlaying = false;
    }

    function togglePlay() {
        if (!audioEl || !effectiveUrl || disabled || isRecording) return;

        // PREVIEW MODE (recordable = false)
        if (!recordable) {
            if (isPlaying) {
                forceReset();
                return;
            }
            forceReset();
            audioEl.play().catch((err) => {
                console.error("Audio play failed:", err);
                addToast({
                    text: "Unable to play audio on this device.",
                    autoHideMs: 3000,
                });
            });

            return;
        }

        // NORMAL MODE (recordable = true)
        if (isPlaying) {
            audioEl.pause();
        } else {
            audioEl.play().catch((err) => {
                console.error("Audio play failed:", err);
                addToast({
                    text: "Unable to play audio on this device.",
                    autoHideMs: 3000,
                });
            });
        }
    }

    function onAudioPlay() {
        isPlaying = true;
        startPlaybackRaf();
    }

    function onAudioPause() {
        isPlaying = false;
        stopPlaybackRaf();
    }

    function onLoadedMetadata() {
        if (!audioEl) return;
        if (!localUrl && backendDuration && backendDuration > 0) return;

        const d = audioEl.duration;
        if (Number.isFinite(d) && d > 0) {
            duration = d;
        }
    }

    function onTimeUpdate() {
        if (!audioEl) return;

        currentTime = audioEl.currentTime || 0;

        // Capture duration lazily
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
        resetPlaybackState();
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds)) return "0:00";
        const s = Math.max(0, Math.floor(seconds));
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m}:${r.toString().padStart(2, "0")}`;
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
            addToast({
                text: "Unable to record audio on this device.",
                autoHideMs: 3000,
            });
            return;
        }

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
                    addToast({
                        text: "Failed to start audio recording.",
                        autoHideMs: 3000,
                    });
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

                mediaRecorder.start(250);
                startRecordRaf();
            })
            .catch((err) => {
                console.error("getUserMedia failed:", err);

                let text = "Unable to access microphone.";
                let description = "Please check your browser or device settings.";

                switch (err?.name) {
                    case "NotAllowedError":
                    case "PermissionDeniedError":
                        text = "Microphone permission denied.";
                        description = "Allow microphone access in your browser settings.";
                        break;

                    case "NotFoundError":
                    case "DevicesNotFoundError":
                        text = "No microphone found.";
                        description = "Connect a microphone or enable one in system settings.";
                        break;

                    case "NotReadableError":
                    case "TrackStartError":
                        text = "Microphone unavailable.";
                        description = "It may be in use by another app.";
                        break;

                    case "SecurityError":
                        text = "Microphone blocked by browser.";
                        description = "Recording requires HTTPS and browser permission.";
                        break;
                }

                addToast({
                    text,
                    description,
                    autoHideMs: 5000,
                });
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

        const mrMimeType = mediaRecorder && mediaRecorder.mimeType;
        const pickedMimeType = recorderMimeType;

        isRecording = false;

        if (!chunks.length) {
            stopStream();
            return;
        }

        // Prefer the recorder's actual mimeType
        const finalType =
            mrMimeType ||
            pickedMimeType ||
            (chunks[0] && chunks[0].type) ||
            "";

        const blob = new Blob(chunks, { type: finalType });
        chunks = [];

        stopStream();

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

    function handleRemove() {
        if (disabled || isRecording) return;
        if (localUrl) {
            clearLocalRecording();
            return;
        }
        if (!audioUrl) return;

        remoteHidden = true;
        resetPlaybackState();
        dispatch("removed", { source: "remote" });
    }

    function clearLocalRecording(opts = {}) {
        const { resetRemoteHidden = false } = opts;
        stopRecordRaf();
        if (localUrl) {
            try {
                URL.revokeObjectURL(localUrl);
            } catch {
                // ignore
            }
        }

        localUrl = null;
        if (resetRemoteHidden) {
            remoteHidden = false;
        }

        resetPlaybackState();
        dispatch("cleared");
        dispatch("removed", { source: "local" });
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
    {#if recordable}
        {#if !effectiveUrl && !isRecording}
            <button
                type="button"
                class="btn btn--ghost btn--round u-border-dashed"
                on:click={startRecording}
                disabled={disabled}
            >
                <Icon icon={UI_ICONS.audioRecord} class="btn__icon text-danger" />
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
                    class="btn btn--danger btn--circle"
                    on:click={stopRecording}
                    disabled={disabled}
                    aria-label="Stop recording"
                >
                    <Icon icon={UI_ICONS.audioStop} class="btn__icon" />
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

                    <p class="text-hint">
                        <span>{formatTime(recordSeconds)}</span>
                        {#if maxDuration}
                            <span>
                                / {formatTime(maxDuration)}
                            </span>
                        {/if}
                    </p>
                </div>
            </div>
        {:else if effectiveUrl}
            <div class="audio-picker__shell">
                <button
                    type="button"
                    class="btn btn--primary btn--circle"
                    on:click={togglePlay}
                    disabled={disabled}
                    aria-label={isPlaying ? "Pause" : "Play"}
                >
                    {#if isPlaying}
                        <Icon icon={UI_ICONS.audioPause} class="btn__icon" />
                    {:else}
                        <Icon icon={UI_ICONS.audioPlay} class="btn__icon" />
                    {/if}
                </button>

                <div class="audio-picker__track">
                    <div class="audio-picker__bar" aria-hidden="true">
                        <div
                            class="audio-picker__bar-fill"
                            style={`width: ${progress * 100}%;`}
                        ></div>
                    </div>

                    <p class="text-hint">
                        <span>{formatTime(currentTime)}</span>
                        {#if effectiveDuration}
                            <span>
                                / {formatTime(effectiveDuration)}
                            </span>
                        {/if}
                    </p>
                </div>

                <div class="audio-picker__actions">
                    <button
                        type="button"
                        class="btn btn--ghost btn--mini"
                        on:click={handleReplace}
                        disabled={disabled}
                    >
                        <Icon icon={UI_ICONS.refresh} class="btn__icon" />
                    </button>
                    <button
                        type="button"
                        class="btn btn--danger btn--mini"
                        on:click={handleRemove}
                        disabled={disabled}
                    >
                        <Icon icon={UI_ICONS.delete} class="btn__icon" />
                    </button>
                </div>
            </div>
        {/if}
    {:else}
        {#if effectiveUrl}
            <button
                type="button"
                class="btn btn--round audio-picker__preview"
                on:click={togglePlay}
                disabled={disabled}
                aria-label="Play voice note"
            >
                <div class="audio-picker__preview-icon" aria-hidden="true">
                    {#if isPlaying}
                        <Icon icon={UI_ICONS.audioStop} class="btn__icon"/>
                    {:else}
                        <Icon icon={UI_ICONS.audioPlay} class="btn__icon"/>
                    {/if}

                    {#if isPlaying && remainingSeconds > 0}
                        <span class="audio-picker__preview-remaining text-fw-semibold">
                            {remainingSeconds}
                        </span>
                    {/if}
                </div>

                {#if previewLabel}
                    <div class="audio-picker__preview-body">
                        <span
                            class="text-hint"
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
            <p class="text-hint">No voice intro yet.</p>
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
        justify-content: center;
        align-items: center;
    }

    .audio-picker__shell {
        display: flex;
        align-items: center;
        gap: var(--space-3);

        width: 100%;
        padding: var(--space-2) var(--space-4);

        border-radius: var(--radius-full);
        background: var(--bg-surface);
        border: var(--border-width) solid var(--border-color);
    }

    .audio-picker__shell--recording {
        border-color: var(--danger);
    }

    .audio-picker__track {
        flex: 1 1 auto;
        min-width: 0;

        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }

    .audio-picker__bar {
        position: relative;
        width: 100%;
        height: 0.75rem;
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
        border-radius: 0;
        background: var(--accent);
        transition: width 0.05s linear;
    }

    .audio-picker__actions {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .audio-picker__preview {
        padding: var(--space-2) var(--space-3);
        overflow: hidden;
    }

    .audio-picker__preview-icon {
        width: 2rem;
        height: 2rem;
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

    .audio-picker__preview-remaining {
        position: absolute;
        bottom: -0.35rem;
        right: -0.35rem;

        font-size: 0.7rem;
        padding: 0.05rem 0.25rem;

        border-radius: var(--radius-full);
        background: var(--bg-surface);
        color: var(--text-muted);
    }

    .audio-picker__preview-body {
        position: relative;
        display: inline-flex;
        align-items: center;
        height: 0.5rem;
        min-width: 5rem;
    }

    .audio-picker__preview-bar {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        background: var(--border-color);
        border-radius: var(--radius-full);
        overflow: hidden;
    }

    .audio-picker__preview-bar-fill {
        height: 100%;
        width: 0%;
        background: var(--accent);
        border-radius: var(--radius-full);
        transition: width 0.05s linear;
    }
</style>
