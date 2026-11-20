<?php
// app/Models/ProductBatch.php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ProductBatch extends Model {
    protected $fillable = ['product_id', 'label', 'cost_price', 'sell_price', 'stock_qty'];
}

// app/Models/Setting.php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Setting extends Model {
    protected $fillable = ['key', 'value'];
}