<?php

// app/Models/Order.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = ['order_number', 'user_id', 'channel', 'total_amount', 'status', 'shipping_address','delivery_type','customer_name', 'discount_code', 'discount_amount', 'adjustment_amount','payment_method','payment_status', 'payment_reference'];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
    public function user()
{
    return $this->belongsTo(User::class);
}
}