<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'category_id',
        'vendor_id',
        'sku',
        'name',
        'description',
        'cost_price',
        'sell_price',
        'stock_qty',
        'low_stock_alert',
        'image_url',
        'is_active',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }

    public function batches()
    {
        return $this->hasMany(ProductBatch::class);
    }

    public function movements()
    {
        return $this->hasMany(StockMovement::class);
    }
}