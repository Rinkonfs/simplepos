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

    public function adminIndex()
    {
        $s = Setting::pluck('value', 'key');

        return response()->json([
            'currency_symbol' => $s['currency_symbol'] ?? '$',
            'currency_code' => $s['currency_code'] ?? 'USD',
            'enable_grade_class' => ($s['enable_grade_class'] ?? '0') === '1',
            'enable_student_id' => ($s['enable_student_id'] ?? '0') === '1',
            'enable_card_number' => ($s['enable_card_number'] ?? '0') === '1',

            // Email (SMTP)
            'mail_host' => $s['mail_host'] ?? '',
            'mail_port' => $s['mail_port'] ?? '587',
            'mail_username' => $s['mail_username'] ?? '',
            'mail_password' => $s['mail_password'] ?? '',
            'mail_encryption' => $s['mail_encryption'] ?? 'tls',
            'mail_from_address' => $s['mail_from_address'] ?? '',
            'mail_from_name' => $s['mail_from_name'] ?? 'StockPro POS',

            // SMS Gateway
            'sms_provider' => $s['sms_provider'] ?? 'custom_http',
            'sms_api_url' => $s['sms_api_url'] ?? '',
            'sms_api_key' => $s['sms_api_key'] ?? '',
            'sms_sender_id' => $s['sms_sender_id'] ?? '',
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

            'mail_host' => 'nullable|string|max:255',
            'mail_port' => 'nullable|string|max:10',
            'mail_username' => 'nullable|string|max:255',
            'mail_password' => 'nullable|string|max:255',
            'mail_encryption' => 'nullable|in:tls,ssl,none',
            'mail_from_address' => 'nullable|string|max:255',
            'mail_from_name' => 'nullable|string|max:255',

            'sms_provider' => 'nullable|string|max:50',
            'sms_api_url' => 'nullable|string|max:500',
            'sms_api_key' => 'nullable|string|max:255',
            'sms_sender_id' => 'nullable|string|max:50',
        ]);

        $booleans = ['enable_grade_class', 'enable_student_id', 'enable_card_number'];
        foreach ($booleans as $b) {
            Setting::updateOrCreate(['key' => $b], ['value' => !empty($data[$b]) ? '1' : '0']);
        }

        $strings = [
            'currency_symbol', 'currency_code',
            'mail_host', 'mail_port', 'mail_username', 'mail_password', 'mail_encryption', 'mail_from_address', 'mail_from_name',
            'sms_provider', 'sms_api_url', 'sms_api_key', 'sms_sender_id',
        ];
        foreach ($strings as $k) {
            if (array_key_exists($k, $data)) {
                Setting::updateOrCreate(['key' => $k], ['value' => $data[$k] ?? '']);
            }
        }

        return $this->adminIndex();
    }
}