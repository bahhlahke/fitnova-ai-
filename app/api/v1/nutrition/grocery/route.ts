/**
 * Grocery list management with persistent check state.
 * GET  /api/v1/nutrition/grocery?planId=xxx  — fetch grocery list
 * PATCH /api/v1/nutrition/grocery             — toggle item checked state
 * POST  /api/v1/nutrition/grocery             — add custom item
 * DELETE /api/v1/nutrition/grocery?planId=xxx&itemIndex=n — remove item
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, makeRequestId } from "@/lib/api/errors";
import type { EnhancedGroceryItem } from "@/types";

export const dynamic = "force-dynamic";

async function getGroceryList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  planId: string
) {
  const { data, error } = await supabase
    .from("grocery_lists")
    .select("list_id, items_json")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(request: Request) {
  const requestId = makeRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");

  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId");

  try {
    if (planId) {
      const row = await getGroceryList(supabase, user.id, planId);
      return NextResponse.json({ items: row?.items_json ?? [], listId: row?.list_id });
    }

    // No planId: return grocery list for the latest meal plan
    const { data, error } = await supabase
      .from("grocery_lists")
      .select("list_id, plan_id, items_json")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ items: data?.items_json ?? [], listId: data?.list_id, planId: data?.plan_id });
  } catch (err) {
    console.error("grocery_get_error", { requestId, err });
    return jsonError(500, "INTERNAL_ERROR", "Failed to fetch grocery list.");
  }
}

export async function PATCH(request: Request) {
  const requestId = makeRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");

  try {
    const { planId, itemIndex, checked } = (await request.json()) as {
      planId: string;
      itemIndex: number;
      checked: boolean;
    };

    if (!planId || typeof itemIndex !== "number") {
      return jsonError(400, "INTERNAL_ERROR", "planId and itemIndex are required.");
    }

    const row = await getGroceryList(supabase, user.id, planId);
    if (!row) return jsonError(404, "INTERNAL_ERROR", "Grocery list not found.");

    const items = (row.items_json as EnhancedGroceryItem[]) ?? [];
    if (itemIndex < 0 || itemIndex >= items.length) {
      return jsonError(400, "INTERNAL_ERROR", "itemIndex out of range.");
    }
    items[itemIndex] = { ...items[itemIndex], checked };

    const { error } = await supabase
      .from("grocery_lists")
      .update({ items_json: items, updated_at: new Date().toISOString() })
      .eq("list_id", row.list_id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("grocery_patch_error", { requestId, err });
    return jsonError(500, "INTERNAL_ERROR", "Failed to update grocery item.");
  }
}

export async function POST(request: Request) {
  const requestId = makeRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");

  try {
    const { planId, item } = (await request.json()) as {
      planId: string;
      item: Omit<EnhancedGroceryItem, "checked">;
    };

    if (!planId || !item?.item) {
      return jsonError(400, "INTERNAL_ERROR", "planId and item are required.");
    }

    const row = await getGroceryList(supabase, user.id, planId);
    if (!row) return jsonError(404, "INTERNAL_ERROR", "Grocery list not found.");

    const items = (row.items_json as EnhancedGroceryItem[]) ?? [];
    const newItem: EnhancedGroceryItem = {
      item: item.item,
      category: item.category ?? "Other",
      quantity: item.quantity ?? "",
      checked: false,
      custom: true,
    };
    items.push(newItem);

    const { error } = await supabase
      .from("grocery_lists")
      .update({ items_json: items, updated_at: new Date().toISOString() })
      .eq("list_id", row.list_id);
    if (error) throw error;

    return NextResponse.json({ ok: true, itemIndex: items.length - 1 });
  } catch (err) {
    console.error("grocery_post_error", { requestId, err });
    return jsonError(500, "INTERNAL_ERROR", "Failed to add grocery item.");
  }
}

export async function DELETE(request: Request) {
  const requestId = makeRequestId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "AUTH_REQUIRED", "Sign in is required.");

  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("planId");
    const itemIndex = parseInt(searchParams.get("itemIndex") ?? "-1", 10);

    if (!planId || itemIndex < 0) {
      return jsonError(400, "INTERNAL_ERROR", "planId and itemIndex are required.");
    }

    const row = await getGroceryList(supabase, user.id, planId);
    if (!row) return jsonError(404, "INTERNAL_ERROR", "Grocery list not found.");

    const items = (row.items_json as EnhancedGroceryItem[]) ?? [];
    if (itemIndex >= items.length) {
      return jsonError(400, "INTERNAL_ERROR", "itemIndex out of range.");
    }
    items.splice(itemIndex, 1);

    const { error } = await supabase
      .from("grocery_lists")
      .update({ items_json: items, updated_at: new Date().toISOString() })
      .eq("list_id", row.list_id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("grocery_delete_error", { requestId, err });
    return jsonError(500, "INTERNAL_ERROR", "Failed to remove grocery item.");
  }
}
