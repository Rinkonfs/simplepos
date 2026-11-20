<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate(['email' => 'required|email', 'password' => 'required']);
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        return response()->json([
            'token' => $user->createToken('pos-token')->plainTextToken,
            'user' => $user,
        ]);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'phone' => 'nullable|string|max:30',
            'password' => 'required|min:6',
            'locale' => 'nullable|in:en,id,bn',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'role' => 'customer',
            'locale' => $data['locale'] ?? 'en',
        ]);

        return response()->json([
            'token' => $user->createToken('pos-token')->plainTextToken,
            'user' => $user,
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function saveAddress(Request $request)
    {
        $data = $request->validate(['saved_address' => 'required|string|max:500']);
        $request->user()->update($data);
        return response()->json($request->user());
    }

    public function customers()
    {
        return response()->json(
            User::where('role', 'customer')
                ->select('id', 'name', 'email', 'phone', 'saved_address')
                ->orderBy('name')
                ->get()
        );
    }

    public function users()
    {
        return response()->json(
            User::select('id', 'name', 'email', 'phone', 'role', 'saved_address', 'photo_url', 'locale')
                ->orderBy('name')
                ->get()
        );
    }

    public function storeUser(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:30',
            'saved_address' => 'nullable|string|max:500',
            'password' => 'required|min:6',
            'role' => 'required|in:super_admin,seller,customer',
            'photo' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('users', 'public');
            $data['photo_url'] = asset('storage/' . $path);
        }

        $data['password'] = Hash::make($data['password']);
        return response()->json(User::create($data), 201);
    }

    public function updateUser(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:30',
            'saved_address' => 'nullable|string|max:500',
            'role' => 'required|in:super_admin,seller,customer',
            'password' => 'nullable|min:6',
            'photo' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('users', 'public');
            $data['photo_url'] = asset('storage/' . $path);
        }

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);
        return response()->json($user);
    }
    public function updateProfile(Request $request)
{
    $user = $request->user();
    $data = $request->validate([
        'name' => 'required|string|max:255',
        'phone' => 'nullable|string|max:30',
        'saved_address' => 'nullable|string|max:500',
        'password' => 'nullable|min:6|confirmed',
        'photo' => 'nullable|image|max:2048',
    ]);

    if ($request->hasFile('photo')) {
        $path = $request->file('photo')->store('users', 'public');
        $data['photo_url'] = asset('storage/' . $path);
    }

    if (!empty($data['password'])) {
        $data['password'] = Hash::make($data['password']);
    } else {
        unset($data['password']);
    }

    $user->update($data);
    return response()->json($user->fresh());
}

    public function destroyUser(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot delete yourself'], 422);
        }
        $user->delete();
        return response()->json(['message' => 'User deleted']);
    }

}