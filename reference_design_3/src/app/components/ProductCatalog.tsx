import { Button } from './ui/button';
import { ShoppingCart, Search, Store, User, Settings } from 'lucide-react';
import { Badge } from './ui/badge';
import Chatbot from './Chatbot';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description?: string;
  stock?: number;
}

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onOpenCart: () => void;
  onBackToStores: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  cartItemCount: number;
  isAdmin?: boolean;
}

export default function ProductCatalog({ products, onAddToCart, onOpenCart, onBackToStores, onOpenProfile, onOpenAdmin, cartItemCount, isAdmin }: ProductCatalogProps) {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-green-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={onBackToStores}
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <Store className="w-5 h-5 mr-2" />
                Tiendas
              </Button>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white px-4 py-2 rounded-lg shadow-md">
                <h1 className="text-xl font-bold">AutoServicio MerkaYohan</h1>
              </div>
            </div>

            <nav className="hidden md:flex gap-6">
              <a href="#" className="text-gray-700 hover:text-green-600 font-medium transition-colors">Inicio</a>
              <a href="#" className="text-gray-700 hover:text-green-600 font-medium transition-colors">Carros</a>
              <a href="#" className="text-gray-700 hover:text-green-600 font-medium transition-colors">Bolsas</a>
              <a href="#" className="text-gray-700 hover:text-green-600 font-medium transition-colors">Ofertas</a>
            </nav>

            <div className="flex items-center gap-4">
              <Search className="w-6 h-6 text-gray-600 cursor-pointer" />
              {isAdmin && (
                <div
                  onClick={onOpenAdmin}
                  className="cursor-pointer hover:bg-orange-50 p-2 rounded-lg transition-colors"
                >
                  <Settings className="w-6 h-6 text-orange-600" />
                </div>
              )}
              <div
                onClick={onOpenProfile}
                className="cursor-pointer hover:bg-green-50 p-2 rounded-lg transition-colors"
              >
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div className="relative cursor-pointer" onClick={onOpenCart}>
                <ShoppingCart className="w-6 h-6 text-gray-600" />
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-orange-500 hover:bg-orange-600 text-white min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs">
                    {cartItemCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-4">Tu supermercado en línea</h2>
          <p className="text-xl opacity-90">Compra productos frescos desde casa</p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-100 overflow-hidden"
            >
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 h-40 flex items-center justify-center relative">
                <span className="text-6xl">{product.image}</span>
                {product.stock !== undefined && product.stock < 10 && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {product.stock} disponibles
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-gray-500 mb-2">{product.description}</p>
                )}
                <p className="text-2xl font-bold text-green-600 mb-4">
                  ${product.price.toLocaleString()}
                </p>
                <Button
                  onClick={() => onAddToCart(product)}
                  disabled={product.stock === 0}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {product.stock === 0 ? 'Agotado' : 'Agregar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Chatbot />
    </div>
  );
}
