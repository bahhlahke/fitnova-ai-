"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Script from "next/script";

type SpotifyConnectionState = "loading" | "connected" | "disconnected" | "error";

type SpotifyPlayerState = {
    player: Spotify.Player | null;
    deviceId: string | null;
    isReady: boolean;
    isActive: boolean;
    isPlaying: boolean;
    currentTrack: Spotify.Track | null;
    volume: number;
    error: string | null;
    connectionState: SpotifyConnectionState;
    statusMessage: string | null;
};

type SpotifyContextType = SpotifyPlayerState & {
    play: () => Promise<void>;
    pause: () => Promise<void>;
    next: () => Promise<void>;
    previous: () => Promise<void>;
    setVolume: (volume: number) => Promise<void>;
    transferPlayback: () => Promise<void>;
    togglePlay: () => Promise<void>;
    refreshConnection: () => Promise<void>;
};

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

const INITIAL_STATE: SpotifyPlayerState = {
    player: null,
    deviceId: null,
    isReady: false,
    isActive: false,
    isPlaying: false,
    currentTrack: null,
    volume: 0.5,
    error: null,
    connectionState: "loading",
    statusMessage: "Preparing Spotify controls...",
};

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<SpotifyPlayerState>(INITIAL_STATE);
    const playerRef = useRef<Spotify.Player | null>(null);

    const updateState = useCallback((updates: Partial<SpotifyPlayerState>) => {
        setState((current) => ({ ...current, ...updates }));
    }, []);

    const resetPlayer = useCallback((overrides: Partial<SpotifyPlayerState> = {}) => {
        if (playerRef.current) {
            playerRef.current.disconnect();
            playerRef.current = null;
        }
        setState((current) => ({
            ...current,
            player: null,
            deviceId: null,
            isReady: false,
            isActive: false,
            isPlaying: false,
            currentTrack: null,
            ...overrides,
        }));
    }, []);

    const resolveToken = useCallback(async () => {
        const res = await fetch("/api/v1/spotify/token");
        const payload = await res.json().catch(() => ({} as { error?: string; token?: string | null; connected?: boolean; message?: string }));

        if (res.ok && payload.connected === false) {
            resetPlayer({
                connectionState: "disconnected",
                error: null,
                statusMessage: payload.message || "Connect Spotify in Integrations to unlock guided-workout playback controls.",
            });
            return null;
        }

        if (res.status === 401) {
            resetPlayer({
                connectionState: "disconnected",
                error: null,
                statusMessage: "Sign in again to reconnect Spotify playback controls.",
            });
            return null;
        }

        if (res.status === 404) {
            resetPlayer({
                connectionState: "disconnected",
                error: null,
                statusMessage: "Connect Spotify in Integrations to unlock guided-workout playback controls.",
            });
            return null;
        }

        if (!res.ok || typeof payload.token !== "string") {
            resetPlayer({
                connectionState: "error",
                error: payload.error || "Spotify is unavailable right now.",
                statusMessage: "You can keep training without Spotify and reconnect from Integrations.",
            });
            return null;
        }

        updateState({
            connectionState: "loading",
            error: null,
            statusMessage: "Preparing Spotify controls...",
        });

        return payload.token;
    }, [resetPlayer, updateState]);

    const initPlayer = useCallback(async () => {
        if (typeof window === "undefined" || !window.Spotify) return;

        const token = await resolveToken();
        if (!token) return;

        if (playerRef.current) {
            playerRef.current.disconnect();
            playerRef.current = null;
        }

        const player = new window.Spotify.Player({
            name: "FitNova AI Coach Player",
            getOAuthToken: (cb: (nextToken: string) => void) => {
                cb(token);
            },
            volume: state.volume,
        });

        playerRef.current = player;

        player.addListener("initialization_error", ({ message }: { message: string }) => {
            resetPlayer({
                connectionState: "error",
                error: message,
                statusMessage: "Spotify could not initialize on this device.",
            });
        });
        player.addListener("authentication_error", ({ message }: { message: string }) => {
            resetPlayer({
                connectionState: "error",
                error: message,
                statusMessage: "Reconnect Spotify in Integrations to restore playback.",
            });
        });
        player.addListener("account_error", ({ message }: { message: string }) => {
            resetPlayer({
                connectionState: "error",
                error: message,
                statusMessage: "This Spotify account cannot control workout playback right now.",
            });
        });
        player.addListener("playback_error", ({ message }: { message: string }) => {
            updateState({
                connectionState: "error",
                error: message,
                statusMessage: "Playback hit a snag. Open Spotify and try syncing this device again.",
            });
        });

        player.addListener("player_state_changed", (nextState: any) => {
            if (!nextState) {
                updateState({ isActive: false });
                return;
            }
            updateState({
                connectionState: "connected",
                isActive: true,
                isPlaying: !nextState.paused,
                currentTrack: nextState.track_window.current_track,
                statusMessage: null,
            });
        });

        player.addListener("ready", ({ device_id }: { device_id: string }) => {
            updateState({
                player,
                deviceId: device_id,
                isReady: true,
                connectionState: "connected",
                error: null,
                statusMessage: "Spotify is ready on this device.",
            });
        });

        player.addListener("not_ready", () => {
            updateState({
                isReady: false,
                isActive: false,
                statusMessage: "Open Spotify on this device, then sync playback when you are ready.",
            });
        });

        const connected = await player.connect();

        if (!connected) {
            resetPlayer({
                connectionState: "error",
                error: "Spotify player could not connect.",
                statusMessage: "Open Spotify on this device or reconnect in Integrations.",
            });
            return;
        }

        updateState({ player, connectionState: "connected", error: null });
    }, [resetPlayer, resolveToken, state.volume, updateState]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleSdkReady = () => {
            void initPlayer();
        };

        window.onSpotifyWebPlaybackSDKReady = handleSdkReady;

        if (window.Spotify) {
            handleSdkReady();
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.disconnect();
                playerRef.current = null;
            }
        };
    }, [initPlayer]);

    const play = async () => {
        await playerRef.current?.resume();
    };

    const pause = async () => {
        await playerRef.current?.pause();
    };

    const next = async () => {
        await playerRef.current?.nextTrack();
    };

    const previous = async () => {
        await playerRef.current?.previousTrack();
    };

    const setVolume = async (volume: number) => {
        updateState({ volume });
        await playerRef.current?.setVolume(volume);
    };

    const togglePlay = async () => {
        await playerRef.current?.togglePlay();
    };

    const transferPlayback = async () => {
        if (!state.deviceId) {
            await initPlayer();
            return;
        }

        const token = await resolveToken();
        if (!token) return;

        try {
            const res = await fetch("https://api.spotify.com/v1/me/player", {
                method: "PUT",
                body: JSON.stringify({ device_ids: [state.deviceId], play: true }),
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({} as { error?: { message?: string } }));
                updateState({
                    connectionState: "error",
                    error: payload.error?.message || "Could not transfer Spotify playback.",
                    statusMessage: "Open Spotify on this device and try syncing again.",
                });
                return;
            }

            updateState({
                connectionState: "connected",
                error: null,
                statusMessage: "Spotify synced to this device.",
            });
        } catch (error) {
            console.error("spotify_transfer_failed", error);
            updateState({
                connectionState: "error",
                error: "Could not transfer Spotify playback.",
                statusMessage: "You can keep training without music controls for now.",
            });
        }
    };

    const refreshConnection = useCallback(async () => {
        updateState({
            connectionState: "loading",
            error: null,
            statusMessage: "Refreshing Spotify controls...",
        });
        await initPlayer();
    }, [initPlayer, updateState]);

    return (
        <SpotifyContext.Provider
            value={{
                ...state,
                play,
                pause,
                next,
                previous,
                setVolume,
                transferPlayback,
                togglePlay,
                refreshConnection,
            }}
        >
            <Script src="https://sdk.scdn.co/spotify-player.js" strategy="afterInteractive" />
            {children}
        </SpotifyContext.Provider>
    );
}

export function useSpotify() {
    const context = useContext(SpotifyContext);
    if (context === undefined) {
        throw new Error("useSpotify must be used within a SpotifyProvider");
    }
    return context;
}

declare global {
    interface Window {
        onSpotifyWebPlaybackSDKReady: () => void;
        Spotify: any;
    }
    namespace Spotify {
        interface Player {
            new(options: any): Player;
            connect: () => Promise<boolean>;
            disconnect: () => void;
            addListener: (event: string, cb: (data: any) => void) => void;
            removeListener: (event: string, cb?: (data: any) => void) => void;
            getCurrentState: () => Promise<any>;
            setName: (name: string) => Promise<void>;
            getVolume: () => Promise<number>;
            setVolume: (volume: number) => Promise<void>;
            pause: () => Promise<void>;
            resume: () => Promise<void>;
            togglePlay: () => Promise<void>;
            seek: (position_ms: number) => Promise<void>;
            previousTrack: () => Promise<void>;
            nextTrack: () => Promise<void>;
        }
        interface Track {
            uri: string;
            id: string;
            type: string;
            media_type: string;
            name: string;
            is_playable: boolean;
            album: {
                uri: string;
                name: string;
                images: { url: string }[];
            };
            artists: { uri: string; name: string }[];
        }
    }
}
