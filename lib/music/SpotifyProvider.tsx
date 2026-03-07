"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import Script from "next/script";

type SpotifyPlayerState = {
    player: Spotify.Player | null;
    deviceId: string | null;
    isReady: boolean;
    isActive: boolean;
    isPlaying: boolean;
    currentTrack: Spotify.Track | null;
    volume: number;
    error: string | null;
};

type SpotifyContextType = SpotifyPlayerState & {
    play: () => Promise<void>;
    pause: () => Promise<void>;
    next: () => Promise<void>;
    previous: () => Promise<void>;
    setVolume: (volume: number) => Promise<void>;
    transferPlayback: () => Promise<void>;
    togglePlay: () => Promise<void>;
};

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<SpotifyPlayerState>({
        player: null,
        deviceId: null,
        isReady: false,
        isActive: false,
        isPlaying: false,
        currentTrack: null,
        volume: 0.5,
        error: null,
    });

    const playerRef = useRef<Spotify.Player | null>(null);

    const updateState = useCallback((updates: Partial<SpotifyPlayerState>) => {
        setState(s => ({ ...s, ...updates }));
    }, []);

    const initPlayer = useCallback(async () => {
        if (typeof window === "undefined" || !window.Spotify) return;

        const res = await fetch("/api/v1/spotify/token");
        const { token, error } = await res.json();

        if (error || !token) {
            updateState({ error: error || "Could not retrieve Spotify token" });
            return;
        }

        const player = new window.Spotify.Player({
            name: "FitNova AI Coach Player",
            getOAuthToken: (cb: (token: string) => void) => { cb(token); },
            volume: state.volume
        });

        playerRef.current = player;

        player.addListener('initialization_error', ({ message }: { message: string }) => updateState({ error: message }));
        player.addListener('authentication_error', ({ message }: { message: string }) => updateState({ error: message }));
        player.addListener('account_error', ({ message }: { message: string }) => updateState({ error: message }));
        player.addListener('playback_error', ({ message }: { message: string }) => updateState({ error: message }));

        player.addListener('player_state_changed', (state: any) => {
            if (!state) {
                updateState({ isActive: false });
                return;
            }
            updateState({
                isActive: true,
                isPlaying: !state.paused,
                currentTrack: state.track_window.current_track,
            });
        });

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
            console.log('Ready with Device ID', device_id);
            updateState({ deviceId: device_id, isReady: true });
        });

        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
            console.log('Device ID has gone offline', device_id);
            updateState({ isReady: false });
        });

        await player.connect();
        updateState({ player });
    }, [state.volume, updateState]);

    useEffect(() => {
        window.onSpotifyWebPlaybackSDKReady = () => {
            void initPlayer();
        };
    }, [initPlayer]);

    const play = async () => playerRef.current?.resume();
    const pause = async () => playerRef.current?.pause();
    const next = async () => playerRef.current?.nextTrack();
    const previous = async () => playerRef.current?.previousTrack();
    const setVolume = async (v: number) => {
        updateState({ volume: v });
        await playerRef.current?.setVolume(v);
    };
    const togglePlay = async () => playerRef.current?.togglePlay();

    const transferPlayback = async () => {
        if (!state.deviceId) return;

        try {
            const res = await fetch("/api/v1/spotify/token");
            const { token } = await res.json();

            await fetch('https://api.spotify.com/v1/me/player', {
                method: 'PUT',
                body: JSON.stringify({ device_ids: [state.deviceId], play: true }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (err) {
            console.error("Failed to transfer playback:", err);
        }
    };

    return (
        <SpotifyContext.Provider value={{
            ...state,
            play,
            pause,
            next,
            previous,
            setVolume,
            transferPlayback,
            togglePlay
        }}>
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

// Global Spotify types for TypeScript
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
