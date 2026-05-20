import { Button } from './ui/button';
import { Store, User } from 'lucide-react';

interface StoreSelectionProps {
  onSelectStore: () => void;
  onOpenProfile: () => void;
}

export default function StoreSelection({ onSelectStore, onOpenProfile }: StoreSelectionProps) {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto pt-12">
        <div className="flex items-center justify-between mb-12">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white px-6 py-3 rounded-xl shadow-lg">
            <h1 className="text-2xl font-bold">MercApp</h1>
          </div>
          <Button
            onClick={onOpenProfile}
            variant="outline"
            className="border-green-500 text-green-600 hover:bg-green-50 h-12 px-6"
          >
            <User className="w-5 h-5 mr-2" />
            Mi Perfil
          </Button>
        </div>

        <h1 className="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent">
          TIENDAS DISPONIBLES
        </h1>

        <div className="flex justify-center mt-16">
          <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full border border-green-100">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg">
                <Store className="w-16 h-16 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center mb-3 text-gray-800">
              AutoServicio MerkaYohan
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Compra productos básicos desde casa.
            </p>

            <Button
              onClick={onSelectStore}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg transition-all"
            >
              Entrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
