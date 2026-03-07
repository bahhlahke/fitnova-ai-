import { createClient } from "./supabase/client";

export const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export async function getSpotifyToken() {
    const supabase = createClient();
    if (!supabase) return null;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Supabase stores the provider token in the session object
    // Note: provider_token and provider_refresh_token are only available 
    // if the user signed in with that provider in the current session.
    return session.provider_token ?? null;
}

export async function spotifyFetch(endpoint: string, options: RequestInit = {}) {
    const token = await getSpotifyToken();
    if (!token) throw new Error("No Spotify token found");

    const url = endpoint.startsWith("http") ? endpoint : `${SPOTIFY_API_BASE}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (response.status === 401) {
        // Token might be expired. Since we are using Supabase session tokens,
        // the user might need to re-authenticate or we might need to handle refresh if available.
        throw new Error("Spotify token expired or unauthorized");
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(error.message || `Spotify API error: ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
}

export async function getWorkoutsPlaylists() {
    try {
        const data = await spotifyFetch("/me/playlists?limit=50");
        // Filter for playlists that have "workout", "gym", "fitness", "run", "lift" in the name
        const fitnessKeywords = ["workout", "gym", "fitness", "run", "lift", "training", "beast", "pump"];
        return data.items.filter((playlist: any) =>
            fitnessKeywords.some(keyword => playlist.name.toLowerCase().includes(keyword))
        );
    } catch (err) {
        console.error("Error fetching Spotify playlists:", err);
        return [];
    }
}

export async function getCurrentPlayback() {
    try {
        return await spotifyFetch("/me/player");
    } catch (err) {
        console.error("Error fetching current playback:", err);
        return null;
    }
}
