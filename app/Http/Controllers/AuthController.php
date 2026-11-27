<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Hash, Mail};
use Illuminate\Support\Facades\Schema;
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

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email|exists:users,email']);
        $code = (string) rand(100000, 999999);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            ['token' => Hash::make($code), 'created_at' => now()]
        );
        $s = \App\Models\Setting::pluck('value', 'key');
        if (!empty($s['mail_host'])) {
            config([
                'mail.default' => 'smtp',
                'mail.mailers.smtp.host' => $s['mail_host'],
                'mail.mailers.smtp.port' => (int) ($s['mail_port'] ?? 587),
                'mail.mailers.smtp.username' => $s['mail_username'] ?? null,
                'mail.mailers.smtp.password' => $s['mail_password'] ?? null,
                'mail.mailers.smtp.encryption' => ($s['mail_encryption'] ?? 'tls') === 'none' ? null : ($s['mail_encryption'] ?? 'tls'),
                'mail.from.address' => $s['mail_from_address'] ?: 'hello@example.com',
                'mail.from.name' => $s['mail_from_name'] ?: 'StockPro POS',
            ]);
        }


        Mail::raw("Your StockPro POS password reset code is: {$code}", function ($m) use ($request) {
            $m->to($request->email)->subject('Password Reset Code');
        });

        return response()->json(['message' => 'Reset code sent to your email!']);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'code' => 'required|string',
            'password' => 'required|min:6|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')->where('email', $request->email)->first();
        if (!$record || !Hash::check($request->code, $record->token)) {
            return response()->json(['message' => 'Invalid or expired reset code'], 422);
        }

        User::where('email', $request->email)->update(['password' => Hash::make($request->password)]);
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Password reset successfully! You can now sign in.']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:30',
            'saved_address' => 'nullable|string|max:500',
            'grade_class' => 'nullable|string|max:50',
            'student_id' => 'nullable|string|max:50',
            'card_number' => 'nullable|string|max:50',
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

    public function saveAddress(Request $request)
    {
        $data = $request->validate(['saved_address' => 'required|string|max:500']);
        $request->user()->update($data);
        return response()->json($request->user());
    }

    public function customers(Request $request)
    {
        $isShop = $request->user()->role === 'shop';
        $q = trim((string) $request->get('q', ''));

        $query = User::where('role', 'customer');

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('student_id', 'like', "%{$q}%")
                    ->orWhere('card_number', 'like', "%{$q}%")
                    ->orWhere('grade_class', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%");
            });
        }

        // Shop user can search by ID/card/phone on the server, but NEVER receives them in JSON
        $columns = $isShop
            ? ['id', 'name', 'grade_class']
            : ['id', 'name', 'email', 'phone', 'saved_address', 'grade_class', 'student_id', 'card_number'];

        return response()->json($query->select($columns)->orderBy('name')->get());
    }

    public function users()
    {
        return response()->json(
            User::select('id', 'name', 'email', 'phone', 'role', 'saved_address', 'grade_class', 'student_id', 'card_number', 'photo_url', 'locale')
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
            'grade_class' => 'nullable|string|max:50',
            'student_id' => 'nullable|string|max:50',
            'card_number' => 'nullable|string|max:50',
            'password' => 'required|min:6',
            'role' => 'required|in:super_admin,seller,customer,shop',
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
            'grade_class' => 'nullable|string|max:50',
            'student_id' => 'nullable|string|max:50',
            'card_number' => 'nullable|string|max:50',
            'role' => 'required|in:super_admin,seller,customer,shop',
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

    public function destroyUser(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot delete yourself'], 422);
        }
        $user->delete();
        return response()->json(['message' => 'User deleted']);
    }
    public function bulkImportUsers(Request $request)
    {
        $request->validate(['file' => 'required|mimes:csv,txt']);
        $path = $request->file('file')->getRealPath();
        $firstLine = fgets(fopen($path, 'r'));
        $delimiter = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

        $handle = fopen($path, 'r');
        $rawHeader = fgetcsv($handle, 0, $delimiter);
        if (!$rawHeader) {
            fclose($handle);
            return response()->json(['message' => 'CSV file is empty'], 422);
        }

        $header = array_map(function ($h) {
            $h = preg_replace('/^\xEF\xBB\xBF/', '', $h);
            return str_replace(' ', '_', strtolower(trim($h)));
        }, $rawHeader);

        $count = 0;
        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            if (count($row) === 1 && trim((string) $row[0]) === '') continue;
            $row = array_pad(array_slice($row, 0, count($header)), count($header), '');
            $data = array_combine($header, $row);

            $email = trim($data['email'] ?? '');
            if ($email === '') continue;

            $role = strtolower(trim($data['role'] ?? 'customer'));
            if (!in_array($role, ['super_admin', 'seller', 'customer', 'shop'])) {
                $role = 'customer';
            }

            $existing = User::where('email', $email)->first();
            $payload = [
                'name' => trim($data['name'] ?? ($existing?->name ?? 'User')),
                'phone' => trim($data['phone'] ?? '') ?: $existing?->phone,
                'role' => $role,
                'saved_address' => trim($data['saved_address'] ?? '') ?: $existing?->saved_address,
                'grade_class' => trim($data['grade_class'] ?? '') ?: $existing?->grade_class,
                'student_id' => trim($data['student_id'] ?? '') ?: $existing?->student_id,
                'card_number' => trim($data['card_number'] ?? '') ?: $existing?->card_number,
            ];

            if (!empty(trim($data['password'] ?? ''))) {
                $payload['password'] = Hash::make(trim($data['password']));
            } elseif (!$existing) {
                $payload['password'] = Hash::make('password');
            }

            User::updateOrCreate(['email' => $email], $payload);
            $count++;
        }

        fclose($handle);
        return response()->json(['message' => "Imported/updated {$count} users successfully!"]);
    }

    public function destroyAllUsers(Request $request)
    {
        Schema::disableForeignKeyConstraints();
        User::where('id', '!=', $request->user()->id)->delete();
        Schema::enableForeignKeyConstraints();

        return response()->json(['message' => 'All other users deleted (your current Super Admin account was kept).']);
    }
}