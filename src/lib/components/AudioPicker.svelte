
<script>
    import { onDestroy, createEventDispatcher } from "svelte";

    // Props
    // - audio: existing URL (string|null), e.g. from profile.audio.url
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
    let recordTimer = null;
    let mediaRecorder = null;
    let recordStream = null;
    let chunks = [];

    // Errors
    let errorMessage = null;

    function resetPlaybackState() {
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
        duration = 0;
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
    $: effectiveUrl = localUrl || audio || null;

    // Effective duration for UI / seeking: clamp to maxDuration if provided,
    // and fall back to maxDuration if metadata never loads.
    $: effectiveDuration = (() => {
        if (duration && Number.isFinite(duration)) {
            return maxDuration ? Math.min(duration, maxDuration) : duration;
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

    // ------------- Playback -------------

    function forceReset() {
        if (!audioEl) return;
        audioEl.pause();

        // brute-force reset sequence
        audioEl.currentTime = 0;

        // force browser to acknowledge the seek
        audioEl.src = audioEl.src; // reassign same URL
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

            audioEl.play().catch(err => {
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
    }

    function onAudioPause() {
        isPlaying = false;
    }

    function onLoadedMetadata() {
        if (!audioEl) return;
        const d = audioEl.duration;
        if (Number.isFinite(d) && d > 0) {
            duration = d;
        } else if (!duration && maxDuration) {
            // Browser reported 0/Infinity: fall back so UI is still usable
            duration = maxDuration;
        }
    }

    function onTimeUpdate() {
        if (!audioEl) return;
        const t = audioEl.currentTime || 0;
        currentTime = t;

        // Try to capture duration lazily if it becomes available later
        if (!duration || !Number.isFinite(duration) || duration === Infinity) {
            const d = audioEl.duration;
            if (Number.isFinite(d) && d > 0) {
                duration = d;
            }
        }

        if (maxDuration && t >= maxDuration) {
            // Hard-stop playback after maxDuration
            audioEl.currentTime = maxDuration;
            audioEl.pause();
            currentTime = maxDuration;
        }
    }

    function onEnded() {
        isPlaying = false;
        // Clamp to effective duration
        currentTime = effectiveDuration || 0;
    }

    function seek(event) {
        if (!audioEl || !effectiveUrl || !effectiveDuration) return;

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

    // ------------- Recording -------------

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
                try {
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: "audio/webm",
                    });
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

                // Timer to track duration + enforce max
                recordTimer = setInterval(() => {
                    recordSeconds += 0.25;
                    if (maxDuration && recordSeconds >= maxDuration) {
                        stopRecording();
                    }
                }, 250);
            })
            .catch((err) => {
                console.error("getUserMedia failed:", err);
                errorMessage =
                    "We couldn't access your microphone. Check browser permissions.";
            });
    }

    function stopRecording() {
        if (!isRecording) return;

        if (recordTimer) {
            clearInterval(recordTimer);
            recordTimer = null;
        }

        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            try {
                mediaRecorder.stop();
            } catch (err) {
                console.error("mediaRecorder.stop failed:", err);
                handleRecordStop();
            }
        } else {
            // Nothing to stop, but ensure cleanup
            handleRecordStop();
        }
    }

    function handleRecordStop() {
        if (recordTimer) {
            clearInterval(recordTimer);
            recordTimer = null;
        }

        isRecording = false;

        stopStream();

        if (!chunks.length) {
            return;
        }

        const blob = new Blob(chunks, { type: "audio/webm" });
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
        // Approximate duration from timer
        duration = recordSeconds || duration;

        // Notify parent so it can upload/save the blob
        dispatch("recorded", {
            blob,
            url: localUrl,
            duration: recordSeconds,
            mimeType: "audio/webm",
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
    }

    function handleReplace() {
        if (isRecording || disabled) return;
        // Start a brand new recording, previous one is conceptually discarded.
        startRecording();
        // Let parent know user is replacing; useful if you want to mark old
        // audio as dirty and delete it after successful upload of new.
        dispatch("replacing");
    }

    function clearLocalRecording() {
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
        if (localUrl) {
            try {
                URL.revokeObjectURL(localUrl);
            } catch {
                // ignore
            }
        }
        if (recordTimer) {
            clearInterval(recordTimer);
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

<div class="voice-note">
    {#if errorMessage}
        <p class="error">{errorMessage}</p>
    {/if}

    {#if recordable}
        {#if !effectiveUrl && !isRecording}
            <!-- No audio yet: simple "tap to record" state -->
            <button
                type="button"
                class="record-cta"
                on:click={startRecording}
                disabled={disabled}
            >
                <span class="dot"></span>
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
            <!-- Recording state -->
            <div class="shell recording">
                <button
                    type="button"
                    class="icon-button stop"
                    on:click={stopRecording}
                    disabled={disabled}
                >
                    ■
                </button>

                <div class="track">
                    <div class="bar">
                        <div
                            class="bar-fill"
                            style={`width: ${
                                maxDuration
                                    ? Math.min(
                                          100,
                                          (recordSeconds / maxDuration) * 100,
                                      )
                                    : 0
                            }%;`}
                        ></div>
                    </div>
                    <div class="time">
                        <span>{formatTime(recordSeconds)}</span>
                        {#if maxDuration}
                            <span class="time-total">
                                / {formatTime(maxDuration)}
                            </span>
                        {/if}
                    </div>
                </div>

                <div class="actions">
                    <span class="recording-label">Recording…</span>
                </div>
            </div>
        {:else if effectiveUrl}
            <!-- Playback + replace -->
            <div class="shell">
                <button
                    type="button"
                    class="icon-button"
                    on:click={togglePlay}
                    disabled={disabled}
                >
                    {#if isPlaying}
                        ❚❚
                    {:else}
                        ▶
                    {/if}
                </button>

                <button
                    type="button"
                    class="track track-button"
                    on:click={seek}
                    on:keydown={handleTrackKeydown}
                    aria-label="Audio playback timeline"
                >
                    <div class="bar">
                        <div
                            class="bar-fill"
                            style={`width: ${progress * 100}%;`}
                        ></div>
                    </div>
                    <div class="time">
                        <span>{formatTime(currentTime)}</span>
                        {#if effectiveDuration}
                            <span class="time-total">
                                / {formatTime(effectiveDuration)}
                            </span>
                        {/if}
                    </div>
                </button>

                <div class="actions">
                    {#if recordable}
                        <button
                            type="button"
                            class="text-button"
                            on:click={handleReplace}
                            disabled={disabled}
                        >
                            Replace
                        </button>
                        {#if localUrl}
                            <button
                                type="button"
                                class="text-button secondary"
                                on:click={clearLocalRecording}
                                disabled={disabled}
                            >
                                Discard Changes
                            </button>
                        {/if}
                    {/if}
                </div>
            </div>
        {/if}
    {:else}
        <!-- Playback-only mode -->
        {#if effectiveUrl}
            <button
                type="button"
                class="shell preview"
                on:click={togglePlay}
                disabled={disabled}
                aria-label="Play voice note"
            >
                <div class="preview-icon">
                    <span class="preview-icon-symbol">
                        {#if isPlaying}
                            ■
                        {:else}
                            ▶
                        {/if}
                    </span>
                    {#if isPlaying && remainingSeconds > 0}
                        <span class="preview-remaining">
                            {remainingSeconds}
                        </span>
                    {/if}
                </div>

                {#if previewLabel}
                    <div class="preview-body">
                        <span
                            class="preview-text"
                            style={`visibility: ${isPlaying ? "hidden" : "visible"};`}
                        >
                            {previewLabel}
                        </span>

                        {#if isPlaying}
                            <div class="preview-bar">
                                <div
                                    class="preview-bar-fill"
                                    style={`width: ${progress * 100}%;`}
                                ></div>
                            </div>
                        {/if}
                    </div>
                {/if}
            </button>
        {:else}
            <p class="placeholder">No voice intro yet.</p>
        {/if}
    {/if}

    <!-- Hidden audio element -->
    {#if effectiveUrl}
        <audio
            bind:this={audioEl}
            src={effectiveUrl}
            on:play={onAudioPlay}
            on:pause={onAudioPause}
            on:loadedmetadata={onLoadedMetadata}
            on:timeupdate={onTimeUpdate}
            on:ended={onEnded}
        ></audio>
    {/if}
</div>

<style>
    .voice-note {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
        align-items: center; /* center component within the form column */
    }

    .shell {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        width: 100%; /* full width like inputs */
        border-radius: 6px; /* match input border radius */
        background: var(--bg-2); /* same background as inputs */
        border: 1px solid var(--border-3); /* same border as inputs */
    }

    .shell.recording {
        border-color: var(--red);
    }

    .icon-button {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--accent-blue);
        color: #fff;
        cursor: pointer;
        flex-shrink: 0;
        font-size: 0.9rem;
    }

    .icon-button.stop {
        background: var(--red);
    }

    .icon-button:disabled {
        opacity: 0.5;
        cursor: default;
    }

    .track {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        cursor: pointer;
    }

    /* Reset default button styles for track buttons */
    .track-button {
        border: none;
        background: transparent;
        padding: 0;
        text-align: left;
    }

    .bar {
        position: relative;
        width: 100%;
        height: 6px;
        border-radius: 999px;
        background: var(--border-3);
        overflow: hidden;
    }

    .bar-fill {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 0%;
        border-radius: 999px;
        background: var(--accent-blue);
        transition: width 0.05s linear;
    }

    .time {
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
        font-size: 0.75rem;
        color: var(--text-3);
    }

    .time-total {
        opacity: 0.8;
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-end;
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .recording-label {
        color: var(--red);
    }

    .text-button {
        border: none;
        background: none;
        color: var(--accent-blue);
        cursor: pointer;
        font-size: 0.75rem;
        padding: 0;
    }

    .text-button.secondary {
        color: var(--text-3);
    }

    .text-button:disabled {
        opacity: 0.5;
        cursor: default;
    }

    .record-cta {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        border-radius: 999px;
        border: 1px dashed var(--border-2);
        background: var(--bg-2);
        padding: 0.4rem 0.75rem;
        cursor: pointer;
        font-size: 0.85rem;
        color: var(--text-muted);
        align-self: center; /* center the "Tap to record" pill */
    }

    .record-cta .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--red);
    }

    .record-cta:disabled {
        opacity: 0.5;
        cursor: default;
    }

    .placeholder {
        font-size: 0.85rem;
        color: var(--text-muted);
    }

    .error {
        font-size: 0.8rem;
        color: var(--red);
    }

    .shell.preview {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        width: auto;
        max-width: none;
        padding: 0.35rem 0.6rem;
        border-radius: 999px;
        border: 1px solid var(--border-3);
        background: var(--bg-2);
        cursor: pointer;
        overflow: hidden;
    }

    .shell.preview:disabled {
        opacity: 0.6;
        cursor: default;
    }

    .preview-icon {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: var(--accent-blue);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        flex-shrink: 0;
        font-size: 0.8rem;
    }

    .preview-icon-symbol {
        line-height: 1;
    }

    .preview-remaining {
        position: absolute;
        bottom: -0.35rem;
        right: -0.35rem;
        font-size: 0.55rem;
        padding: 0.05rem 0.25rem;
        border-radius: 999px;
        background: var(--bg-2);
        color: var(--text-3);
    }

    .preview-body {
        position: relative;
        display: inline-flex;
        align-items: center;
        height: 3px;
        min-width: 60px;
    }

    .preview-bar {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        background: var(--border-3);
    }

    .preview-bar-fill {
        height: 100%;
        width: 0%;
        background: var(--accent-blue);
        transition: width 0.05s linear;
    }

    .preview-text {
        font-size: 0.75rem;
        color: var(--text-3);
        white-space: nowrap;
    }

</style>
