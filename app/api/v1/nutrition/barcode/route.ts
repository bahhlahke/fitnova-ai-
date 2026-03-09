import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");

    if (!barcode) {
        return NextResponse.json({ error: "Barcode is required" }, { status: 400 });
    }

    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        const data = await res.json();

        if (data.status === 0) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const product = data.product;
        const nutrition = {
            name: product.product_name || "Unknown Product",
            brand: product.brands || "",
            calories: product.nutriscore_data?.energy_value || product.nutriments?.["energy-kcal_100g"] || 0,
            protein: product.nutriments?.protein_100g || 0,
            carbs: product.nutriments?.carbohydrates_100g || 0,
            fat: product.nutriments?.fat_100g || 0,
            serving_size: product.serving_size || "100g",
        };

        return NextResponse.json({ nutrition });
    } catch (error) {
        console.error("Barcode API Error:", error);
        return NextResponse.json({ error: "Failed to fetch product data" }, { status: 500 });
    }
}
