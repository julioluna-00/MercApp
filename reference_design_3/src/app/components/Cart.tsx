import { Button } from './ui/button';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onBack: () => void;
  total: number;
}

export default function Cart({ items, onUpdateQuantity, onRemoveItem, onClearCart, onBack, total }: CartProps) {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 bg-white rounded-xl p-6 shadow-md border border-green-100">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver
            </Button>
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-800">Carrito</h1>
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-bold text-lg">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>
        </div>

        {/* Cart Items */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-green-100">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-500 mb-2">Tu carrito está vacío</p>
              <p className="text-gray-400">Agrega productos para continuar con tu compra.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-green-300 transition-all"
                >
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-20 h-20 rounded-lg flex items-center justify-center">
                    <span className="text-4xl">{item.image}</span>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{item.name}</h3>
                    <p className="text-green-600 font-bold text-xl">
                      ${item.price.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-300 p-1">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold text-gray-800">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-green-50 text-green-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-800">
                      ${(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-orange-50 rounded-xl shadow-lg p-6 border-2 border-green-200">
            <div className="mb-4">
              <p className="text-orange-600 font-semibold text-lg mb-2">Entrega en tienda</p>
              <p className="text-4xl font-bold text-gray-800 mb-4">
                Total: ${total.toLocaleString()}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-lg shadow-lg transition-all"
              >
                Pedir domicilio
              </Button>
              <Button
                className="w-full h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-lg shadow-lg transition-all"
              >
                Hacer pedido
              </Button>
              <Button
                onClick={onClearCart}
                variant="outline"
                className="w-full h-14 border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold text-lg rounded-lg transition-all"
              >
                Vaciar carrito
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
