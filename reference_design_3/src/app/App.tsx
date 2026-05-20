import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import Login from './components/Login';
import StoreSelection from './components/StoreSelection';
import ProductCatalog from './components/ProductCatalog';
import Cart from './components/Cart';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';

type Screen = 'login' | 'stores' | 'catalog' | 'cart' | 'profile' | 'admin';

interface UserData {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  address: string;
  isAdmin?: boolean;
}

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

const initialProducts: Product[] = [
  { id: '1', name: 'Arroz Diana', price: 3500, image: '🌾', description: 'Arroz de alta calidad', stock: 50 },
  { id: '2', name: 'Leche Alpina', price: 4200, image: '🥛', description: 'Leche entera 1L', stock: 30 },
  { id: '3', name: 'Huevos x30', price: 15000, image: '🥚', description: 'Cubeta de 30 huevos', stock: 20 },
  { id: '4', name: 'Aceite', price: 9000, image: '🫒', description: 'Aceite vegetal 1L', stock: 25 },
  { id: '5', name: 'Azúcar', price: 2800, image: '🧂', description: 'Azúcar refinada 1kg', stock: 40 },
  { id: '6', name: 'Café', price: 8500, image: '☕', description: 'Café molido premium', stock: 35 },
  { id: '7', name: 'Gaseosa', price: 5000, image: '🥤', description: 'Gaseosa 2L', stock: 45 },
  { id: '8', name: 'Jabón', price: 3200, image: '🧼', description: 'Jabón de tocador', stock: 60 },
  { id: '9', name: 'Pan', price: 2000, image: '🍞', description: 'Pan tajado integral', stock: 15 },
  { id: '10', name: 'Sal', price: 1500, image: '🧂', description: 'Sal de cocina 500g', stock: 55 },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addToCart = (product: any) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(productId);
    } else {
      setCartItems(cartItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const updateProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const addProduct = (newProduct: Product) => {
    setProducts([...products, newProduct]);
  };

  const deleteProduct = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    setTransactions([newTransaction, ...transactions]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50">
      {currentScreen === 'login' && (
        <Login onLogin={(user) => {
          setUserData(user);
          setCurrentScreen('stores');
        }} />
      )}

      {currentScreen === 'stores' && (
        <StoreSelection
          onSelectStore={() => setCurrentScreen('catalog')}
          onOpenProfile={() => setCurrentScreen('profile')}
        />
      )}

      {currentScreen === 'catalog' && (
        <ProductCatalog
          products={products}
          onAddToCart={addToCart}
          onOpenCart={() => setCurrentScreen('cart')}
          onBackToStores={() => setCurrentScreen('stores')}
          onOpenProfile={() => setCurrentScreen('profile')}
          onOpenAdmin={() => setCurrentScreen('admin')}
          cartItemCount={totalItems}
          isAdmin={userData?.isAdmin}
        />
      )}

      {currentScreen === 'cart' && (
        <Cart
          items={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          onBack={() => setCurrentScreen('catalog')}
          total={totalPrice}
        />
      )}

      {currentScreen === 'profile' && userData && (
        <Profile
          userData={userData}
          onBack={() => setCurrentScreen('catalog')}
        />
      )}

      {currentScreen === 'admin' && userData?.isAdmin && (
        <AdminPanel
          products={products}
          onUpdateProduct={updateProduct}
          onAddProduct={addProduct}
          onDeleteProduct={deleteProduct}
          transactions={transactions}
          onAddTransaction={addTransaction}
          onBack={() => setCurrentScreen('catalog')}
        />
      )}
    </div>
  );
}
