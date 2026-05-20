import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ArrowLeft, Plus, Edit2, Trash2, Package, DollarSign, TrendingUp, TrendingDown, Receipt } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description?: string;
  stock?: number;
}

interface Transaction {
  id: string;
  type: 'sale' | 'investment';
  amount: number;
  description: string;
  date: string;
}

interface AdminPanelProps {
  products: Product[];
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  onBack: () => void;
}

export default function AdminPanel({ products, onUpdateProduct, onAddProduct, onDeleteProduct, transactions, onAddTransaction, onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'accounting'>('products');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    image: '📦',
    description: '',
    stock: 0,
  });

  const [transactionForm, setTransactionForm] = useState({
    type: 'sale' as 'sale' | 'investment',
    amount: 0,
    description: '',
  });

  const totalSales = transactions
    .filter(t => t.type === 'sale')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalInvestments = transactions
    .filter(t => t.type === 'investment')
    .reduce((sum, t) => sum + t.amount, 0);

  const profit = totalSales - totalInvestments;

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: product.price,
      image: product.image,
      description: product.description || '',
      stock: product.stock || 0,
    });
  };

  const handleSave = () => {
    if (editingId) {
      onUpdateProduct({
        id: editingId,
        ...formData,
      });
      setEditingId(null);
    } else {
      onAddProduct({
        id: Date.now().toString(),
        ...formData,
      });
      setIsAdding(false);
    }
    setFormData({ name: '', price: 0, image: '📦', description: '', stock: 0 });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', price: 0, image: '📦', description: '', stock: 0 });
  };

  const handleAddTransaction = () => {
    if (transactionForm.amount > 0 && transactionForm.description) {
      onAddTransaction(transactionForm);
      setTransactionForm({ type: 'sale', amount: 0, description: '' });
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto pt-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver
            </Button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              Panel de Administración
            </h1>
          </div>

          {activeTab === 'products' && (
            <Button
              onClick={() => setIsAdding(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold h-12 px-6 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Agregar Producto
            </Button>
          )}
        </div>

        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => setActiveTab('products')}
            className={`flex-1 h-14 font-semibold transition-all ${
              activeTab === 'products'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Package className="w-5 h-5 mr-2" />
            Productos
          </Button>
          <Button
            onClick={() => setActiveTab('accounting')}
            className={`flex-1 h-14 font-semibold transition-all ${
              activeTab === 'accounting'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="w-5 h-5 mr-2" />
            Contabilidad
          </Button>
        </div>

        {activeTab === 'products' && (isAdding || editingId) && (
          <div className="bg-white rounded-xl shadow-xl p-6 mb-8 border-2 border-orange-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {editingId ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del producto</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Arroz Diana"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Precio</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="Ej: 3500.50"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emoji/Imagen</label>
                <Input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="🌾"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad en stock</label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del producto"
                  className="w-full min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold"
              >
                Guardar
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

{activeTab === 'products' && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-800">Productos ({products.length})</h2>
            </div>

            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:border-green-300 transition-all"
                >
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-20 h-20 rounded-lg flex items-center justify-center">
                    <span className="text-4xl">{product.image}</span>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-500 mb-1">{product.description || 'Sin descripción'}</p>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600 font-bold">${product.price.toLocaleString()}</span>
                      <span className="text-gray-600">Stock: {product.stock || 0} unidades</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(product)}
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => onDeleteProduct(product.id)}
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'accounting' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-8 h-8" />
                  <h3 className="text-lg font-semibold">Ventas Totales</h3>
                </div>
                <p className="text-4xl font-bold">${totalSales.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingDown className="w-8 h-8" />
                  <h3 className="text-lg font-semibold">Inversiones</h3>
                </div>
                <p className="text-4xl font-bold">${totalInvestments.toLocaleString()}</p>
              </div>

              <div className={`rounded-xl shadow-lg p-6 text-white ${
                profit >= 0
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                  : 'bg-gradient-to-br from-orange-500 to-orange-600'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-8 h-8" />
                  <h3 className="text-lg font-semibold">Ganancias</h3>
                </div>
                <p className="text-4xl font-bold">${profit.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Registrar Transacción</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as 'sale' | 'investment' })}
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  >
                    <option value="sale">Venta</option>
                    <option value="investment">Inversión</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transactionForm.amount || ''}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Ej: 15000.50"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <Input
                    type="text"
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                    placeholder="Concepto"
                    className="w-full"
                  />
                </div>
              </div>

              <Button
                onClick={handleAddTransaction}
                className="mt-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Transacción
              </Button>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <Receipt className="w-6 h-6 text-orange-600" />
                <h2 className="text-2xl font-bold text-gray-800">Historial de Transacciones</h2>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No hay transacciones registradas</p>
                ) : (
                  transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                        transaction.type === 'sale'
                          ? 'bg-green-50 border-green-500'
                          : 'bg-red-50 border-red-500'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          transaction.type === 'sale' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {transaction.type === 'sale' ? (
                            <TrendingUp className="w-6 h-6 text-white" />
                          ) : (
                            <TrendingDown className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{transaction.description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(transaction.date).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <p className={`text-2xl font-bold ${
                        transaction.type === 'sale' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'sale' ? '+' : '-'}${transaction.amount.toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
