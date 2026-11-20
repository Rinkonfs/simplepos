<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscountCode extends Model
{
    protected $fillable = [
        'code',
        'type',
        'value',
        'max_discount_amount',
        'is_active',
        'expires_at',
        'max_uses',
        'used_count',
        'customer_id',
        'category_id',
    ];

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }
}