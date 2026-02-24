/**
 * Default demo images per exercise for guided workouts.
 * Keys are normalized (lowercase, trim). Replace with AI-generated or branded assets;
 * see public/images/README.md. Plan exercises can override via optional image_url.
 */
const BY_NAME: Record<string, string> = {
  "goblet squat":
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=85",
  "push-up":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "push up":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "dumbbell rdl":
    "https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=800&h=600&fit=crop&q=85",
  "rdl":
    "https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=800&h=600&fit=crop&q=85",
  "bench press":
    "https://images.unsplash.com/photo-1534368959876-e5e9d32c2d3f?w=800&h=600&fit=crop&q=85",
  "squat":
    "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=800&h=600&fit=crop&q=85",
  "deadlift":
    "https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=800&h=600&fit=crop&q=85",
  "row":
    "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&h=600&fit=crop&q=85",
  "dumbbell row":
    "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&h=600&fit=crop&q=85",
  "overhead press":
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&h=600&fit=crop&q=85",
  "lunges":
    "https://images.unsplash.com/photo-1434682881908-b43d0467ba58?w=800&h=600&fit=crop&q=85",
  "lunge":
    "https://images.unsplash.com/photo-1434682881908-b43d0467ba58?w=800&h=600&fit=crop&q=85",
  "plank":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "lat pulldown":
    "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&h=600&fit=crop&q=85",
  "leg press":
    "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=800&h=600&fit=crop&q=85",
  "hip thrust":
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=85",
  "curl":
    "https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=800&h=600&fit=crop&q=85",
  "bicep curl":
    "https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=800&h=600&fit=crop&q=85",
  "tricep":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "tricep pushdown":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "incline bench press":
    "https://images.unsplash.com/photo-1534368959876-e5e9d32c2d3f?w=800&h=600&fit=crop&q=85",
  "incline dumbbell press":
    "https://images.unsplash.com/photo-1534368959876-e5e9d32c2d3f?w=800&h=600&fit=crop&q=85",
  "cable fly":
    "https://images.unsplash.com/photo-1534368959876-e5e9d32c2d3f?w=800&h=600&fit=crop&q=85",
  "chest fly":
    "https://images.unsplash.com/photo-1534368959876-e5e9d32c2d3f?w=800&h=600&fit=crop&q=85",
  "pull-up":
    "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&h=600&fit=crop&q=85",
  "pull up":
    "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&h=600&fit=crop&q=85",
  "chin-up":
    "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&h=600&fit=crop&q=85",
  "chin up":
    "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&h=600&fit=crop&q=85",
  "barbell row":
    "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&h=600&fit=crop&q=85",
  "bent over row":
    "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&h=600&fit=crop&q=85",
  "cable row":
    "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&h=600&fit=crop&q=85",
  "face pull":
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&h=600&fit=crop&q=85",
  "lateral raise":
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&h=600&fit=crop&q=85",
  "front raise":
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&h=600&fit=crop&q=85",
  "bulgarian split squat":
    "https://images.unsplash.com/photo-1434682881908-b43d0467ba58?w=800&h=600&fit=crop&q=85",
  "leg curl":
    "https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=800&h=600&fit=crop&q=85",
  "leg extension":
    "https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=800&h=600&fit=crop&q=85",
  "calf raise":
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=85",
  "sumo deadlift":
    "https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=800&h=600&fit=crop&q=85",
  "kettlebell swing":
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=85",
  "box jump":
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=85",
  "burpee":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "mountain climber":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "crunch":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "bicycle crunch":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "russian twist":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "dead bug":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "glute bridge":
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=85",
  "donkey kick":
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=85",
  "skull crusher":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "hammer curl":
    "https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=800&h=600&fit=crop&q=85",
  "preacher curl":
    "https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=800&h=600&fit=crop&q=85",
  "dips":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "dip":
    "https://images.unsplash.com/photo-1584735175097-719d848f8449?w=800&h=600&fit=crop&q=85",
  "romanian deadlift":
    "https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=800&h=600&fit=crop&q=85",
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=85";

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/** True if the URL is a video file (guided workout will render <video> with loop/autoplay). */
export function isExerciseVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url.trim());
}

/** True if the URL is an animated GIF (guided workout will render <img> so the GIF loops). */
export function isExerciseGifUrl(url: string): boolean {
  return /\.gif(\?|$)/i.test(url.trim());
}

/** Returns the display URL for an exercise (static image, GIF, or video). Plan can override via image_url. */
export function getExerciseImageUrl(
  exerciseName: string,
  overrideUrl?: string | null
): string {
  if (overrideUrl?.trim()) return overrideUrl.trim();
  const key = normalize(exerciseName);
  return BY_NAME[key] ?? DEFAULT_IMAGE;
}
