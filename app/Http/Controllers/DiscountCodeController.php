<?php

namespace App\Http\Controllers;

use App\Models\DiscountCode;
use Illuminate\Http\Request;

class DiscountCodeController extends Controller
{
    public function index()
    {
        return response()->json(
            DiscountCode::with(['customer:id,name', 'category:id,name'])->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|unique:discount_codes,code',
            'type' => 'required|in:percentage,fixed',
            'value' => 'required|numeric|min:0.01',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'expires_at' => 'nullable|date',
            'max_uses' => 'nullable|integer|min:1',
            'customer_id' => 'nullable|exists:users,id',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $data['code'] = strtoupper(trim($data['code']));
        return response()->json(DiscountCode::create($data), 201);
    }

    public function destroy(DiscountCode $discountCode)
    {
        $discountCode->delete();
        return response()->json(['message' => 'Discount code deleted']);
    }

    public function validateCode(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'customer_id' => 'nullable|integer',
        ]);

        $dc = DiscountCode::where('code', strtoupper(trim($request->code)))
            ->where('is_active', true)
            ->first();

        if (!$dc) {
            return response()->json(['message' => 'Invalid discount code'], 404);
        }
        if ($dc->expires_at && now()->gt($dc->expires_at)) {
            return response()->json(['message' => 'Discount code expired'], 422);
        }
        if ($dc->max_uses && $dc->used_count >= $dc->max_uses) {
            return response()->json(['message' => 'Discount usage limit reached'], 422);
        }

        $targetCustomer = $request->customer_id ?: $request->user()->id;
        if ($dc->customer_id && (int) $dc->customer_id !== (int) $targetCustomer) {
            return response()->json(['message' => 'Discount code not valid for this customer'], 422);
        }

        return response()->json($dc);
    }
}