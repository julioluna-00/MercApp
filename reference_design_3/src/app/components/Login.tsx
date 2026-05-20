import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface UserData {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  address: string;
  isAdmin?: boolean;
}

interface LoginProps {
  onLogin: (userData: UserData) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userData: UserData = {
      firstName: isRegister ? firstName : 'Usuario',
      lastName: isRegister ? lastName : '',
      username,
      phone: isRegister ? phone : '',
      address: isRegister ? address : '',
      isAdmin: username === 'admin',
    };
    onLogin(userData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-green-100">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white px-6 py-3 rounded-xl shadow-lg">
              <h1 className="text-2xl font-bold">MercApp</h1>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center mb-2 text-green-700">
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          <p className="text-center text-gray-600 mb-6">
            {isRegister ? 'Regístrate para empezar a comprar' : 'Ingresa a tu cuenta'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <Input
                  type="text"
                  placeholder="Nombre"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border-gray-200 focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
            )}

            {isRegister && (
              <div>
                <Input
                  type="text"
                  placeholder="Apellidos"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border-gray-200 focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
            )}

            <div>
              <Input
                type="text"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 border-gray-200 focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>

            {isRegister && (
              <div>
                <Input
                  type="tel"
                  placeholder="Número de teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border-gray-200 focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
            )}

            {isRegister && (
              <div>
                <Input
                  type="text"
                  placeholder="Dirección completa"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border-gray-200 focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
            )}

            <div>
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 border-gray-200 focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg transition-all"
            >
              {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-orange-600 font-semibold hover:text-orange-700 transition-colors"
              >
                {isRegister ? 'Inicia sesión' : 'Regístrate'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
