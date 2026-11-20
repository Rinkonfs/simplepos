<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(Category::with('parent:id,name')->orderBy('name')->get());
        
    }

    public function store(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|unique:categories,name','parent_id' => 'nullable|exists:categories,id']);
        return response()->json(Category::create($data), 201);
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate(['name' => 'required|string|unique:categories,name,' . $category->id]);
        $category->update($data);
        return response()->json($category);
    }

    public function destroy(Category $category)
    {
        $category->delete();
        return response()->json(['message' => 'Category deleted']);
    }
}