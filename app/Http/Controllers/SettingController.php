<?php
namespace App\Http\Controllers;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::pluck('value', 'key');
        return response()->json([
            'currency_symbol' => $settings['currency_symbol'] ?? '$',
            'currency_code' => $settings['currency_code'] ?? 'USD',
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'currency_symbol' => 'required|string|max:10',
            'currency_code' => 'required|string|max:10',
        ]);
        foreach ($data as $k => $v) {
            Setting::updateOrCreate(['key' => $k], ['value' => $v]);
        }
        return response()->json($data);
    }
}