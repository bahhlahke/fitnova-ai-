// scripts/benchmark_body_comp.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });// Make sure to load env vars for OpenRouter
import 'dotenv/config';

// The shape of our ground truth data
interface GroundTruth {
    id: string;
    front: string;
    side: string;
    back: string;
    actual_bf: number;
}

// A generic dataset we can use for testing accuracy
// In a real production scenario, this would be 100+ sets of 3-angle images with clinical DEXA results.
const DATASET: GroundTruth[] = [
    {
        id: "lean_athletic",
        front: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg",
        side: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg", // Simulated side
        back: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg", // Simulated back
        // Highly visible abs, serratus clear, low subcutaneous fat
        actual_bf: 10,
    },
    {
        id: "moderate_athletic",
        front: "https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg",
        side: "https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg",
        back: "https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg",
        // Soft abdominal definition
        actual_bf: 15,
    },
    {
        id: "higher_bf",
        front: "https://images.pexels.com/photos/4164844/pexels-photo-4164844.jpeg",
        side: "https://images.pexels.com/photos/4164844/pexels-photo-4164844.jpeg",
        back: "https://images.pexels.com/photos/4164844/pexels-photo-4164844.jpeg",
        // Less definition, higher subcutaneous layers
        actual_bf: 22,
    }
];

// Reusing our AI model structure for the script
const callModel = async (systemContent: string, userContent: any[]) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY required");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "FitNova Body Comp Benchmark"
        },
        body: JSON.stringify({
            model: "openai/gpt-5.2",
            messages: [
                { role: "system", content: systemContent },
                { role: "user", content: userContent }
            ],
            response_format: { type: "json_object" }
        })
    });
    const data = await res.json() as any;
    return data.choices[0].message.content;
};

const systemPrompt = `You are an elite AI body composition scanner acting as a clinical DEXA alternative. You must analyze the images and estimate the body fat percentage based strictly on these visual heuristics for males (adjust +8% if female):

1. < 10%: Deep muscle separation. Striations in shoulders/chest. Veins visible on lower abdomen/pelvis. Serratus anterior (finger-like muscles on ribs) are deeply cut.
2. 10% - 12%: Deeply visible transverse tendinous intersections (six-pack) without flexing. Clear division between obliques and abdominals. Vascularity in arms.
3. 13% - 15%: Top 4 abs visible, but lower abdomen might have a slight layer of fat. Slight vascularity on forearms. Muscle separation is visible but not deeply cut.
4. 16% - 19%: Flat stomach, but transverse intersections (abs) are largely invisible or only faintly shadowed. Muscle outlines exist but lack sharp separation.
5. 20% - 24%: No abdominal definition. Subcutaneous fat pooling around the lower waist (love handles). Chest lacks sharp lower boundary.
6. > 25%: Significant fat accumulation. Roundness around the midsection. No visible vascularity.

Be extremely critical. Do not flatter the user. If they lack sharp definition, place them higher than 15%.

Output ONLY pure JSON formatted exactly like this example without markdown wrappers:
{"body_fat_percent": 16.5, "analysis": "Flat stomach but transverse intersections are entirely obscured by subcutaneous fat. Lower obliques show slight pooling from the side and back angles."}`;

async function runBenchmark() {
    console.log("🚀 Starting AI Body Comp Benchmarking (Model: openai/gpt-5.2)...");

    let totalError = 0;
    const results = [];

    for (const test of DATASET) {
        console.log(`\nScanning ${test.id}... (Actual BF: ${test.actual_bf}%)`);

        const contentArray = [
            { type: "text", text: "You are an elite anthropometrist and DEXA scan alternative. Analyze the provided front, side, and back images of the user's physique and estimate their total body fat percentage. Since genetic fat distribution varies, carefully composite the 3-dimensional fat volume." },
            { type: "image_url", image_url: { url: test.front } },
            { type: "image_url", image_url: { url: test.side } },
            { type: "image_url", image_url: { url: test.back } }
        ];

        try {
            const rawResponse = await callModel(systemPrompt, contentArray);
            let parsed;
            try {
                parsed = JSON.parse(rawResponse);
            } catch {
                console.error(`❌ Failed to parse JSON for ${test.id}:`, rawResponse);
                continue;
            }

            const estimated = parsed.body_fat_percent;
            const error = Math.abs(estimated - test.actual_bf);
            totalError += error;

            console.log(`🔍 AI Estimate: ${estimated}%`);
            console.log(`⚠️ Delta Error: ±${error.toFixed(1)}%`);
            console.log(`📝 Analysis: ${parsed.analysis}`);

            results.push({
                id: test.id,
                actual: test.actual_bf,
                estimated,
                error
            });
        } catch (err: any) {
            console.error(`❌ API call failed for ${test.id}:`, err.message);
        }
    }

    if (results.length > 0) {
        const mae = totalError / results.length;
        console.log(`\n==========================================`);
        console.log(`📊 BENCHMARK COMPLETE`);
        console.log(`📉 Mean Absolute Error (MAE): ±${mae.toFixed(2)}%`);
        console.log(`==========================================`);

        if (mae <= 3) {
            console.log("✅ ACCEPTABLE: Model is operating within clinical caliper error margins (±3%).");
        } else {
            console.log("⚠️ WARNING: MAE is high. Consider adding multi-angle support or adjusting the heuristics prompt.");
        }
    }
}

runBenchmark().catch(console.error);
