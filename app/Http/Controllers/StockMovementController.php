<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    public function index()
    {
        return response()->json(
            StockMovement::with(['product:id,sku,name', 'user:id,name'])->latest()->get()
        );
    }

    public function update(Request $request, StockMovement $stockMovement)
    {
        $data = $request->validate([
            'type' => 'required|in:in,out,adjustment',
            'quantity' => 'required|integer|min:1',
            'reference' => 'nullable|string|max:255',
        ]);
        $stockMovement->update($data);
        return response()->json($stockMovement->load(['product:id,sku,name', 'user:id,name']));
    }

    public function destroy(StockMovement $stockMovement)
    {
        $stockMovement->delete();
        return response()->json(['message' => 'Log deleted']);
    }
}