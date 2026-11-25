<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        $s = Setting::pluck('value', 'key');

        return response()->json([
            'currency_symbol' => $s['currency_symbol'] ?? '$',
            'currency_code' => $s['currency_code'] ?? 'USD',
            'enable_grade_class' => ($s['enable_grade_class'] ?? '0') === '1',
            'enable_student_id' => ($s['enable_student_id'] ?? '0') === '1',
            'enable_card_number' => ($s['enable_card_number'] ?? '0') === '1',
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'currency_symbol' => 'required|string|max:10',
            'currency_code' => 'required|string|max:10',
            'enable_grade_class' => 'nullable|boolean',
            'enable_student_id' => 'nullable|boolean',
            'enable_card_number' => 'nullable|boolean',
        ]);

        Setting::updateOrCreate(['key' => 'currency_symbol'], ['value' => $data['currency_symbol']]);
        Setting::updateOrCreate(['key' => 'currency_code'], ['value' => $data['currency_code']]);
        Setting::updateOrCreate(['key' => 'enable_grade_class'], ['value' => !empty($data['enable_grade_class']) ? '1' : '0']);
        Setting::updateOrCreate(['key' => 'enable_student_id'], ['value' => !empty($data['enable_student_id']) ? '1' : '0']);
        Setting::updateOrCreate(['key' => 'enable_card_number'], ['value' => !empty($data['enable_card_number']) ? '1' : '0']);

        return $this->index();
    }
}